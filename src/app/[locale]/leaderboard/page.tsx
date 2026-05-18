export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
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
          profiles: validGame ? { where: { game: validGame } } : true,
        },
      })
    : [];
  const playerMap = new Map(players.map((p) => [p.id, p]));

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
      <main className="flex-1">
        <PageContainer>
          <PageHeader
            title="Лидерборды"
            subtitle="Топ-игроки и команды по результатам сыгранных матчей."
          />

          <div className="flex gap-1.5 mb-5 flex-wrap">
            {GAME_FILTERS.map((f) => {
              const active =
                (f.value === "ALL" && !validGame) ||
                (validGame && f.value === validGame);
              const href =
                f.value === "ALL"
                  ? "/leaderboard"
                  : `/leaderboard?game=${f.value.toLowerCase()}`;
              return (
                <Link
                  key={f.value}
                  href={href}
                  className={`px-3 h-8 inline-flex items-center text-sm rounded border transition-colors ${
                    active
                      ? "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/40"
                      : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Top Players */}
            <Section title="Top Players" accent="amber">
              {topPlayersByRating.length === 0 ? (
                <EmptySection text="Нет матчей" />
              ) : (
                <RankingList>
                  {topPlayersByRating.map((stat, i) => {
                    const u = playerMap.get(stat.userId);
                    if (!u) return null;
                    const profile =
                      "profiles" in u && Array.isArray(u.profiles)
                        ? u.profiles[0]
                        : null;
                    return (
                      <RankingRow
                        key={stat.userId}
                        rank={i + 1}
                        href={`/players/${encodeURIComponent(u.username)}`}
                        avatarUrl={u.avatarUrl}
                        name={u.username}
                        subtitle={`${profile?.inGameRole ?? "—"} · ${stat._count._all} м.`}
                        value={(stat._avg.rating ?? 0).toFixed(2)}
                        valueAccent="text-brand-yellow"
                      />
                    );
                  })}
                </RankingList>
              )}
            </Section>

            {/* Top Teams */}
            <Section title="Top Teams" accent="amber">
              {topTeams.length === 0 ? (
                <EmptySection text="Команд нет" />
              ) : (
                <RankingList>
                  {topTeams.map((t, i) => (
                    <RankingRow
                      key={t.id}
                      rank={i + 1}
                      href={`/teams/${t.tag}`}
                      name={t.name}
                      subtitle={`${t.game} · ${t._count.wonMatches} побед`}
                      value={String(t.rating)}
                      valueAccent="text-brand-yellow"
                    />
                  ))}
                </RankingList>
              )}
            </Section>

            {/* MVP Leaders */}
            <Section title="MVP Leaders" accent="default">
              {mvpCounts.length === 0 ? (
                <EmptySection text="Наград MVP пока нет" />
              ) : (
                <RankingList>
                  {mvpCounts.map((m, i) => {
                    const u = mvpUserMap.get(m.userId);
                    if (!u) return null;
                    return (
                      <RankingRow
                        key={m.userId}
                        rank={i + 1}
                        href={`/players/${encodeURIComponent(u.username)}`}
                        avatarUrl={u.avatarUrl}
                        name={u.username}
                        value={`${m._count._all} ★`}
                        valueAccent="text-brand-yellow"
                      />
                    );
                  })}
                </RankingList>
              )}
            </Section>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "amber" | "default";
  children: React.ReactNode;
}) {
  const accentColor =
    accent === "amber" ? "text-brand-yellow" : "text-text-secondary";
  return (
    <section>
      <h2
        className={`text-[10px] font-mono uppercase tracking-widest font-bold mb-2 ${accentColor}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function RankingList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default">
      {children}
    </div>
  );
}

function RankingRow({
  rank,
  href,
  avatarUrl,
  name,
  subtitle,
  value,
  valueAccent,
}: {
  rank: number;
  href: string;
  avatarUrl?: string | null;
  name: string;
  subtitle?: string;
  value: string;
  valueAccent?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated text-[13px]"
    >
      <span
        className={`font-mono font-bold w-5 text-center tabular-nums shrink-0 ${
          rank === 1
            ? "text-brand-yellow"
            : rank <= 3
              ? "text-text-primary"
              : "text-text-muted"
        }`}
      >
        {rank}
      </span>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="w-6 h-6 border border-border-default"
        />
      ) : (
        <div className="w-6 h-6 bg-bg-elevated border border-border-default flex items-center justify-center text-[10px] font-bold text-text-secondary">
          {name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{name}</div>
        {subtitle && (
          <div className="text-[10px] font-mono text-text-muted">
            {subtitle}
          </div>
        )}
      </div>
      <span
        className={`font-mono font-bold text-[12px] tabular-nums shrink-0 ${valueAccent ?? "text-text-primary"}`}
      >
        {value}
      </span>
    </Link>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="rounded border border-border-default bg-bg-panel px-3 py-3 text-[12px] text-text-muted">
      {text}
    </div>
  );
}
