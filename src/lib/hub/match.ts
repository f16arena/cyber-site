import { prisma } from "@/lib/prisma";

export type MatchPlayerView = {
  steamId: string;
  username: string;
  avatarUrl: string | null;
  elo: number;
  eloDelta: number | null; // null до завершения матча
};

export type MatchSnapshot = {
  id: string;
  state: "PENDING" | "WARMUP" | "LIVE" | "FINISHED" | "CANCELLED";
  map: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  connectString: string;
  startedAt: string | null;
  finishedAt: string | null;
  server: {
    id: string;
    name: string;
    ip: string;
    port: number;
  };
  teamA: MatchPlayerView[];
  teamB: MatchPlayerView[];
};

export async function getMatchSnapshot(
  matchId: string
): Promise<MatchSnapshot | null> {
  const m = await prisma.hubMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      state: true,
      map: true,
      scoreA: true,
      scoreB: true,
      winner: true,
      connectString: true,
      startedAt: true,
      finishedAt: true,
      teamAPlayerIds: true,
      teamBPlayerIds: true,
      server: {
        select: { id: true, name: true, ip: true, port: true },
      },
    },
  });
  if (!m) return null;

  const steamIds = [...m.teamAPlayerIds, ...m.teamBPlayerIds];
  const users = await prisma.user.findMany({
    where: { steamId: { in: steamIds } },
    select: {
      id: true,
      steamId: true,
      username: true,
      avatarUrl: true,
      hubElo: true,
    },
  });
  const bySteam = new Map(users.map((u) => [u.steamId, u]));

  // Дельты ELO за этот матч (если он завершён)
  const eloEvents = await prisma.hubEloHistory.findMany({
    where: { matchId },
    select: { userId: true, delta: true },
  });
  const deltaByUserId = new Map(eloEvents.map((e) => [e.userId, e.delta]));

  const view = (steamId: string): MatchPlayerView => {
    const u = bySteam.get(steamId);
    return {
      steamId,
      username: u?.username ?? steamId,
      avatarUrl: u?.avatarUrl ?? null,
      elo: u?.hubElo ?? 1000,
      eloDelta: u ? deltaByUserId.get(u.id) ?? null : null,
    };
  };

  return {
    id: m.id,
    state: m.state as MatchSnapshot["state"],
    map: m.map,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winner: m.winner as MatchSnapshot["winner"],
    connectString: m.connectString,
    startedAt: m.startedAt?.toISOString() ?? null,
    finishedAt: m.finishedAt?.toISOString() ?? null,
    server: m.server,
    teamA: m.teamAPlayerIds.map(view),
    teamB: m.teamBPlayerIds.map(view),
  };
}
