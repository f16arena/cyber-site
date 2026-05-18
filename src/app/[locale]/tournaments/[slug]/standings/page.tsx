export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { computeStandings, type MatchRow } from "@/lib/standings";

export default async function TournamentStandingsPage({
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
      format: true,
      status: true,
    },
  });
  if (!tournament) notFound();

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
      teamAId: true,
      teamBId: true,
      scoreA: true,
      scoreB: true,
      winnerId: true,
      status: true,
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
    },
    orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
  });

  const rows: MatchRow[] = matches.map((m) => ({
    id: m.id,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerId: m.winnerId,
    status: m.status,
  }));

  const standings = computeStandings(rows);

  // Подгружаем имена команд
  const teamIds = standings.map((s) => s.teamId);
  const teams = teamIds.length
    ? await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true, tag: true, logoUrl: true },
      })
    : [];
  const teamById = new Map(teams.map((t) => [t.id, t]));

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
              {tournament.format}
            </Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Турнирная таблица
          </h1>
          <p className="text-[13px] text-text-secondary mb-5">
            Очки: 3 за победу, 1 за ничью, 0 за поражение. Tiebreaker:
            разница раундов, забитые раунды.
          </p>

          {standings.length === 0 ? (
            <EmptyState
              title="Таблица пуста"
              description="Появится после первых сыгранных матчей."
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>#</Th>
                  <Th>Команда</Th>
                  <Th align="right">И</Th>
                  <Th align="right">В</Th>
                  <Th align="right">Н</Th>
                  <Th align="right">П</Th>
                  <Th align="right">±</Th>
                  <Th align="right">Очки</Th>
                </Tr>
              </Thead>
              <Tbody>
                {standings.map((s, i) => {
                  const t = teamById.get(s.teamId);
                  return (
                    <Tr key={s.teamId}>
                      <Td
                        className={`font-mono tabular-nums w-6 ${
                          i === 0
                            ? "text-brand-yellow font-bold"
                            : i < 3
                              ? "text-text-primary"
                              : "text-text-muted"
                        }`}
                      >
                        {i + 1}
                      </Td>
                      <Td>
                        {t ? (
                          <Link
                            href={`/teams/${t.tag}`}
                            className="flex items-center gap-2 hover:text-brand-yellow"
                          >
                            {t.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={t.logoUrl}
                                alt={t.name}
                                className="w-5 h-5 border border-border-default"
                              />
                            ) : (
                              <div className="w-5 h-5 bg-bg-elevated border border-border-default" />
                            )}
                            <span className="truncate">{t.name}</span>
                          </Link>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </Td>
                      <Td align="right" className="font-mono tabular-nums">
                        {s.played}
                      </Td>
                      <Td
                        align="right"
                        className="font-mono tabular-nums text-emerald-300"
                      >
                        {s.wins}
                      </Td>
                      <Td align="right" className="font-mono tabular-nums">
                        {s.draws}
                      </Td>
                      <Td
                        align="right"
                        className="font-mono tabular-nums text-rose-300"
                      >
                        {s.losses}
                      </Td>
                      <Td
                        align="right"
                        className={`font-mono tabular-nums ${
                          s.diff > 0
                            ? "text-emerald-300"
                            : s.diff < 0
                              ? "text-rose-300"
                              : "text-text-muted"
                        }`}
                      >
                        {s.diff > 0 ? `+${s.diff}` : s.diff}
                      </Td>
                      <Td
                        align="right"
                        className="font-mono tabular-nums font-bold text-brand-yellow"
                      >
                        {s.points}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
