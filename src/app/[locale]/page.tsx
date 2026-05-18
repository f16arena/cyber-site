export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Countdown } from "@/components/Countdown";
import { getRecentActivity, activityIcon } from "@/lib/activity-feed";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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

  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Сегодня · ${time}`;
  if (isTomorrow) return `Завтра · ${time}`;
  return `${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} · ${time}`;
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    auth_error?: string;
    reason?: string;
    detail?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);

  const [
    liveMatches,
    upcomingMatches,
    recentResults,
    newsFeed,
    topTeams,
    onlineUsers,
    featuredTournament,
    activityFeed,
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
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      include: {
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 4,
    }),
    prisma.news.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    prisma.team.findMany({
      orderBy: { rating: "desc" },
      take: 7,
      select: { id: true, name: true, tag: true, rating: true, game: true },
    }),
    prisma.user.findMany({
      where: { lastSeenAt: { gte: fiveMinAgo } },
      orderBy: { lastSeenAt: "desc" },
      take: 10,
      select: { id: true, username: true, avatarUrl: true },
    }),
    prisma.tournament.findFirst({
      where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } },
      orderBy: { startsAt: "asc" },
    }),
    getRecentActivity(8),
  ]);

  return (
    <>
      <AuthErrorBanner
        authError={sp.auth_error}
        reason={sp.reason}
        detail={sp.detail}
      />

      <SiteHeader />

      {/* Live ticker — узкая полоса под header */}
      {liveMatches.length > 0 && (
        <div className="border-b border-rose-500/30 bg-rose-500/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-8 flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-300 font-bold">
              <span className="live-dot" />
              LIVE · {liveMatches.length}
            </span>
            <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap flex-1">
              {liveMatches.map((m) => (
                <span key={m.id} className="text-text-secondary">
                  <span className="text-text-primary font-semibold">
                    {m.teamA?.name ?? "TBD"}
                  </span>
                  <span className="mx-1.5 text-cyan-300 tabular-nums">
                    {m.scoreA}:{m.scoreB}
                  </span>
                  <span className="text-text-primary font-semibold">
                    {m.teamB?.name ?? "TBD"}
                  </span>
                  {m.tournament && (
                    <span className="text-text-muted ml-2">
                      · {m.tournament.name}
                    </span>
                  )}
                </span>
              ))}
            </div>
            <Link
              href="/matches"
              className="text-cyan-300 hover:text-cyan-200 shrink-0"
            >
              ALL →
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-6">
            {/* LEFT — MATCHES */}
            <aside className="space-y-5 min-w-0 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
              <ColumnSection
                title={
                  <>
                    <span className="live-dot mr-1.5" />
                    {t("live")} · {liveMatches.length}
                  </>
                }
                accent="rose"
                viewAll="/matches"
              >
                {liveMatches.length === 0 ? (
                  <EmptyState
                    compact
                    title="Нет идущих матчей"
                  />
                ) : (
                  <div className="space-y-2">
                    {liveMatches.map((m) => {
                      const aWon = m.scoreA > m.scoreB;
                      const bWon = m.scoreB > m.scoreA;
                      return (
                        <Link
                          key={m.id}
                          href={`/matches/${m.id}`}
                          className="block rounded border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors p-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1.5">
                            <Badge variant="cyan" size="sm">CS2</Badge>
                            <span className="truncate ml-2">
                              {m.tournament?.name ?? "Match"}
                            </span>
                          </div>
                          <ScoreRow
                            team={m.teamA?.name ?? "TBD"}
                            score={m.scoreA}
                            highlight={aWon}
                          />
                          <ScoreRow
                            team={m.teamB?.name ?? "TBD"}
                            score={m.scoreB}
                            highlight={bWon}
                          />
                          {m.map && (
                            <div className="mt-1.5 text-[10px] font-mono text-text-muted">
                              {m.map}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </ColumnSection>

              <ColumnSection title="Расписание" accent="default">
                {upcomingMatches.length === 0 ? (
                  <EmptyState compact title="Расписание пусто" />
                ) : (
                  <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default/60">
                    {upcomingMatches.map((m) => (
                      <Link
                        key={m.id}
                        href={`/matches/${m.id}`}
                        className="block px-3 py-2.5 hover:bg-bg-elevated transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <Badge variant="cyan" size="sm">CS2</Badge>
                          <span className="text-text-muted">
                            {formatMatchTime(m.startsAt)}
                          </span>
                        </div>
                        <div className="text-sm font-medium leading-tight text-text-primary">
                          {m.teamA?.name ?? "TBD"}
                          <span className="text-text-muted font-mono text-xs mx-1.5">
                            vs
                          </span>
                          {m.teamB?.name ?? "TBD"}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted mt-0.5 truncate">
                          {m.tournament?.name ?? m.stage ?? "—"}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ColumnSection>

              <ColumnSection title="Результаты" accent="default">
                {recentResults.length === 0 ? (
                  <EmptyState compact title="Результатов пока нет" />
                ) : (
                  <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default/60">
                    {recentResults.map((r) => {
                      const aWon = r.scoreA > r.scoreB;
                      const bWon = r.scoreB > r.scoreA;
                      return (
                        <Link
                          key={r.id}
                          href={`/matches/${r.id}`}
                          className="block px-3 py-2.5 hover:bg-bg-elevated transition-colors"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1.5">
                            <Badge variant="cyan" size="sm">CS2</Badge>
                            <span>
                              {r.finishedAt
                                ? formatRelativeTime(r.finishedAt)
                                : "—"}
                            </span>
                          </div>
                          <ScoreRow
                            team={r.teamA?.name ?? "TBD"}
                            score={r.scoreA}
                            highlight={aWon}
                          />
                          <ScoreRow
                            team={r.teamB?.name ?? "TBD"}
                            score={r.scoreB}
                            highlight={bWon}
                          />
                          {r.map && (
                            <div className="text-[10px] font-mono text-text-muted mt-1">
                              {r.map}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </ColumnSection>

              {activityFeed.length > 0 && (
                <ColumnSection title="Активность" accent="cyan">
                  <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default/60">
                    {activityFeed.map((a) => {
                      const inner = (
                        <div className="flex items-center gap-2.5 p-2.5">
                          <div
                            className={`shrink-0 px-1.5 py-0.5 rounded border text-base font-mono ${a.iconColor}`}
                          >
                            {activityIcon(a.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text-primary truncate">
                              {a.text}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5">
                              {formatRelativeTime(a.at)}
                            </div>
                          </div>
                        </div>
                      );
                      return a.link ? (
                        <Link
                          key={a.id}
                          href={a.link}
                          className="block hover:bg-bg-elevated transition-colors"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={a.id}>{inner}</div>
                      );
                    })}
                  </div>
                </ColumnSection>
              )}
            </aside>

            {/* CENTER — FEATURED + NEWS */}
            <div className="space-y-6 min-w-0">
              {/* Featured tournament — крупная карточка */}
              {featuredTournament && (
                <Link
                  href={`/tournaments/${featuredTournament.slug}`}
                  className="block rounded border border-cyan-500/30 bg-bg-panel hover:border-cyan-500/60 transition-colors overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="aspect-[16/7] sm:aspect-auto sm:w-72 shrink-0 bg-gradient-to-br from-cyan-600/20 via-cyan-500/10 to-bg-base relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-bold text-cyan-400/30">
                          {featuredTournament.game}
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge variant="cyan" size="sm">
                          ★ Featured
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 p-5">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted mb-2">
                        <Badge
                          variant={
                            featuredTournament.status === "ONGOING"
                              ? "live"
                              : "upcoming"
                          }
                          size="sm"
                        >
                          {featuredTournament.status === "ONGOING"
                            ? "LIVE"
                            : "Регистрация открыта"}
                        </Badge>
                        <span>
                          {featuredTournament.format.replace("_", " ")}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-text-primary mb-2">
                        {featuredTournament.name}
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="font-mono text-text-muted uppercase">
                            Призовой
                          </div>
                          <div className="font-bold text-amber-300 text-base tabular-nums">
                            ₸{" "}
                            {(
                              Number(featuredTournament.prize) / 100
                            ).toLocaleString("ru-RU")}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-text-muted uppercase">
                            Команды
                          </div>
                          <div className="font-bold text-base tabular-nums">
                            {featuredTournament.maxTeams}
                          </div>
                        </div>
                      </div>
                      {featuredTournament.startsAt &&
                        new Date(featuredTournament.startsAt).getTime() >
                          Date.now() && (
                          <div className="mt-4">
                            <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-1.5">
                              До старта
                            </div>
                            <Countdown
                              toIso={featuredTournament.startsAt.toISOString()}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </Link>
              )}

              {/* News feed */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold tracking-tight">
                    Новости
                  </h2>
                  <Link
                    href="/news"
                    className="text-xs font-mono text-text-muted hover:text-cyan-300"
                  >
                    ALL →
                  </Link>
                </div>
                {newsFeed.length === 0 ? (
                  <EmptyState
                    title="Новостей пока нет"
                    description="Турниры, MVP-результаты, объявления о партнёрах — всё появится здесь."
                  />
                ) : (
                  <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default/60">
                    {newsFeed.map((n) => (
                      <Link
                        key={n.id}
                        href={`/news/${n.slug}`}
                        className="flex gap-3 px-3 py-3 hover:bg-bg-elevated transition-colors"
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded bg-bg-elevated border border-border-default flex items-center justify-center font-mono font-bold text-xs text-text-muted">
                          {n.category.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="cyan" size="sm">
                              {n.category}
                            </Badge>
                            <span className="text-[10px] font-mono text-text-muted">
                              {n.publishedAt
                                ? formatRelativeTime(n.publishedAt)
                                : ""}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-text-primary line-clamp-2">
                            {n.title}
                          </h3>
                          {n.excerpt && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                              {n.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT — RANKINGS */}
            <aside className="space-y-5 min-w-0 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
              <ColumnSection
                title="Top Teams"
                accent="amber"
                viewAll="/teams"
              >
                {topTeams.length === 0 ? (
                  <EmptyState
                    compact
                    title="Команд ещё нет"
                    description="Создайте первую"
                    action={
                      <Link
                        href="/teams/new"
                        className="text-xs text-cyan-300 hover:text-cyan-200"
                      >
                        Создать →
                      </Link>
                    }
                  />
                ) : (
                  <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default/60">
                    {topTeams.map((team, i) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.tag}`}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg-elevated transition-colors"
                      >
                        <span
                          className={`font-mono font-bold text-xs w-4 text-center tabular-nums ${
                            i === 0
                              ? "text-amber-300"
                              : i === 1
                              ? "text-slate-300"
                              : i === 2
                              ? "text-amber-700"
                              : "text-text-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="w-6 h-6 rounded bg-bg-elevated border border-border-default flex items-center justify-center text-xs font-bold text-text-secondary">
                          {team.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate text-text-primary">
                            {team.name}
                          </div>
                          <div className="text-[10px] font-mono text-text-muted">
                            {team.game}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-text-secondary tabular-nums">
                          {team.rating}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </ColumnSection>

              {onlineUsers.length > 0 && (
                <ColumnSection
                  title={
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                      Online · {onlineUsers.length}
                    </>
                  }
                  accent="default"
                  viewAll="/players"
                >
                  <div className="rounded border border-border-default bg-bg-panel p-3">
                    <div className="flex flex-wrap gap-1.5">
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
                              className="w-8 h-8 rounded border border-border-default group-hover:border-cyan-500/60 transition-colors"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-bg-elevated border border-border-default flex items-center justify-center text-xs font-bold text-text-secondary">
                              {u.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-bg-panel" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </ColumnSection>
              )}

              {/* Sponsor slot */}
              <div className="rounded border border-dashed border-border-strong bg-bg-panel/50 p-5 text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
                  Реклама
                </div>
                <div className="text-sm text-text-secondary mb-3">
                  Здесь может быть ваш бренд
                </div>
                <Link
                  href="/sponsors"
                  className="inline-block text-xs font-mono text-cyan-300 hover:text-cyan-200"
                >
                  СТАТЬ СПОНСОРОМ →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/* ── helpers ─────────────────────────────────────────── */

function ColumnSection({
  title,
  children,
  viewAll,
  accent = "default",
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  viewAll?: string;
  accent?: "default" | "rose" | "cyan" | "amber";
}) {
  const accentColor =
    accent === "rose"
      ? "text-rose-300"
      : accent === "cyan"
      ? "text-cyan-300"
      : accent === "amber"
      ? "text-amber-300"
      : "text-text-muted";
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3
          className={`text-[11px] font-mono uppercase tracking-widest font-bold flex items-center ${accentColor}`}
        >
          {title}
        </h3>
        {viewAll && (
          <Link
            href={viewAll}
            className="text-[10px] font-mono text-text-muted hover:text-cyan-300"
          >
            ALL →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ScoreRow({
  team,
  score,
  highlight,
}: {
  team: string;
  score: number;
  highlight: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span
        className={`truncate ${
          highlight ? "font-bold text-text-primary" : "text-text-secondary"
        }`}
      >
        {team}
      </span>
      <span
        className={`font-mono font-bold tabular-nums ml-2 ${
          highlight ? "text-cyan-300" : "text-text-muted"
        }`}
      >
        {score}
      </span>
    </div>
  );
}
