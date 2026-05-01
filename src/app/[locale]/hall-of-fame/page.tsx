export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import type { Game } from "@prisma/client";

export const metadata: Metadata = {
  title: "Hall of Fame — Esports.kz",
  description:
    "Зал славы Esports.kz — лучшие игроки Казахстана с MVP-наградами. CS2, Dota 2, PUBG.",
};

const GAME_FILTERS: Array<{ value: Game | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
];

function formatRelativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameParam } = await searchParams;
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(gameParam?.toUpperCase() ?? "")
    ? (gameParam!.toUpperCase() as Game)
    : null;

  // Все MVP-награды
  const awards = await prisma.mvpAward.findMany({
    include: {
      user: {
        select: { username: true, avatarUrl: true, region: true },
      },
      tournament: { select: { name: true, slug: true, game: true } },
      match: { select: { id: true, scoreA: true, scoreB: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Если выбран фильтр игры — отсекаем по tournament.game
  const filtered = validGame
    ? awards.filter((a) => a.tournament?.game === validGame)
    : awards;

  // Топ-юзеров по числу MVP
  const userMvpCount = new Map<string, { count: number; username: string; avatarUrl: string | null }>();
  for (const a of awards) {
    const key = a.userId;
    const cur = userMvpCount.get(key);
    if (cur) cur.count++;
    else
      userMvpCount.set(key, {
        count: 1,
        username: a.user.username,
        avatarUrl: a.user.avatarUrl,
      });
  }
  const topMvps = Array.from(userMvpCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-2">
          // Hall of Fame
        </p>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter">
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent text-glow">
            Зал славы
          </span>
        </h1>
        <p className="text-zinc-400 mt-3 max-w-2xl">
          Лучшие казахстанские игроки, получившие MVP-награды на матчах и
          турнирах Esports.kz.
        </p>

        {topMvps.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-4">
              🏆 Топ MVP — {topMvps[0].count > 1 ? "по числу наград" : "награждённые"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {topMvps.map((u, i) => (
                <Link
                  key={u.username}
                  href={`/players/${encodeURIComponent(u.username)}`}
                  className={`relative rounded-lg border p-4 text-center transition-all hover:-translate-y-0.5 ${
                    i === 0
                      ? "border-amber-400/50 bg-gradient-to-b from-amber-500/15 to-transparent"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-amber-500/30"
                  }`}
                >
                  {i < 3 && (
                    <span
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                        i === 0
                          ? "bg-amber-400 text-amber-950"
                          : i === 1
                            ? "bg-zinc-300 text-zinc-900"
                            : "bg-amber-700 text-amber-50"
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatarUrl}
                      alt={u.username}
                      className="w-16 h-16 rounded-full mx-auto border-2 border-amber-400/40"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-sm font-bold mt-2 truncate">
                    {u.username}
                  </div>
                  <div className="text-xs font-mono text-amber-300 mt-1">
                    ⭐ {u.count}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">
              Хронология наград
            </h2>
            <div className="flex gap-2 flex-wrap">
              {GAME_FILTERS.map((f) => {
                const active =
                  (f.value === "ALL" && !validGame) ||
                  (validGame && f.value === validGame);
                const href =
                  f.value === "ALL"
                    ? "/hall-of-fame"
                    : `/hall-of-fame?game=${f.value.toLowerCase()}`;
                return (
                  <Link
                    key={f.value}
                    href={href}
                    className={`px-3 h-8 inline-flex items-center text-xs font-mono rounded border transition-all ${
                      active
                        ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              {validGame
                ? `MVP по ${validGame} ещё не было`
                : "MVP-награждений ещё не было"}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="text-2xl shrink-0">⭐</div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {a.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.user.avatarUrl}
                        alt={a.user.username}
                        className="w-10 h-10 rounded-full border border-amber-500/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/players/${encodeURIComponent(a.user.username)}`}
                        className="font-bold hover:text-amber-200"
                      >
                        {a.user.username}
                      </Link>
                      <div className="text-xs font-mono text-zinc-500 mt-0.5">
                        {a.tournament ? (
                          <>
                            <Link
                              href={`/tournaments/${a.tournament.slug}`}
                              className="hover:text-violet-300"
                            >
                              {a.tournament.name}
                            </Link>
                            {a.tournament.game && ` · ${a.tournament.game}`}
                          </>
                        ) : (
                          "MVP матча"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {formatRelativeTime(a.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
