export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  aggregateByPlayer,
  leaderboard,
  type StatRow,
  type AggregatedPlayer,
} from "@/lib/stats/aggregator";
import { ratingTier } from "@/lib/stats/rating";

export default async function TournamentStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      game: true,
      status: true,
    },
  });
  if (!tournament) notFound();

  // Все матчи турнира → все статы по этим матчам
  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  const statRows = matchIds.length
    ? await prisma.matchPlayerStat.findMany({
        where: { matchId: { in: matchIds } },
        select: {
          userId: true,
          game: true,
          kills: true,
          deaths: true,
          assists: true,
          mvpRounds: true,
          rating: true,
          isMvp: true,
          extra: true,
        },
      })
    : [];

  const rows: StatRow[] = statRows.map((r) => ({
    userId: r.userId,
    game: r.game,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    mvpRounds: r.mvpRounds,
    rating: r.rating,
    isMvp: r.isMvp,
    extra: r.extra as Record<string, unknown> | null,
  }));

  const agg = aggregateByPlayer(rows);

  // Подгружаем юзеров для отображения
  const userIds = Array.from(new Set(agg.map((a) => a.userId)));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatarUrl: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const topRating = leaderboard(agg, "rating", 1).slice(0, 10);
  const topKills = leaderboard(agg, "kills", 1).slice(0, 10);
  const topAdr = leaderboard(agg, "adr", 1).slice(0, 10);
  const topMvps = leaderboard(agg, "mvps", 1)
    .filter((p) => p.mvps > 0)
    .slice(0, 10);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer className="py-6">
          <Link
            href={`/tournaments/${tournament.slug}`}
            className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-4"
          >
            ← {tournament.name}
          </Link>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge variant="yellow" size="sm">
              {tournament.game}
            </Badge>
            <Badge variant="default" size="sm">
              {tournament.status}
            </Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Статистика</h1>
          <p className="text-[13px] text-text-secondary mb-6">
            Топ игроков турнира по различным метрикам.
          </p>

          {agg.length === 0 ? (
            <EmptyState
              title="Статистика пуста"
              description="Появится после первых сыгранных матчей и ввода данных."
            />
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <LeaderboardCard
                title="Top Rating"
                accent="amber"
                rows={topRating}
                metric="avgRating"
                format="rating"
                userById={userById}
              />
              <LeaderboardCard
                title="Top Fragger"
                accent="rose"
                rows={topKills}
                metric="kills"
                format="int"
                userById={userById}
              />
              <LeaderboardCard
                title="Top ADR"
                accent="default"
                rows={topAdr}
                metric="adr"
                format="float"
                userById={userById}
              />
              <LeaderboardCard
                title="Most MVPs"
                accent="amber"
                rows={topMvps}
                metric="mvps"
                format="int"
                userById={userById}
              />
            </div>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

function LeaderboardCard({
  title,
  accent,
  rows,
  metric,
  format,
  userById,
}: {
  title: string;
  accent: "amber" | "rose" | "default";
  rows: AggregatedPlayer[];
  metric: keyof Pick<AggregatedPlayer, "avgRating" | "kills" | "adr" | "mvps">;
  format: "rating" | "int" | "float";
  userById: Map<
    string,
    { id: string; username: string; avatarUrl: string | null }
  >;
}) {
  const accentColor =
    accent === "amber"
      ? "text-brand-yellow"
      : accent === "rose"
        ? "text-rose-300"
        : "text-text-muted";

  return (
    <section>
      <h2
        className={`text-[10px] font-mono uppercase tracking-widest font-bold mb-2 ${accentColor}`}
      >
        {title}
      </h2>
      {rows.length === 0 ? (
        <EmptyState compact title="Нет данных" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>#</Th>
              <Th>Игрок</Th>
              <Th align="right">{title.split(" ").at(-1)}</Th>
              <Th align="right">M</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((p, i) => {
              const u = userById.get(p.userId);
              const val = p[metric];
              const tier =
                metric === "avgRating" ? ratingTier(p.avgRating) : null;
              return (
                <Tr key={p.userId}>
                  <Td className="font-mono text-text-muted tabular-nums w-8">
                    {i + 1}
                  </Td>
                  <Td>
                    {u ? (
                      <Link
                        href={`/players/${encodeURIComponent(u.username)}`}
                        className="flex items-center gap-2 hover:text-brand-yellow"
                      >
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt={u.username}
                            className="w-5 h-5 border border-border-default"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-bg-elevated border border-border-default" />
                        )}
                        <span className="truncate">{u.username}</span>
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </Td>
                  <Td
                    align="right"
                    className={`font-mono font-bold tabular-nums ${
                      tier === "great"
                        ? "text-emerald-300"
                        : tier === "good"
                          ? "text-text-primary"
                          : tier === "poor"
                            ? "text-rose-300"
                            : "text-text-primary"
                    }`}
                  >
                    {format === "rating"
                      ? val.toFixed(2)
                      : format === "float"
                        ? val.toFixed(1)
                        : String(Math.round(val))}
                  </Td>
                  <Td
                    align="right"
                    className="text-[11px] font-mono text-text-muted tabular-nums"
                  >
                    {p.matches}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </section>
  );
}
