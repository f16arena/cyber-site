export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Countdown } from "@/components/Countdown";
import { getRecentActivity, activityIcon } from "@/lib/activity-feed";
import type { Game } from "@prisma/client";

const games = [
  {
    code: "CS2" as const,
    name: "Counter-Strike 2",
    format: "Double Elimination · 5v5",
    accent: "from-amber-400 via-orange-500 to-red-600",
    glow: "shadow-[0_0_60px_-15px_rgba(251,146,60,0.6)]",
    border: "hover:border-orange-500/60",
  },
  {
    code: "DOTA2" as const,
    name: "Dota 2",
    format: "Single Elimination · 5v5",
    accent: "from-rose-500 via-red-600 to-red-800",
    glow: "shadow-[0_0_60px_-15px_rgba(244,63,94,0.6)]",
    border: "hover:border-rose-500/60",
  },
  {
    code: "PUBG" as const,
    name: "PUBG",
    format: "Squad Battle Royale · 4v4",
    accent: "from-yellow-300 via-amber-500 to-yellow-600",
    glow: "shadow-[0_0_60px_-15px_rgba(250,204,21,0.6)]",
    border: "hover:border-yellow-500/60",
  },
];

function GameTag({ code }: { code: Game | string }) {
  const colors: Record<string, string> = {
    CS2: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    DOTA2: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    PUBG: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  };
  return (
    <span
      className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors[code] || "bg-zinc-700"}`}
    >
      {code}
    </span>
  );
}

function formatRelativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 86400 * 2) return "вчера";
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

function formatMatchTime(date: Date | null) {
  if (!date) return "—";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Сегодня · ${time}`;
  if (isTomorrow) return `Завтра · ${time}`;
  return `${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} · ${time}`;
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);

  const [
    liveMatches,
    upcomingMatches,
    recentResults,
    newsFeed,
    topTeams,
    regionTeams,
    onlineUsers,
    streamers,
    featuredTournament,
    activityFeed,
    stats,
  ] = await Promise.all([
    prisma.match.findMany({
      where: { status: "LIVE" },
      include: {
        teamA: { select: { name: true, tag: true } },
        teamB: { select: { name: true, tag: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 3,
    }),
    prisma.match.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
      include: {
        teamA: { select: { name: true, tag: true } },
        teamB: { select: { name: true, tag: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      include: {
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 3,
    }),
    prisma.news.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    prisma.team.findMany({
      orderBy: { rating: "desc" },
      take: 5,
      select: { id: true, name: true, tag: true, rating: true, game: true },
    }),
    prisma.team.findMany({
      where: { region: { in: ["ALMATY", "ASTANA", "SHYMKENT", "KARAGANDA"] } },
      orderBy: { rating: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        tag: true,
        rating: true,
        game: true,
        region: true,
      },
    }),
    prisma.user.findMany({
      where: { lastSeenAt: { gte: fiveMinAgo } },
      orderBy: { lastSeenAt: "desc" },
      take: 8,
      select: { id: true, username: true, avatarUrl: true },
    }),
    prisma.user.findMany({
      where: { twitchUrl: { not: null } },
      orderBy: { lastSeenAt: "desc" },
      take: 5,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        twitchUrl: true,
        lastSeenAt: true,
      },
    }),
    prisma.tournament.findFirst({
      where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } },
      orderBy: { startsAt: "asc" },
    }),
    getRecentActivity(10),
    Promise.all([
      prisma.team.count(),
      prisma.user.count(),
      prisma.tournament.count(),
      prisma.tournament.aggregate({ _sum: { prize: true } }),
    ]),
  ]);

  const [teamsCount, playersCount, tournamentsCount, prizeAgg] = stats;
  const totalPrizeKzt = Number(prizeAgg._sum.prize ?? 0n) / 100;

  const statsRow = [
    { value: String(teamsCount), label: t("statsTeams") },
    { value: String(playersCount), label: t("statsPlayers") },
    { value: String(tournamentsCount), label: t("statsTournaments") },
    {
      value: totalPrizeKzt > 0 ? `₸ ${(totalPrizeKzt / 1000000).toFixed(1)}M` : "₸ 0",
      label: t("statsPrize"),
    },
  ];

  return (
    <>
      {/* TICKER */}
      {liveMatches.length > 0 && (
        <div className="bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-rose-600/30 border-b border-violet-500/20">
          <div className="mx-auto max-w-7xl px-6 py-1.5 flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-zinc-300 truncate">
              {liveMatches[0].teamA?.name} {liveMatches[0].scoreA}:
              {liveMatches[0].scoreB} {liveMatches[0].teamB?.name}
              {liveMatches[0].tournament && ` · ${liveMatches[0].tournament.name}`}
            </span>
            <span className="ml-auto text-violet-300">
              <Link href="/matches" className="hover:text-violet-200">
                Все матчи →
              </Link>
            </span>
          </div>
        </div>
      )}

      <SiteHeader />

      <main className="flex-1">
        {/* COMPACT HERO */}
        <section className="relative overflow-hidden border-b border-zinc-800/60">
          <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  {t("season")}
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-[0.95]">
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent text-glow">
                    {t("heroTitle")}
                  </span>
                  <span className="block text-zinc-300">{t("heroSubtitle")}</span>
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/tournaments"
                  className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all glow-violet clip-corner"
                >
                  {t("ctaTournaments")}
                </Link>
                <Link
                  href="/players"
                  className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all clip-corner"
                >
                  {t("ctaFindTeammate")}
                </Link>
              </div>
            </div>

            {/* Stats — реальные числа из БД */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-px bg-violet-500/10 rounded-lg overflow-hidden border border-violet-500/20">
              {statsRow.map((s) => (
                <div key={s.label} className="bg-zinc-950/80 backdrop-blur p-5 text-center">
                  <div className="text-3xl font-black bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1 font-mono">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HLTV-STYLE 3-COLUMN GRID */}
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
            {/* LEFT — MATCHES */}
            <aside className="space-y-6 lg:sticky lg:top-20 self-start">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-rose-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    {t("live")} · {liveMatches.length}
                  </h3>
                  <Link href="/matches" className="text-xs text-zinc-500 hover:text-violet-300 font-mono">
                    ALL →
                  </Link>
                </div>
                {liveMatches.length === 0 ? (
                  <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                    Сейчас нет идущих матчей
                  </div>
                ) : (
                  <div className="space-y-2">
                    {liveMatches.map((m) => (
                      <div
                        key={m.id}
                        className="rounded border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors p-3"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                          <GameTag code={m.tournamentId ? "CS2" : "CS2"} />
                          <span className="truncate ml-2">
                            {m.tournament?.name || "Match"}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold truncate">
                              {m.teamA?.name ?? "TBD"}
                            </span>
                            <span
                              className={`font-mono font-bold ${m.scoreA > m.scoreB ? "text-rose-300" : "text-zinc-400"}`}
                            >
                              {m.scoreA}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold truncate">
                              {m.teamB?.name ?? "TBD"}
                            </span>
                            <span
                              className={`font-mono font-bold ${m.scoreB > m.scoreA ? "text-rose-300" : "text-zinc-400"}`}
                            >
                              {m.scoreB}
                            </span>
                          </div>
                        </div>
                        {m.map && (
                          <div className="mt-2 text-[10px] font-mono text-zinc-500">
                            {m.map}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
                  Расписание
                </h3>
                {upcomingMatches.length === 0 ? (
                  <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                    Расписание пусто
                  </div>
                ) : (
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 overflow-hidden divide-y divide-zinc-800">
                    {upcomingMatches.map((m) => (
                      <div key={m.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <GameTag code={"CS2"} />
                          <span>{formatMatchTime(m.startsAt)}</span>
                        </div>
                        <div className="text-sm font-medium leading-tight">
                          {m.teamA?.name ?? "TBD"}{" "}
                          <span className="text-zinc-600 font-mono text-xs mx-1">vs</span>{" "}
                          {m.teamB?.name ?? "TBD"}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {m.tournament?.name || m.stage || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
                  Результаты
                </h3>
                {recentResults.length === 0 ? (
                  <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                    Пока нет результатов
                  </div>
                ) : (
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                    {recentResults.map((r) => {
                      const aWon = r.scoreA > r.scoreB;
                      const bWon = r.scoreB > r.scoreA;
                      return (
                        <div key={r.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                            <GameTag code={"CS2"} />
                            <span>{r.finishedAt ? formatRelativeTime(r.finishedAt) : "—"}</span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`truncate ${aWon ? "font-bold text-zinc-100" : "text-zinc-500"}`}>
                                {r.teamA?.name ?? "TBD"}
                              </span>
                              <span className={`font-mono ${aWon ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
                                {r.scoreA}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`truncate ${bWon ? "font-bold text-zinc-100" : "text-zinc-500"}`}>
                                {r.teamB?.name ?? "TBD"}
                              </span>
                              <span className={`font-mono ${bWon ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
                                {r.scoreB}
                              </span>
                            </div>
                          </div>
                          {r.map && (
                            <div className="text-[10px] font-mono text-zinc-500 mt-1">{r.map}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Activity feed */}
              {activityFeed.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-3">
                    📡 Активность
                  </h3>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
                    {activityFeed.map((a) => {
                      const Inner = (
                        <>
                          <div
                            className={`text-base shrink-0 px-2 py-1 rounded border font-mono ${a.iconColor}`}
                          >
                            {activityIcon(a.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-zinc-300 truncate">
                              {a.text}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                              {formatRelativeTime(a.at)}
                            </div>
                          </div>
                        </>
                      );
                      return a.link ? (
                        <Link
                          key={a.id}
                          href={a.link}
                          className="flex items-center gap-2.5 p-2.5 hover:bg-zinc-800/50 transition-colors"
                        >
                          {Inner}
                        </Link>
                      ) : (
                        <div
                          key={a.id}
                          className="flex items-center gap-2.5 p-2.5"
                        >
                          {Inner}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

            {/* CENTER — NEWS FEED */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black tracking-tight">
                  <span className="text-violet-400 font-mono text-xs uppercase tracking-widest mr-2">//</span>
                  Лента новостей
                </h2>
              </div>

              {newsFeed.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
                  <div className="text-4xl mb-3">📰</div>
                  <p className="font-bold mb-2 text-zinc-300">Скоро здесь появятся новости</p>
                  <p className="text-sm">
                    Турниры, MVP-результаты, объявления о партнёрах — всё будет тут.
                  </p>
                </div>
              ) : (
                <>
                  {/* Featured (first item) */}
                  <article className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 transition-colors mb-4 cursor-pointer">
                    <div className="aspect-[16/7] bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-zinc-900 relative">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(167,139,250,0.3),transparent_60%)]" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30">
                          {newsFeed[0].category}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-black tracking-tight group-hover:text-violet-200 transition-colors">
                          {newsFeed[0].title}
                        </h3>
                        {newsFeed[0].excerpt && (
                          <p className="text-sm text-zinc-300 mt-2 line-clamp-2">
                            {newsFeed[0].excerpt}
                          </p>
                        )}
                        <div className="text-xs font-mono text-zinc-400 mt-3">
                          {newsFeed[0].publishedAt
                            ? formatRelativeTime(newsFeed[0].publishedAt)
                            : ""}
                        </div>
                      </div>
                    </div>
                  </article>

                  <div className="space-y-3">
                    {newsFeed.slice(1).map((n) => (
                      <article
                        key={n.id}
                        className="group flex gap-4 rounded-lg border border-zinc-800 border-l-violet-500 border-l-4 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors p-4 cursor-pointer"
                      >
                        <div className="w-24 sm:w-32 aspect-square shrink-0 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-black text-2xl text-zinc-700">
                          {n.category.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30">
                              {n.category}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {n.publishedAt ? formatRelativeTime(n.publishedAt) : ""}
                            </span>
                          </div>
                          <h3 className="font-bold leading-tight group-hover:text-violet-200 transition-colors">
                            {n.title}
                          </h3>
                          {n.excerpt && (
                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                              {n.excerpt}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* RIGHT — RANKINGS */}
            <aside className="space-y-6 lg:sticky lg:top-20 self-start">
              {/* Featured tournament */}
              {featuredTournament && (
                <div className="relative rounded-lg overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent p-5 scan-line">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-violet-300 mb-2">
                    ★ Featured Tournament
                  </div>
                  <div className="font-black text-lg leading-tight mb-1">
                    {featuredTournament.name}
                  </div>
                  <GameTag code={featuredTournament.game} />
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-mono text-zinc-500 uppercase">Призовой</div>
                      <div className="font-bold text-amber-300">
                        ₸ {(Number(featuredTournament.prize) / 100).toLocaleString("ru-RU")}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-zinc-500 uppercase">Команды</div>
                      <div className="font-bold">{featuredTournament.maxTeams}</div>
                    </div>
                  </div>
                  {featuredTournament.startsAt &&
                    new Date(featuredTournament.startsAt).getTime() > Date.now() && (
                      <div className="mt-4">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">
                          До старта
                        </div>
                        <Countdown toIso={featuredTournament.startsAt.toISOString()} />
                      </div>
                    )}
                  <Link
                    href={`/tournaments/${featuredTournament.slug}`}
                    className="mt-4 block w-full text-center h-9 leading-9 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
                  >
                    Подробнее
                  </Link>
                </div>
              )}

              {/* Top teams */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400">
                    🏆 Top Teams
                  </h3>
                  <Link href="/teams" className="text-xs text-zinc-500 hover:text-violet-300 font-mono">
                    ALL →
                  </Link>
                </div>
                {topTeams.length === 0 ? (
                  <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                    Команд ещё нет.{" "}
                    <Link href="/teams/new" className="text-violet-300 hover:text-violet-200">
                      Создать →
                    </Link>
                  </div>
                ) : (
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                    {topTeams.map((t, i) => (
                      <Link
                        key={t.id}
                        href={`/teams/${t.tag}`}
                        className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors"
                      >
                        <span
                          className={`font-mono font-black text-sm w-5 ${i === 0 ? "text-amber-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-500"}`}
                        >
                          {i + 1}
                        </span>
                        <div className="w-7 h-7 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xs font-bold">
                          {t.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{t.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            {t.game} · {t.rating} pts
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Online now */}
              {onlineUsers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Online · {onlineUsers.length}
                    </h3>
                    <Link
                      href="/players"
                      className="text-xs text-zinc-500 hover:text-violet-300 font-mono"
                    >
                      ALL →
                    </Link>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="flex flex-wrap gap-2">
                      {onlineUsers.map((u) => (
                        <Link
                          key={u.id}
                          href={`/players/${encodeURIComponent(u.username)}`}
                          title={u.username}
                          className="relative group"
                        >
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatarUrl}
                              alt={u.username}
                              className="w-9 h-9 rounded border border-zinc-700 group-hover:border-emerald-400 transition-colors"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                              {u.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Streamers */}
              {streamers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-fuchsia-400">
                      📺 Стримеры
                    </h3>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                    {streamers.map((s) => {
                      const channel =
                        s.twitchUrl?.match(/twitch\.tv\/([\w-]+)/i)?.[1] ?? "";
                      const isOnline =
                        s.lastSeenAt &&
                        Date.now() - new Date(s.lastSeenAt).getTime() < 5 * 60_000;
                      return (
                        <a
                          key={s.id}
                          href={s.twitchUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="relative shrink-0">
                            {s.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.avatarUrl}
                                alt={s.username}
                                className="w-8 h-8 rounded border border-zinc-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-fuchsia-500/20 border border-fuchsia-500/30" />
                            )}
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">
                              {s.username}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 truncate">
                              twitch.tv/{channel}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-fuchsia-400">→</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sponsor slot */}
              <div className="rounded border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                  Реклама
                </div>
                <div className="text-sm text-zinc-400 mb-3">
                  Здесь может быть ваш бренд
                </div>
                <Link
                  href="/sponsors"
                  className="inline-block text-xs font-mono text-violet-300 hover:text-violet-200 underline"
                >
                  СТАТЬ СПОНСОРОМ →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* GAMES */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
                // 01 · Disciplines
              </p>
              <h2 className="text-3xl font-black tracking-tight">Дисциплины</h2>
            </div>
            <Link
              href="/tournaments"
              className="text-sm text-zinc-400 hover:text-violet-300 font-medium hidden sm:inline"
            >
              Все турниры →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {games.map((game) => (
              <Link
                href={`/tournaments?game=${game.code.toLowerCase()}`}
                key={game.code}
                className={`group relative rounded-lg bg-zinc-900/60 border border-zinc-800 ${game.border} ${game.glow} p-6 transition-all hover:-translate-y-1 overflow-hidden`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${game.accent}`} />
                <div className="font-mono text-xs text-zinc-500 mb-1">
                  /game/{game.code.toLowerCase()}
                </div>
                <div className={`text-2xl font-black bg-gradient-to-r ${game.accent} bg-clip-text text-transparent`}>
                  {game.code}
                </div>
                <h3 className="text-xl font-bold mt-1">{game.name}</h3>
                <p className="text-zinc-500 text-sm mt-3 font-mono">{game.format}</p>
                <div className="mt-6 flex items-center text-sm text-zinc-400 group-hover:text-violet-300 transition-colors">
                  Расписание матчей{" "}
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* TEAMS BY REGION */}
        {regionTeams.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-fuchsia-400 font-mono text-xs uppercase tracking-widest mb-2">
                  // 03 · Regions
                </p>
                <h2 className="text-3xl font-black tracking-tight">
                  Команды по регионам
                </h2>
                <p className="text-zinc-500 mt-2 text-sm">
                  Сильнейшие составы из главных городов КЗ
                </p>
              </div>
              <Link
                href="/teams"
                className="text-sm text-zinc-400 hover:text-violet-300 font-medium hidden sm:inline"
              >
                Все команды →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["ALMATY", "ASTANA", "SHYMKENT", "KARAGANDA"] as const).map(
                (region) => {
                  const cityTeams = regionTeams
                    .filter((t) => t.region === region)
                    .slice(0, 3);
                  const cityLabel = {
                    ALMATY: "Алматы",
                    ASTANA: "Астана",
                    SHYMKENT: "Шымкент",
                    KARAGANDA: "Караганда",
                  }[region];
                  return (
                    <div
                      key={region}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-base">📍 {cityLabel}</h3>
                        <Link
                          href={`/teams?region=${region.toLowerCase()}`}
                          className="text-[10px] font-mono text-zinc-500 hover:text-violet-300"
                        >
                          ALL →
                        </Link>
                      </div>
                      {cityTeams.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4">Команд пока нет</p>
                      ) : (
                        <div className="space-y-1.5">
                          {cityTeams.map((t, i) => (
                            <Link
                              key={t.id}
                              href={`/teams/${t.tag}`}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-violet-500/10 transition-colors"
                            >
                              <span
                                className={`font-mono font-black text-xs w-4 ${
                                  i === 0
                                    ? "text-amber-300"
                                    : i === 1
                                      ? "text-zinc-300"
                                      : "text-amber-700"
                                }`}
                              >
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">
                                  {t.name}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500">
                                  {t.game} · {t.rating} pts
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* FOR BRANDS */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-rose-500/10 p-8 sm:p-12">
            <p className="text-violet-300 font-mono text-xs uppercase tracking-widest mb-3">
              // Для брендов
            </p>
            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tighter leading-[1.05] max-w-3xl">
              <span className="block text-zinc-300">Хочешь быть в&nbsp;ногу</span>
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                с&nbsp;молодёжью Казахстана?
              </span>
            </h2>
            <p className="text-zinc-400 mt-6 text-lg max-w-2xl leading-relaxed">
              Прорекламировать свой продукт там, где её внимание не делится между
              десятком вкладок? Получить лояльных клиентов, а не разовые показы?
            </p>
            <p className="text-zinc-300 mt-4 text-lg max-w-2xl">
              Свяжись с нами — обсудим программу спонсорства.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sponsors"
                className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
              >
                Узнать подробнее →
              </Link>
              <Link
                href="/sponsors#contact"
                className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider border border-violet-400/40 text-violet-200 hover:border-violet-300 hover:bg-violet-500/10 transition-all clip-corner"
              >
                Связаться с нами
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
