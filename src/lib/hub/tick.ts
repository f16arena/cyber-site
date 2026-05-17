import { prisma } from "@/lib/prisma";
import { expireReadyCheck, tryFinalize } from "@/lib/hub/ready-check";
import { pickPlayer } from "@/lib/hub/lobby";

/**
 * Единый "тик" обслуживания hub. Вызывается из SSE-стримов на каждом цикле,
 * а также из /api/hub/tick (cron или ручной вызов).
 *
 * Действия:
 *  1. Для активных ready-check авто-accept за ботов (steamId LIKE 'bot_%') — для dev.
 *  2. После авто-accept пытаемся финализировать ready-check.
 *  3. Просроченные ready-check (PENDING, expiresAt < now) проваливаем.
 *
 * Идемпотентно — безопасно вызывать многократно.
 */
export async function runTick(): Promise<void> {
  // 1+2. Боты — у HubReadyResponse нет relation к User, тащим userId и тянем юзеров отдельно
  const pendingChecks = await prisma.hubReadyCheck.findMany({
    where: { state: "PENDING" },
    select: {
      id: true,
      responses: {
        where: { accepted: null },
        select: { id: true, userId: true },
      },
    },
  });

  const allPendingUserIds = pendingChecks.flatMap((rc) =>
    rc.responses.map((r) => r.userId)
  );
  const users = allPendingUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allPendingUserIds } },
        select: { id: true, steamId: true },
      })
    : [];
  const steamIdByUserId = new Map(users.map((u) => [u.id, u.steamId]));

  for (const rc of pendingChecks) {
    const botResponseIds = rc.responses
      .filter((r) => (steamIdByUserId.get(r.userId) ?? "").startsWith("bot_"))
      .map((r) => r.id);
    if (botResponseIds.length > 0) {
      await prisma.hubReadyResponse.updateMany({
        where: { id: { in: botResponseIds } },
        data: { accepted: true, respondedAt: new Date() },
      });
    }
    await tryFinalize(rc.id).catch(() => undefined);
  }

  // 3. Истёкшие ready-check
  const expired = await prisma.hubReadyCheck.findMany({
    where: { state: "PENDING", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const rc of expired) {
    await expireReadyCheck(rc.id, "TIMEOUT").catch(() => undefined);
  }

  // 4. Bot auto-pick: если pickTurn-капитан — бот, выбирает первого доступного игрока.
  //    Делается по одному пику за тик, чтобы UI плавно проигрывал последовательность.
  const pickingLobbies = await prisma.hubLobby.findMany({
    where: { state: { in: ["PICKING", "CAPTAIN_SELECT"] } },
    select: {
      id: true,
      pickTurn: true,
      captainAId: true,
      captainBId: true,
    },
  });

  if (pickingLobbies.length > 0) {
    const captainIds = pickingLobbies.flatMap((l) => [
      l.captainAId,
      l.captainBId,
    ]);
    const captains = await prisma.user.findMany({
      where: { id: { in: captainIds } },
      select: { id: true, steamId: true },
    });
    const captainSteamById = new Map(captains.map((c) => [c.id, c.steamId]));

    for (const lobby of pickingLobbies) {
      const currentCaptainId =
        lobby.pickTurn === "A" ? lobby.captainAId : lobby.captainBId;
      const steamId = captainSteamById.get(currentCaptainId) ?? "";
      if (!steamId.startsWith("bot_")) continue;

      const available = await prisma.hubLobbyPlayer.findFirst({
        where: { lobbyId: lobby.id, team: null, isCaptain: false },
        select: { userId: true },
      });
      if (!available) continue;

      await pickPlayer(lobby.id, currentCaptainId, available.userId).catch(
        () => undefined
      );
    }
  }
}
