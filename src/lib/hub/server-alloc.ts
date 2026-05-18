import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildMatchConfig } from "@/lib/hub/matchzy-config";
import { decryptSecret } from "@/lib/hub/crypto";
import { loadMatch } from "@/lib/hub/rcon";
import { notifyMatchStarted } from "@/lib/hub/notify";
import { displayNameFor } from "@/lib/hub/maps";

export type AllocateResult =
  | { ok: true; matchId: string; connectString: string; serverId: string }
  | { ok: false; error: "lobby_not_found" | "wrong_state" | "no_map" | "no_server" | "already_allocated" };

/**
 * Захватывает свободный сервер для лобби, генерирует MatchZy-config,
 * создаёт HubMatch, переводит лобби в LIVE и (stub) отправляет конфиг через RCON.
 *
 * Атомарно через SELECT FOR UPDATE SKIP LOCKED, чтобы параллельные вызовы
 * не захватывали один и тот же сервер.
 */
export async function allocateServer(lobbyId: string): Promise<AllocateResult> {
  const allocation = await prisma.$transaction(
    async (tx) => {
      const lobby = await tx.hubLobby.findUnique({
        where: { id: lobbyId },
        select: {
          id: true,
          state: true,
          selectedMap: true,
          matchId: true,
          players: {
            select: { userId: true, team: true, isCaptain: true },
          },
        },
      });
      if (!lobby) return { ok: false as const, error: "lobby_not_found" as const };
      if (lobby.matchId) {
        return { ok: false as const, error: "already_allocated" as const };
      }
      if (lobby.state !== "SERVER_ALLOCATION") {
        return { ok: false as const, error: "wrong_state" as const };
      }
      if (!lobby.selectedMap) {
        return { ok: false as const, error: "no_map" as const };
      }

      // Атомарный захват одного свободного сервера
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT id FROM "HubServer"
          WHERE status = 'FREE'
          ORDER BY "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      );
      if (locked.length === 0) {
        // Серверов нет — отменяем лобби, без cooldown игрокам
        await tx.hubLobby.update({
          where: { id: lobbyId },
          data: { state: "CANCELLED" },
        });
        await tx.hubAuditEvent.create({
          data: {
            kind: "NO_SERVER_AVAILABLE",
            payload: { lobbyId },
          },
        });
        return { ok: false as const, error: "no_server" as const };
      }

      const serverId = locked[0].id;
      const server = await tx.hubServer.findUnique({
        where: { id: serverId },
        select: {
          id: true,
          ip: true,
          port: true,
          name: true,
          rconPassword: true,
        },
      });
      if (!server) return { ok: false as const, error: "no_server" as const };

      // Загрузить игроков (steamId, username) — для config
      const users = await tx.user.findMany({
        where: { id: { in: lobby.players.map((p) => p.userId) } },
        select: { id: true, steamId: true, username: true },
      });
      const userById = new Map(users.map((u) => [u.id, u]));

      const teamAPlayers = lobby.players
        .filter((p) => p.team === "A")
        .map((p) => userById.get(p.userId))
        .filter((u): u is (typeof users)[number] => !!u);
      const teamBPlayers = lobby.players
        .filter((p) => p.team === "B")
        .map((p) => userById.get(p.userId))
        .filter((u): u is (typeof users)[number] => !!u);

      if (teamAPlayers.length !== 5 || teamBPlayers.length !== 5) {
        return { ok: false as const, error: "wrong_state" as const };
      }

      const connectString = `connect ${server.ip}:${server.port}`;

      // Создаём HubMatch и привязываем lobby
      const matchConfig = buildMatchConfig({
        matchId: lobbyId, // временный matchId — заменим на match.id ниже
        teamA: teamAPlayers,
        teamB: teamBPlayers,
        mapId: lobby.selectedMap,
      });

      const match = await tx.hubMatch.create({
        data: {
          state: "WARMUP",
          map: lobby.selectedMap,
          serverId: server.id,
          teamAPlayerIds: teamAPlayers.map((p) => p.steamId),
          teamBPlayerIds: teamBPlayers.map((p) => p.steamId),
          matchConfig: matchConfig as unknown as Prisma.InputJsonValue,
          connectString,
        },
        select: { id: true },
      });

      // Перезаписываем matchid в конфиге на реальный id
      const finalConfig = buildMatchConfig({
        matchId: match.id,
        teamA: teamAPlayers,
        teamB: teamBPlayers,
        mapId: lobby.selectedMap,
      });
      await tx.hubMatch.update({
        where: { id: match.id },
        data: { matchConfig: finalConfig as unknown as Prisma.InputJsonValue },
      });

      // Резервируем сервер и обновляем лобби
      await tx.hubServer.update({
        where: { id: server.id },
        data: { status: "RESERVED", reservedForLobbyId: lobbyId },
      });

      await tx.hubLobby.update({
        where: { id: lobbyId },
        data: { state: "LIVE", matchId: match.id, serverId: server.id },
      });

      await tx.hubAuditEvent.create({
        data: {
          kind: "SERVER_ALLOCATED",
          payload: {
            lobbyId,
            matchId: match.id,
            serverId: server.id,
            connectString,
            map: lobby.selectedMap,
          },
        },
      });

      return {
        ok: true as const,
        matchId: match.id,
        connectString,
        serverId: server.id,
        encryptedRcon: server.rconPassword,
        config: finalConfig,
        serverIp: server.ip,
        serverPort: server.port,
        serverName: server.name,
        map: lobby.selectedMap,
        teamANames: teamAPlayers.map((p) => p.username),
        teamBNames: teamBPlayers.map((p) => p.username),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (!allocation.ok) return allocation;

  // Стаб RCON — вне транзакции (не должна блокировать БД на сетевой операции).
  // Ошибка отправки конфига не должна откатывать allocation — матч уже создан,
  // админ при необходимости вручную перепошлёт.
  await loadMatch({
    matchId: allocation.matchId,
    server: {
      id: allocation.serverId,
      name: allocation.serverName,
      ip: allocation.serverIp,
      port: allocation.serverPort,
      rconPassword: decryptSecret(allocation.encryptedRcon),
    },
    config: allocation.config,
  }).catch((e) => {
    console.error("[hub:rcon] loadMatch failed:", e);
  });

  // Discord / Telegram нотификации (no-op если env пустой).
  await notifyMatchStarted({
    matchId: allocation.matchId,
    map: displayNameFor(allocation.map),
    connectString: allocation.connectString,
    teamA: allocation.teamANames,
    teamB: allocation.teamBNames,
  }).catch((e) => console.error("[hub:notify] start failed:", e));

  return {
    ok: true,
    matchId: allocation.matchId,
    connectString: allocation.connectString,
    serverId: allocation.serverId,
  };
}
