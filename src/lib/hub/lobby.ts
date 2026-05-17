import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { HUB_MAP_POOL } from "@/lib/hub/maps";

/** Сколько живёт лобби максимум (защита от зависших). */
export const LOBBY_TTL_MS = 15 * 60 * 1000;
/** Сколько пиков делают капитаны (10 игроков − 2 капитана). */
export const PICK_COUNT = 8;

export type LobbySnapshot = {
  id: string;
  state:
    | "CAPTAIN_SELECT"
    | "PICKING"
    | "VETO"
    | "SERVER_ALLOCATION"
    | "LIVE"
    | "CANCELLED"
    | "FINISHED";
  pickTurn: "A" | "B";
  matchId: string | null;
  captainA: PlayerView;
  captainB: PlayerView;
  teamA: PlayerView[];
  teamB: PlayerView[];
  available: PlayerView[];
  nextPickOrder: number; // 1..8, или > 8 когда уже не PICKING
  // VETO phase data
  vetoTurn: "A" | "B";
  bannedMaps: { map: string; team: "A" | "B"; order: number }[];
  remainingMaps: string[];
  selectedMap: string | null;
};

export type PlayerView = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  steamId: string;
  elo: number;
  isCaptain: boolean;
  pickOrder: number | null;
};

/**
 * Создаёт лобби из уже подтверждённого ready-check:
 *  - сортирует участников по (hubElo desc, isBot asc, username asc) — живой пользователь
 *    приоритетнее бота при равенстве ELO;
 *  - top-2 → капитаны (team A и B);
 *  - остальные 8 — без команды, ждут пика.
 *
 * Идемпотентно: если лобби уже существует — возвращает его id.
 */
