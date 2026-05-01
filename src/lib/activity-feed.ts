import { prisma } from "./prisma";

export type ActivityItem = {
  id: string;
  type:
    | "MATCH_RESULT"
    | "MVP"
    | "TEAM_CREATED"
    | "TOURNAMENT_OPEN"
    | "PLAYER_JOINED";
  at: Date;
  text: string;
  link?: string;
  iconColor: string; // tailwind classes
};

/**
 * Возвращает последние N событий с разных моделей.
 * Используется на главной и /stats для социального доказательства.
 */
export async function getRecentActivity(limit = 12): Promise<ActivityItem[]> {
  const [matches, mvps, teams, tournaments, users] = await Promise.all([
    prisma.match.findMany({
      where: { status: "FINISHED", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 6,
      include: {
        teamA: { select: { name: true, tag: true } },
        teamB: { select: { name: true, tag: true } },
        winner: { select: { name: true, tag: true } },
      },
    }),
    prisma.mvpAward.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { username: true } },
        tournament: { select: { name: true, slug: true } },
      },
    }),
    prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, tag: true, game: true, createdAt: true },
    }),
    prisma.tournament.findMany({
      where: { status: "REGISTRATION_OPEN" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        game: true,
        prize: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, username: true, createdAt: true },
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const m of matches) {
    if (!m.teamA || !m.teamB || !m.winner || !m.finishedAt) continue;
    const loser = m.winner.tag === m.teamA.tag ? m.teamB : m.teamA;
    items.push({
      id: `match-${m.id}`,
      type: "MATCH_RESULT",
      at: m.finishedAt,
      text: `${m.winner.name} обыграл ${loser.name} ${Math.max(m.scoreA, m.scoreB)}:${Math.min(m.scoreA, m.scoreB)}`,
      link: `/matches/${m.id}`,
      iconColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    });
  }

  for (const a of mvps) {
    items.push({
      id: `mvp-${a.id}`,
      type: "MVP",
      at: a.createdAt,
      text: `${a.user.username} получил MVP${a.tournament ? ` · ${a.tournament.name}` : ""}`,
      link: `/players/${encodeURIComponent(a.user.username)}`,
      iconColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    });
  }

  for (const t of teams) {
    items.push({
      id: `team-${t.id}`,
      type: "TEAM_CREATED",
      at: t.createdAt,
      text: `Создана команда [${t.tag}] ${t.name} · ${t.game}`,
      link: `/teams/${t.tag}`,
      iconColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    });
  }

  for (const tn of tournaments) {
    const prizeKzt = Number(tn.prize) / 100;
    items.push({
      id: `tour-${tn.id}`,
      type: "TOURNAMENT_OPEN",
      at: tn.createdAt,
      text: `Открыт турнир ${tn.name} · ₸${prizeKzt.toLocaleString("ru-RU")}`,
      link: `/tournaments/${tn.slug}`,
      iconColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    });
  }

  for (const u of users) {
    items.push({
      id: `user-${u.id}`,
      type: "PLAYER_JOINED",
      at: u.createdAt,
      text: `${u.username} присоединился к платформе`,
      link: `/players/${encodeURIComponent(u.username)}`,
      iconColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

const ICON: Record<ActivityItem["type"], string> = {
  MATCH_RESULT: "🏆",
  MVP: "⭐",
  TEAM_CREATED: "🛡",
  TOURNAMENT_OPEN: "🎯",
  PLAYER_JOINED: "👤",
};

export function activityIcon(type: ActivityItem["type"]) {
  return ICON[type];
}
