import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { computeTeamElo } from "@/lib/hub/elo";

export type FinishMatchResult =
  | { ok: true; deltaA: number; deltaB: number }
  | { ok: false; error: "not_found" | "already_finished" | "invalid_score" };

/**
 * Финализирует матч: записывает счёт/победителя, обновляет ELO 10 игроков,
 * освобождает сервер, переводит лобби в FINISHED.
 *
 * Идемпотентно: повторный вызов на FINISHED-матче возвращает already_finished.
 */
export async function finishMatch(
  matchId: string,
  scoreA: number,
  scoreB: number,
  winner: "A" | "B"
): Promise<FinishMatchResult> {
  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA > 99 ||
    scoreB > 99
  ) {
    return { ok: false, error: "invalid_score" };
  }
  if (winner === "A" && scoreA <= scoreB) return { ok: false, error: "invalid_score" };
  if (winner === "B" && scoreB <= scoreA) return { ok: false, error: "invalid_score" };

  return prisma.$transaction(
    async (tx) => {
      const match = await tx.hubMatch.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          state: true,
          serverId: true,
          teamAPlayerIds: true,
          teamBPlayerIds: true,
          startedAt: true,
          createdAt: true,
          lobby: { select: { id: true } },
        },
      });
      if (!match) return { ok: false as const, error: "not_found" as const };
      if (match.state === "FINISHED" || match.state === "CANCELLED") {
        return { ok: false as const, error: "already_finished" as const };
      }

      // Загружаем игроков обеих команд
      const allSteamIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
      const users = await tx.user.findMany({
        where: { steamId: { in: allSteamIds } },
        select: { id: true, steamId: true, hubElo: true },
      });
      const userBySteam = new Map(users.map((u) => [u.steamId, u]));

      const teamA = match.teamAPlayerIds
        .map((sid) => userBySteam.get(sid))
        .filter((u): u is (typeof users)[number] => !!u);
      const teamB = match.teamBPlayerIds
        .map((sid) => userBySteam.get(sid))
        .filter((u): u is (typeof users)[number] => !!u);

      const outcome = computeTeamElo(
        teamA.map((u) => u.hubElo),
        teamB.map((u) => u.hubElo),
        winner
      );

      // Завершаем матч
      const now = new Date();
      await tx.hubMatch.update({
        where: { id: matchId },
        data: {
          state: "FINISHED",
          scoreA,
          scoreB,
          winner,
          finishedAt: now,
          startedAt: match.startedAt ?? match.createdAt,
        },
      });

      // ELO для команды A
      for (const u of teamA) {
        const before = u.hubElo;
        const delta = outcome.deltaA;
        const after = before + delta;
        await tx.hubEloHistory.create({
          data: { userId: u.id, matchId, delta, before, after },
        });
        await tx.user.update({
          where: { id: u.id },
          data: {
            hubElo: after,
            hubMatchesPlayed: { increment: 1 },
            ...(winner === "A"
              ? { hubWins: { increment: 1 } }
              : { hubLosses: { increment: 1 } }),
          },
        });
      }

      // ELO для команды B
      for (const u of teamB) {
        const before = u.hubElo;
        const delta = outcome.deltaB;
        const after = before + delta;
        await tx.hubEloHistory.create({
          data: { userId: u.id, matchId, delta, before, after },
        });
        await tx.user.update({
          where: { id: u.id },
          data: {
            hubElo: after,
            hubMatchesPlayed: { increment: 1 },
            ...(winner === "B"
              ? { hubWins: { increment: 1 } }
              : { hubLosses: { increment: 1 } }),
          },
        });
      }

      // Освобождаем сервер
      await tx.hubServer.update({
        where: { id: match.serverId },
        data: { status: "FREE", reservedForLobbyId: null },
      });

      // Лобби → FINISHED
      if (match.lobby?.id) {
        await tx.hubLobby.update({
          where: { id: match.lobby.id },
          data: { state: "FINISHED" },
        });
      }

      await tx.hubAuditEvent.create({
        data: {
          kind: "MATCH_FINISH",
          payload: {
            matchId,
            winner,
            scoreA,
            scoreB,
            deltaA: outcome.deltaA,
            deltaB: outcome.deltaB,
          },
        },
      });

      return {
        ok: true as const,
        deltaA: outcome.deltaA,
        deltaB: outcome.deltaB,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export type CancelMatchResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "already_finished" };

/**
 * Отмена матча — без обновления ELO, освобождает сервер.
 */
export async function cancelMatch(
  matchId: string,
  reason?: string
): Promise<CancelMatchResult> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.hubMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        state: true,
        serverId: true,
        lobby: { select: { id: true } },
      },
    });
    if (!match) return { ok: false as const, error: "not_found" as const };
    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      return { ok: false as const, error: "already_finished" as const };
    }

    await tx.hubMatch.update({
      where: { id: matchId },
      data: { state: "CANCELLED", finishedAt: new Date() },
    });
    await tx.hubServer.update({
      where: { id: match.serverId },
      data: { status: "FREE", reservedForLobbyId: null },
    });
    if (match.lobby?.id) {
      await tx.hubLobby.update({
        where: { id: match.lobby.id },
        data: { state: "CANCELLED" },
      });
    }
    await tx.hubAuditEvent.create({
      data: {
        kind: "MATCH_CANCEL",
        payload: { matchId, reason: reason ?? null },
      },
    });
    return { ok: true as const };
  });
}