export async function createLobbyFromReadyCheck(
  readyCheckId: string
): Promise<string | null> {
  return prisma.$transaction(
    async (tx) => {
      const rc = await tx.hubReadyCheck.findUnique({
        where: { id: readyCheckId },
        select: { id: true, state: true, lobby: { select: { id: true } } },
      });
      if (!rc) return null;
      if (rc.lobby) return rc.lobby.id; // уже создано
      if (rc.state !== "ACCEPTED") return null;

      // Все участники
      const responses = await tx.hubReadyResponse.findMany({
        where: { readyCheckId, accepted: true },
        select: { userId: true },
      });
      if (responses.length !== 10) return null;

      const users = await tx.user.findMany({
        where: { id: { in: responses.map((r) => r.userId) } },
        select: { id: true, steamId: true, username: true, hubElo: true },
      });
      if (users.length !== 10) return null;

      const sorted = [...users].sort((a, b) => {
        if (b.hubElo !== a.hubElo) return b.hubElo - a.hubElo;
        const aBot = a.steamId.startsWith("bot_") ? 1 : 0;
        const bBot = b.steamId.startsWith("bot_") ? 1 : 0;
        if (aBot !== bBot) return aBot - bBot;
        return a.username.localeCompare(b.username);
      });

      const captainA = sorted[0];
      const captainB = sorted[1];
      const rest = sorted.slice(2);

      const lobby = await tx.hubLobby.create({
        data: {
          readyCheckId,
          state: "PICKING",
          captainAId: captainA.id,
          captainBId: captainB.id,
          pickTurn: "A",
          expiresAt: new Date(Date.now() + LOBBY_TTL_MS),
          players: {
            create: [
              { userId: captainA.id, team: "A", isCaptain: true },
              { userId: captainB.id, team: "B", isCaptain: true },
              ...rest.map((u) => ({
                userId: u.id,
                team: null,
                isCaptain: false,
              })),
            ],
          },
        },
        select: { id: true },
      });

      // Тикеты в очереди удаляем — они больше не нужны, лобби создано
      await tx.hubQueueTicket.deleteMany({ where: { readyCheckId } });

      await tx.hubAuditEvent.createMany({
        data: sorted.map((u) => ({
          userId: u.id,
          kind: "LOBBY_CREATED",
          payload: {
            lobbyId: lobby.id,
            role:
              u.id === captainA.id
                ? "CAPTAIN_A"
                : u.id === captainB.id
                ? "CAPTAIN_B"
                : "PLAYER",
          },
        })),
      });

      return lobby.id;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export type PickResult =
  | { ok: true; allPicked: boolean; nextTurn: "A" | "B" | null }
  | {
      ok: false;
      error:
        | "lobby_not_found"
        | "wrong_state"
        | "not_captain"
        | "not_your_turn"
        | "target_not_in_lobby"
        | "target_already_picked"
        | "target_is_captain";
    };

/**
 * Капитан выбирает игрока. После каждого пика переключается pickTurn (A↔B).
 * После 8-го пика state → VETO.
 *
 * Транзакция Serializable: защита от двойного пика при гонках.
 */
export async function pickPlayer(
  lobbyId: string,
  captainUserId: string,
  pickedUserId: string
): Promise<PickResult> {
  return prisma.$transaction(
    async (tx) => {
      const lobby = await tx.hubLobby.findUnique({
        where: { id: lobbyId },
        select: {
          id: true,
          state: true,
          pickTurn: true,
          captainAId: true,
          captainBId: true,
        },
      });
      if (!lobby) return { ok: false as const, error: "lobby_not_found" as const };

      if (lobby.state !== "PICKING" && lobby.state !== "CAPTAIN_SELECT") {
        return { ok: false as const, error: "wrong_state" as const };
      }

      const captainTeam: "A" | "B" =
        captainUserId === lobby.captainAId
          ? "A"
          : captainUserId === lobby.captainBId
          ? "B"
          : null!;
      if (captainTeam !== "A" && captainTeam !== "B") {
        return { ok: false as const, error: "not_captain" as const };
      }
      if (captainTeam !== lobby.pickTurn) {
        return { ok: false as const, error: "not_your_turn" as const };
      }

      const target = await tx.hubLobbyPlayer.findUnique({
        where: { lobbyId_userId: { lobbyId, userId: pickedUserId } },
        select: { id: true, team: true, isCaptain: true },
      });
      if (!target) {
        return { ok: false as const, error: "target_not_in_lobby" as const };
      }
      if (target.isCaptain) {
        return { ok: false as const, error: "target_is_captain" as const };
      }
      if (target.team !== null) {
        return { ok: false as const, error: "target_already_picked" as const };
      }

      // Следующий pickOrder — максимум + 1
      const maxOrder = await tx.hubLobbyPlayer.aggregate({
        where: { lobbyId, isCaptain: false, NOT: { pickOrder: null } },
        _max: { pickOrder: true },
      });
      const nextOrder = (maxOrder._max.pickOrder ?? 0) + 1;

      await tx.hubLobbyPlayer.update({
        where: { id: target.id },
        data: { team: captainTeam, pickOrder: nextOrder },
      });

      const isLastPick = nextOrder >= PICK_COUNT;
      const newPickTurn: "A" | "B" = captainTeam === "A" ? "B" : "A";

      await tx.hubLobby.update({
        where: { id: lobbyId },
        data: {
          pickTurn: newPickTurn,
          state: isLastPick ? "VETO" : "PICKING",
        },
      });

      await tx.hubAuditEvent.create({
        data: {
          userId: captainUserId,
          kind: "LOBBY_PICK",
          payload: {
            lobbyId,
            pickedUserId,
            team: captainTeam,
            pickOrder: nextOrder,
          },
        },
      });

      return {
        ok: true as const,
        allPicked: isLastPick,
        nextTurn: isLastPick ? null : newPickTurn,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** Снимок лобби. Серверный side — подгружаем users для display. */
export async function getLobbySnapshot(
  lobbyId: string
): Promise<LobbySnapshot | null> {
  const lobby = await prisma.hubLobby.findUnique({
    where: { id: lobbyId },
    select: {
      id: true,
      state: true,
      pickTurn: true,
      vetoTurn: true,
      selectedMap: true,
      captainAId: true,
      captainBId: true,
      matchId: true,
      players: {
        select: {
          userId: true,
          team: true,
          isCaptain: true,
          pickOrder: true,
        },
      },
      vetoActions: {
        select: { map: true, team: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!lobby) return null;

  const users = await prisma.user.findMany({
    where: { id: { in: lobby.players.map((p) => p.userId) } },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      steamId: true,
      hubElo: true,
    },
  });
  const usersById = new Map(users.map((u) => [u.id, u]));

  const toView = (p: (typeof lobby.players)[number]): PlayerView | null => {
    const u = usersById.get(p.userId);
    if (!u) return null;
    return {
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      steamId: u.steamId,
      elo: u.hubElo,
      isCaptain: p.isCaptain,
      pickOrder: p.pickOrder,
    };
  };

  const captainA = toView(
    lobby.players.find((p) => p.userId === lobby.captainAId)!
  )!;
  const captainB = toView(
    lobby.players.find((p) => p.userId === lobby.captainBId)!
  )!;

  // Команды сортируем по pickOrder (капитан первый, затем по порядку пиков)
  const teamPlayers = (team: "A" | "B"): PlayerView[] => {
    const list = lobby.players
      .filter((p) => p.team === team && !p.isCaptain)
      .map(toView)
      .filter((v): v is PlayerView => v !== null);
    list.sort((a, b) => (a.pickOrder ?? 999) - (b.pickOrder ?? 999));
    return list;
  };

  const available = lobby.players
    .filter((p) => p.team === null && !p.isCaptain)
    .map(toView)
    .filter((v): v is PlayerView => v !== null);
  // Сортируем по ELO desc, чтобы лучшие наверху
  available.sort((a, b) => b.elo - a.elo);

  const maxPickOrder = lobby.players.reduce(
    (max, p) => Math.max(max, p.pickOrder ?? 0),
    0
  );

  // Veto state
  const bannedMaps = lobby.vetoActions.map((a) => ({
    map: a.map,
    team: a.team as "A" | "B",
    order: a.order,
  }));
  const bannedSet = new Set(bannedMaps.map((b) => b.map));
  const remainingMaps = HUB_MAP_POOL.filter((m) => !bannedSet.has(m.id)).map(
    (m) => m.id
  );

  return {
    id: lobby.id,
    state: lobby.state as LobbySnapshot["state"],
    pickTurn: lobby.pickTurn as "A" | "B",
    matchId: lobby.matchId,
    captainA,
    captainB,
    teamA: teamPlayers("A"),
    teamB: teamPlayers("B"),
    available,
    nextPickOrder: maxPickOrder + 1,
    vetoTurn: lobby.vetoTurn as "A" | "B",
    bannedMaps,
    remainingMaps,
    selectedMap: lobby.selectedMap,
  };
}
