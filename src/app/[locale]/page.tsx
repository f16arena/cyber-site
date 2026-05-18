export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getRecentActivity, activityIcon } from "@/lib/activity-feed";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";

function formatRelativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  if (diff < 86400 * 2) return "вчера";
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн`;
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
  if (isToday) return `Сегодня ${time}`;
  if (isTomorrow) return `Завтра ${time}`;
  return `${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} ${time}`;
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
  await getTranslations("Home");

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
      take: 5,
    }),
    prisma.match.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
      include: {
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      include: {
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 6,
    }),
    prisma.news.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.team.findMany({
      orderBy: { rating: "desc" },
      take: 8,
      select: { id: true, name: true, tag: true, rating: true, game: true },
    }),
    prisma.user.findMany({
      where: { lastSeenAt: { gte: fiveMinAgo } },
      orderBy: { lastSeenAt: "desc" },
      take: 12,
      select: { id: true, username: true, avatarUrl: true },
    }),
    prisma.tournament.findFirst({
      where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } },
      orderBy: { startsAt: "asc" },
    }),
    getRecentActivity(6),
  ]);

  return (
    <>
      <AuthErrorBanner
        authError={sp.auth_error}
        reason={sp.reason}
        detail={sp.detail}
      />

      <SiteHeader />

      {/* Featured banner — HLTV signature жёлтая полоса */}
      {featuredTournament && (
        <Link
          href={`/tournaments/${featuredTournament.slug}`}
          className="block hltv-featured hover:bg-brand-yellow-hover"
        >
          <div className="mx-auto max-w-7xl px-4 h-9 flex items-center gap-3 text-[12px] font-bold uppercase tracking-wide">
            <span className="bg-text-on-yellow text-brand-yellow px-1.5 py-0.5 text-[10px] rounded-sm">
              FEATURED
            </span>
            <span className="truncate flex-1">
              {featuredTournament.name}
            </span>
            <span className="font-mono shrink-0">
              {featuredTournament.status === "ONGOING"
                ? "LIVE"
                : "REG OPEN"}
            </span>
            <span className="font-mono shrink-0 tabular-nums">
              ₸ {(Number(featuredTournament.prize) / 100).toLocaleString("ru-RU")}
            </span>
            <span className="shrink-0">▶</span>
          </div>
        </Link>
      )}

      {/* Live ticker */}
      {liveMatches.length > 0 && (
        <div className="border-b border-border-default bg-bg-panel">
          <div className="mx-auto max-w-7xl px-4 h-7 flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-rose-300 font-bold shrink-0">
              <span className="live-dot" />
              LIVE · {liveMatches.length}
            </span>
            <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap flex-1">
              {liveMatches.map((m) => (
                <span key={m.id} className="text-text-secondary">
                  <span className="text-text-primary font-semibold">
                    {m.teamA?.name ?? "TBD"}
                  </span>
                  <span className="mx-1.5 text-brand-yellow tabular-nums font-bold">
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
              className="text-brand-blue hover:text-brand-blue-hover shrink-0"
            >
              ALL »
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-3">
            {/* LEFT — MATCHES (HLTV-style: very dense, tiny rows) */}
            <aside className="space-y-3 min-w-0">
              <section>
                <SectionHeader>
                  <span className="flex items-center gap-1.5">
                    <span className="live-dot" />
                    LIVE · {liveMatches.length}
                  </span>
                  <SectionMore href="/matches" />
                </SectionHeader>
                {liveMatches.length === 0 ? (
                  <EmptySection text="Нет идущих" />
                ) : (
                  <div className="bg-bg-panel border border-border-default">
                    {liveMatches.map((m) => {
                      const aWon = m.scoreA > m.scoreB;
                      const bWon = m.scoreB > m.scoreA;
                      return (
                        <Link
                          key={m.id}
                          href={`/matches/${m.id}`}
                          className="block px-2 py-1.5 border-b border-border-default last:border-b-0 hover:bg-bg-elevated text-[12px]"
                        >
                          <CompactRow
                            name={m.teamA?.name ?? "TBD"}
                            score={m.scoreA}
                            winner={aWon}
                            live
                          />
                          <CompactRow
                            name={m.teamB?.name ?? "TBD"}
                            score={m.scoreB}
                            winner={bWon}
                            live
                          />
                          {(m.map || m.tournament) && (
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 truncate">
                              {m.map && <span>{m.map}</span>}
                              {m.map && m.tournament && <span> · </span>}
                              {m.tournament && <span>{m.tournament.name}</span>}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <SectionHeader>
                  <span>РАСПИСАНИЕ</span>
                  <SectionMore href="/matches?filter=upcoming" />
                </SectionHeader>
                {upcomingMatches.length === 0 ? (
                  <EmptySection text="Расписание пусто" />
                ) : (
                  <div className="bg-bg-panel border border-border-default">
                    {upcomingMatches.map((m) => (
                      <Link
                        key={m.id}
                        href={`/matches/${m.id}`}
                        className="block px-2 py-1.5 border-b border-border-default last:border-b-0 hover:bg-bg-elevated text-[12px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-text-secondary font-mono text-[10px] tabular-nums shrink-0">
                            {formatMatchTime(m.startsAt)}
                          </span>
                        </div>
                        <div className="text-[12px] text-text-primary leading-tight">
                          {m.teamA?.name ?? "TBD"}
                          <span className="text-text-muted mx-1">vs</span>
                          {m.teamB?.name ?? "TBD"}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionHeader>
                  <span>РЕЗУЛЬТАТЫ</span>
                  <SectionMore href="/matches?filter=finished" />
                </SectionHeader>
                {recentResults.length === 0 ? (
                  <EmptySection text="Нет результатов" />
                ) : (
                  <div className="bg-bg-panel border border-border-default">
                    {recentResults.map((r) => {
                      const aWon = r.scoreA > r.scoreB;
                      const bWon = r.scoreB > r.scoreA;
                      return (
                        <Link
                          key={r.id}
                          href={`/matches/${r.id}`}
                          className="block px-2 py-1.5 border-b border-border-default last:border-b-0 hover:bg-bg-elevated text-[12px]"
                        >
                          <CompactRow
                            name={r.teamA?.name ?? "TBD"}
                            score={r.scoreA}
                            winner={aWon}
                          />
                          <CompactRow
                            name={r.teamB?.name ?? "TBD"}
                            score={r.scoreB}
                            winner={bWon}
                          />
                          {(r.map || r.finishedAt) && (
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 flex items-center justify-between">
                              <span>{r.map ?? ""}</span>
                              <span>
                                {r.finishedAt
                                  ? formatRelativeTime(r.finishedAt)
                                  : ""}
                              </span>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </aside>

            {/* CENTER — NEWS feed (HLTV: thumbnails слева от заголовка) */}
            <div className="space-y-3 min-w-0">
              <section>
                <SectionHeader>
                  <span>НОВОСТИ</span>
                  <SectionMore href="/news" />
                </SectionHeader>
                {newsFeed.length === 0 ? (
                  <EmptyState
                    title="Новостей пока нет"
                    description="Турниры, результаты, объявления — всё появится здесь."
                  />
                ) : (
                  <div className="bg-bg-panel border border-border-default">
                    {newsFeed.map((n) => (
                      <Link
                        key={n.id}
                        href={`/news/${n.slug}`}
                        className="flex gap-2 px-2 py-2 border-b border-border-default last:border-b-0 hover:bg-bg-elevated"
                      >
                        <div className="w-14 h-14 shrink-0 bg-bg-elevated border border-border-default flex items-center justify-center font-mono font-bold text-[10px] text-text-muted uppercase">
                          {n.category.slice(0, 3)}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-brand-yellow">
                              {n.category}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">
                              {n.publishedAt
                                ? formatRelativeTime(n.publishedAt)
                                : ""}
                            </span>
                          </div>
                          <h3 className="text-[13px] font-semibold leading-snug text-text-primary line-clamp-2">
                            {n.title}
                          </h3>
                          {n.excerpt && (
                            <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                              {n.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Activity feed под новостями */}
              {activityFeed.length > 0 && (
                <section>
                  <SectionHeader>
                    <span>АКТИВНОСТЬ</span>
                  </SectionHeader>
                  <div className="bg-bg-panel border border-border-default">
                    {activityFeed.map((a) => {
                      const inner = (
                        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border-default last:border-b-0">
                          <span className="text-text-muted text-[12px] w-5 text-center">
                            {activityIcon(a.type)}
                          </span>
                          <span className="text-[12px] text-text-secondary truncate flex-1">
                            {a.text}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted shrink-0">
                            {formatRelativeTime(a.at)}
                          </span>
                        </div>
                      );
                      return a.link ? (
                        <Link
                          key={a.id}
                          href={a.link}
                          className="block hover:bg-bg-elevated"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={a.id}>{inner}</div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT — RANKINGS */}
            <aside className="space-y-3 min-w-0">
              <section>
                <SectionHeader>
                  <span>РЕЙТИНГ</span>
                  <SectionMore href="/teams" />
                </SectionHeader>
                {topTeams.length === 0 ? (
                  <EmptySection text="Команд нет">
                    <Link
                      href="/teams/new"
                      className="text-brand-blue hover:text-brand-blue-hover text-[11px]"
                    >
                      Создать »
                    </Link>
                  </EmptySection>
                ) : (
                  <div className="bg-bg-panel border border-border-default">
                    {topTeams.map((team, i) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.tag}`}
                        className="flex items-center gap-2 px-2 py-1.5 border-b border-border-default last:border-b-0 hover:bg-bg-elevated text-[12px]"
                      >
                        <span
                          className={`font-mono font-bold w-4 text-center tabular-nums shrink-0 ${
                            i === 0
                              ? "text-brand-yellow"
                              : i < 3
                              ? "text-text-primary"
                              : "text-text-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="w-5 h-5 shrink-0 bg-bg-elevated border border-border-default flex items-center justify-center text-[9px] font-bold text-text-secondary">
                          {team.name[0]}
                        </div>
                        <span className="flex-1 truncate font-medium text-text-primary">
                          {team.name}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-[11px] text-text-secondary shrink-0">
                          {team.rating}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {onlineUsers.length > 0 && (
                <section>
                  <SectionHeader>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ОНЛАЙН · {onlineUsers.length}
                    </span>
                    <SectionMore href="/players" />
                  </SectionHeader>
                  <div className="bg-bg-panel border border-border-default p-2">
                    <div className="flex flex-wrap gap-1">
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
                              className="w-7 h-7 border border-border-default group-hover:border-brand-yellow"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-bg-elevated border border-border-default flex items-center justify-center text-[10px] font-bold text-text-secondary">
                              {u.username[0].toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-bg-panel" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Sponsor slot */}
              <section>
                <SectionHeader>
                  <span>РЕКЛАМА</span>
                </SectionHeader>
                <div className="border border-dashed border-border-strong bg-bg-panel/40 p-3 text-center">
                  <p className="text-[11px] text-text-secondary mb-1.5">
                    Здесь может быть ваш бренд
                  </p>
                  <Link
                    href="/sponsors"
                    className="inline-block text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover"
                  >
                    СТАТЬ СПОНСОРОМ »
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/* ─── helpers ─────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5 h-6">
      <h3 className="text-[10px] font-mono uppercase tracking-widest font-bold text-text-secondary">
        {children}
      </h3>
    </div>
  );
}

function SectionMore({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-[10px] font-mono text-brand-blue hover:text-brand-blue-hover"
    >
      ALL »
    </Link>
  );
}

function EmptySection({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-bg-panel border border-border-default px-2 py-3 text-[11px] text-text-muted">
      {text}
      {children && <span className="ml-2">{children}</span>}
    </div>
  );
}

function CompactRow({
  name,
  score,
  winner,
  live = false,
}: {
  name: string;
  score: number;
  winner: boolean;
  live?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 leading-tight">
      <span
        className={`truncate ${
          winner ? "font-bold text-text-primary" : "text-text-secondary"
        }`}
      >
        {name}
      </span>
      <span
        className={`font-mono font-bold tabular-nums shrink-0 ${
          live ? "text-brand-yellow" : winner ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

