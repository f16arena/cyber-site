export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import type { Game } from "@prisma/client";

const GAME_FILTERS = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
] as const;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const gameFilter = params.game?.toUpperCase();
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(gameFilter ?? "")
    ? (gameFilter as Game)
    : null;

  // Топ-игроки по среднему рейтингу
  const topPlayersByRating = await prisma.matchPlayerStat.groupBy({
    by: ["userId"],
    where: validGame ? { game: validGame } : undefined,
    _avg: { rating: true },
    _sum: { kills: true, deaths: true, assists: true },
    _count: { _all: true },
    orderBy: { _avg: { rating: "desc" } },
    take: 20,
  });

  const playerIds = topPlayersByRating.map((p) => p.userId);
  const players = playerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          profiles: validGame
            ? { where: { game: validGame } }
            : true,
        },
      })
    : [];
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Top teams по rating
  const topTeams = await prisma.team.findMany({
    where: validGame ? { game: validGame } : undefined,
    orderBy: { rating: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      tag: true,
      rating: true,
      game: true,
      _count: { select: { wonMatches: true } },
    },
  });

  // MVP-голд (кол-во наград MVP)
  const mvpCounts = await prisma.mvpAward.groupBy({
    by: ["userId"],
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: 10,
  });
  const mvpUserIds = mvpCounts.map((m) => m.userId);
  const mvpUsers = mvpUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: mvpUserIds } },
        select: { id: true, username: true, avatarUrl: true },
      })
    : [];
  const mvpUserMap = new Map(mvpUsers.map((u) => [u.id, u]));

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Hall of Fame
          </p>
          <h1 className="text-4xl font-black tracking-tight">Лидерборды</h1>
          <p className="text-zinc-400 mt-2">
            Топ-игроки и команды по результатам сыгранных матчей.
          </p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {GAME_FILTERS.map((f) => {
            const active =
              (f.value === "ALL" && !validGame) ||
              (validGame && f.value === validGame);
            const href = f.value === "ALL" ? "/leaderboard" : `/leaderboard?game=${f.value.toLowerCase()}`;
            return (
              <Link
                key={f.value}
                href={href}
                className={`px-4 h-9 inline-flex items-center text-sm font-mono rounded border transition-all ${
                  active
                    ? "bg-violet-500/15 text-violet-200 border-violet-500/50"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Players */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              ⚡ Top Players
            </h2>
            {topPlayersByRating.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Пока нет сыгранных матчей.
              </p>
            ) : (
              <ol className="space-y-2">
                {topPlayersByRating.map((stat, i) => {
                  const u = playerMap.get(stat.userId);
                  if (!u) return null;
                  const profile = "profiles" in u && Array.isArray(u.profiles)
                    ? u.profiles[0]
                    : null;
                  return (
                    <li key={stat.userId}>
                      <Link
                        href={`/players/${encodeURIComponent(u.username)}`}
                        className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded transition-colors"
                      >
                        <span
                          className={`font-mono font-black text-sm w-6 ${i === 0 ? "text-amber-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-500"}`}
                        >
                          {i + 1}
                        </span>
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt={u.username}
                            className="w-7 h-7 rounded border border-zinc-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-violet-500/20" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">
                            {u.username}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            {profile?.inGameRole ?? "—"} · {stat._count._all} матчей
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-violet-300">
                          {(stat._avg.rating ?? 0).toFixed(2)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Top Teams */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-4">
              🏆 Top Teams
            </h2>
            {topTeams.length === 0 ? (
              <p className="text-sm text-zinc-500">Команд ещё нет.</p>
            ) : (
              <ol className="space-y-2">
                {topTeams.map((t, i) => (
                  <li key={t.id}>
                    <Link
                      href={`/teams/${t.tag}`}
                      className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded transition-colors"
                    >
                      <span
                        className={`font-mono font-black text-sm w-6 ${i === 0 ? "text-amber-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-500"}`}
                      >
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xs font-bold">
                        {t.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">
                          {t.name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {t.game} · {t._count.wonMatches} побед
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {t.rating}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* MVP Leaders */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-fuchsia-400 mb-4">
              ⭐ MVP Leaders
            </h2>
            {mvpCounts.length === 0 ? (
              <p className="text-sm text-zinc-500">Пока нет MVP-наград.</p>
            ) : (
              <ol className="space-y-2">
                {mvpCounts.map((m, i) => {
                  const u = mvpUserMap.get(m.userId);
                  if (!u) return null;
                  return (
                    <li key={m.userId}>
                      <Link
                        href={`/players/${encodeURIComponent(u.username)}`}
                        className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded transition-colors"
                      >
                        <span
                          className={`font-mono font-black text-sm w-6 ${i === 0 ? "text-amber-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-500"}`}
                        >
                          {i + 1}
                        </span>
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt={u.username}
                            className="w-7 h-7 rounded border border-zinc-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-fuchsia-500/20" />
                        )}
                        <div className="flex-1 min-w-0 text-sm font-bold truncate">
                          {u.username}
                        </div>
                        <span className="text-xs font-mono font-bold text-fuchsia-300">
                          {m._count._all} ⭐
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
