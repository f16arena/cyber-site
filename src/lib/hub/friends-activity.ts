import { prisma } from "@/lib/prisma";

export type FriendActivity = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  hubElo: number;
  status: "QUEUE" | "LOBBY" | "MATCH";
  /** Куда вести при клике. Для LOBBY — на лобби, для MATCH — на матч. */
  link?: string;
};

/**
 * Возвращает список друзей пользователя, которые сейчас активны в hub
 * (в очереди / в лобби / в матче).
 */
export async function getFriendsActivity(
  userId: string,
  locale: string
): Promise<FriendActivity[]> {
  // Список подтверждённых друзей
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ fromId: userId }, { toId: userId }],
    },
    select: { fromId: true, toId: true },
  });

  const friendIds = new Set<string>();
  for (const f of friendships) {
    friendIds.add(f.fromId === userId ? f.toId : f.fromId);
  }
  if (friendIds.size === 0) return [];

  const friendIdsArr = Array.from(friendIds);

  // Кто в очереди
  const inQueue = await prisma.hubQueueTicket.findMany({
    where: {
      userId: { in: friendIdsArr },
      status: { in: ["SEARCHING", "READY_CHECK"] },
    },
    select: { userId: true },
  });
  const inQueueIds = new Set(inQueue.map((q) => q.userId));

  // Кто в активном лобби или матче
  const inLobby = await prisma.hubLobbyPlayer.findMany({
    where: {
      userId: { in: friendIdsArr },
      lobby: {
        state: {
          in: [
            "CAPTAIN_SELECT",
            "PICKING",
            "VETO",
            "SERVER_ALLOCATION",
            "LIVE",
          ],
        },
      },
    },
    select: {
      userId: true,
      lobby: {
        select: { id: true, state: true, matchId: true },
      },
    },
  });
  const lobbyByUserId = new Map(inLobby.map((l) => [l.userId, l.lobby]));

  const users = await prisma.user.findMany({
    where: { id: { in: friendIdsArr } },
    select: { id: true, username: true, avatarUrl: true, hubElo: true },
  });

  const result: FriendActivity[] = [];
  for (const u of users) {
    const lobby = lobbyByUserId.get(u.id);
    if (lobby) {
      if (lobby.state === "LIVE" && lobby.matchId) {
        result.push({
          userId: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl,
          hubElo: u.hubElo,
          status: "MATCH",
          link: `/${locale}/hub/match/${lobby.matchId}`,
        });
      } else {
        result.push({
          userId: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl,
          hubElo: u.hubElo,
          status: "LOBBY",
          link: `/${locale}/hub/lobby/${lobby.id}`,
        });
      }
    } else if (inQueueIds.has(u.id)) {
      result.push({
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        hubElo: u.hubElo,
        status: "QUEUE",
      });
    }
  }

  // Сортируем: MATCH > LOBBY > QUEUE
  const order = { MATCH: 0, LOBBY: 1, QUEUE: 2 } as const;
  result.sort((a, b) => order[a.status] - order[b.status]);

  return result;
}
