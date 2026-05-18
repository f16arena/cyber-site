export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ClaimResultForm } from "./claim-form";
import { LiveAutoRefresh } from "@/components/LiveAutoRefresh";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import type { MatchStatus } from "@prisma/client";

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Запланирован",
  LIVE: "LIVE",
  FINISHED: "Завершён",
  CANCELLED: "Отменён",
  WALKOVER: "Walkover",
};

function statusVariant(s: MatchStatus) {
  switch (s) {
    case "LIVE":
      return "live" as const;
    case "FINISHED":
      return "finished" as const;
    case "SCHEDULED":
      return "upcoming" as const;
    default:
      return "default" as const;
  }
}

function extractTwitchChannel(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/twitch\.tv\/([\w-]+)/i);
  if (m) return m[1];
  if (/^[\w-]+$/.test(trimmed)) return trimmed;
  return null;
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUser();
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      tournament: { select: { name: true, slug: true, game: true } },
      teamA: { select: { id: true, name: true, tag: true, captainId: true } },
      teamB: { select: { id: true, name: true, tag: true, captainId: true } },
      mvp: {
        include: {
          user: { select: { username: true, avatarUrl: true } },
        },
      },
      playerStats: {
        orderBy: { rating: "desc" },
      },
    },
  });

  if (!match) notFound();

  const isCaptainHere =
    me?.id === match.teamA?.captainId || me?.id === match.teamB?.captainId;
  const claims = isCaptainHere
    ? await prisma.matchResultClaim.findMany({
        where: { matchId: match.id },
      })
    : [];

  const userIds = match.playerStats.map((s) => s.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatarUrl: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const twitchChannel = extractTwitchChannel(match.twitchChannel);
  const twitchParent =
    process.env.SITE_URL?.replace(/^https?:\/\//, "") || "localhost";

  const statsTeamA = match.playerStats.filter(
    (s) => s.teamId === match.teamAId
  );
  const statsTeamB = match.playerStats.filter(
    (s) => s.teamId === match.teamBId
  );

  return (
    <>
      <SiteHeader />
      <LiveAutoRefresh enabled={match.status === "LIVE"} />
      <main className="flex-1">
        <PageContainer maxWidth="wide" className="py-6">
          <Link
            href="/matches"
            className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-4"
          >
            ← Матчи
          </Link>

          {/* Hero */}
          <div className="rounded border border-border-default bg-bg-panel p-5 mb-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant={statusVariant(match.status)} size="md">
                {STATUS_LABEL[match.status]}
              </Badge>
              {match.tournament && (
                <Link
                  href={`/tournaments/${match.tournament.slug}`}
                  className="text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover"
                >
                  {match.tournament.name}
                </Link>
              )}
              {match.stage && (
                <span className="text-[11px] font-mono text-text-muted">
                  · {match.stage} · BO{match.bestOf}
                </span>
              )}
              {match.vetoStartedAt && (
                <Link
                  href={`/matches/${match.id}/veto`}
                  className="ml-auto text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover"
                >
                  Pick/Ban »
                </Link>
              )}
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              <div className="text-right">
                <div className="text-base sm:text-xl font-bold tracking-tight">
                  {match.teamA?.name ?? "TBD"}
                </div>
                <div className="text-[11px] font-mono text-text-muted">
                  [{match.teamA?.tag ?? "—"}]
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold font-mono tabular-nums">
                  <span
                    className={
                      match.scoreA > match.scoreB
                        ? "text-brand-yellow"
                        : "text-text-muted"
                    }
                  >
                    {match.scoreA}
                  </span>
                  <span className="text-text-muted mx-2">:</span>
                  <span
                    className={
                      match.scoreB > match.scoreA
                        ? "text-brand-yellow"
                        : "text-text-muted"
                    }
                  >
                    {match.scoreB}
                  </span>
                </div>
                {match.map && (
                  <div className="text-[10px] font-mono text-text-muted mt-1">
                    {match.map}
                  </div>
                )}
              </div>
              <div>
                <div className="text-base sm:text-xl font-bold tracking-tight">
                  {match.teamB?.name ?? "TBD"}
                </div>
                <div className="text-[11px] font-mono text-text-muted">
                  [{match.teamB?.tag ?? "—"}]
                </div>
              </div>
            </div>

            {match.startsAt && match.status === "SCHEDULED" && (
              <div className="text-center text-[11px] font-mono text-text-secondary mt-4">
                Старт:{" "}
                {new Date(match.startsAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            {match.connectString &&
              (match.status === "SCHEDULED" || match.status === "LIVE") && (
                <div className="mt-4 pt-3 border-t border-border-default flex flex-wrap items-center gap-2 justify-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                    Подключиться:
                  </span>
                  <code className="text-[11px] font-mono text-text-primary bg-bg-elevated px-2 py-1 rounded-sm">
                    {match.connectString}
                  </code>
                </div>
              )}
          </div>

          {/* Captain claim form */}
          {isCaptainHere &&
            match.status !== "FINISHED" &&
            match.status !== "CANCELLED" && (
              <section className="mb-5 rounded border border-brand-yellow/40 bg-bg-panel p-4">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-2">
                  Заявить результат
                </h2>
                <p className="text-[12px] text-text-secondary mb-3">
                  Если оба капитана введут одинаковый счёт — результат
                  зафиксируется автоматически. Иначе — админ разберёт.
                </p>
                <ClaimResultForm
                  matchId={match.id}
                  tagA={match.teamA?.tag ?? "A"}
                  tagB={match.teamB?.tag ?? "B"}
                  currentClaim={
                    me &&
                    claims.find(
                      (c) =>
                        c.teamId ===
                        (me.id === match.teamA?.captainId
                          ? match.teamAId
                          : match.teamBId)
                    )
                  }
                  opponentClaimed={
                    me &&
                    claims.some(
                      (c) =>
                        c.teamId !==
                        (me.id === match.teamA?.captainId
                          ? match.teamAId
                          : match.teamBId)
                    )
                  }
                  hasDispute={claims.some((c) => c.status === "DISPUTED")}
                />
              </section>
            )}

          {/* Twitch player */}
          {twitchChannel && (
            <section className="mb-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-2 flex items-center gap-1.5">
                <span className="live-dot" />
                LIVE TRANSLATION
              </h2>
              <div className="aspect-video rounded border border-border-default overflow-hidden">
                <iframe
                  src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=${twitchParent}&parent=localhost`}
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </section>
          )}

          {/* MVP */}
          {match.mvp && match.mvp.user && (
            <section className="mb-5">
              <div className="rounded border border-brand-yellow/40 bg-bg-panel p-4 flex items-center gap-3">
                <div className="text-2xl">⭐</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-0.5">
                    MVP матча
                  </div>
                  <Link
                    href={`/players/${encodeURIComponent(match.mvp.user.username)}`}
                    className="text-base font-bold hover:text-brand-yellow"
                  >
                    {match.mvp.user.username}
                  </Link>
                  {match.mvp.comment && (
                    <p className="text-[12px] text-text-secondary mt-1">
                      {match.mvp.comment}
                    </p>
                  )}
                </div>
                {match.mvp.user.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={match.mvp.user.avatarUrl}
                    alt={match.mvp.user.username}
                    className="w-12 h-12 border border-brand-yellow/40"
                  />
                )}
              </div>
            </section>
          )}

          {/* Player stats */}
          {match.playerStats.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
                Scoreboard
              </h2>
              <div className="space-y-3">
                {[
                  { team: match.teamA, stats: statsTeamA },
                  { team: match.teamB, stats: statsTeamB },
                ].map((side, i) =>
                  !side.team || side.stats.length === 0 ? null : (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1 text-[12px]">
                        <div>
                          <span className="font-semibold">
                            {side.team.name}
                          </span>
                          <span className="font-mono text-text-muted ml-2">
                            [{side.team.tag}]
                          </span>
                        </div>
                        <span className="font-mono text-text-muted">
                          {side.stats.reduce((a, s) => a + s.kills, 0)}–
                          {side.stats.reduce((a, s) => a + s.deaths, 0)} K–D
                        </span>
                      </div>
                      <Table className="text-[12px]">
                        <Thead>
                          <Tr>
                            <Th>Игрок</Th>
                            <Th align="right">K</Th>
                            <Th align="right">D</Th>
                            <Th align="right">A</Th>
                            <Th align="right">±</Th>
                            <Th align="right">ADR</Th>
                            <Th align="right">HS%</Th>
                            <Th align="right">KAST</Th>
                            <Th align="right">Rtg</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {side.stats.map((s) => {
                            const u = userMap.get(s.userId);
                            const extra = (s.extra ?? {}) as Record<
                              string,
                              number
                            >;
                            const diff = s.kills - s.deaths;
                            const rating = s.rating ?? 0;
                            return (
                              <Tr key={s.id} interactive>
                                <Td>
                                  <div className="flex items-center gap-2">
                                    {u?.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={u.avatarUrl}
                                        alt={u.username}
                                        className="w-5 h-5 border border-border-default"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 bg-bg-elevated border border-border-default" />
                                    )}
                                    {u ? (
                                      <Link
                                        href={`/players/${encodeURIComponent(u.username)}`}
                                        className="hover:text-brand-yellow font-medium"
                                      >
                                        {u.username}
                                      </Link>
                                    ) : (
                                      <span className="text-text-muted">—</span>
                                    )}
                                    {s.isMvp && (
                                      <span
                                        className="text-brand-yellow"
                                        title="MVP"
                                      >
                                        ★
                                      </span>
                                    )}
                                  </div>
                                </Td>
                                <Td align="right" className="font-mono">
                                  {s.kills}
                                </Td>
                                <Td
                                  align="right"
                                  className="font-mono text-text-muted"
                                >
                                  {s.deaths}
                                </Td>
                                <Td
                                  align="right"
                                  className="font-mono text-text-secondary"
                                >
                                  {s.assists}
                                </Td>
                                <Td
                                  align="right"
                                  className={`font-mono ${
                                    diff > 0
                                      ? "text-emerald-300"
                                      : diff < 0
                                        ? "text-rose-300"
                                        : "text-text-muted"
                                  }`}
                                >
                                  {diff > 0 ? `+${diff}` : diff}
                                </Td>
                                <Td
                                  align="right"
                                  className="font-mono text-text-secondary"
                                >
                                  {extra.adr ? extra.adr.toFixed(0) : "—"}
                                </Td>
                                <Td
                                  align="right"
                                  className="font-mono text-text-secondary"
                                >
                                  {extra.hsPct
                                    ? `${extra.hsPct.toFixed(0)}%`
                                    : "—"}
                                </Td>
                                <Td
                                  align="right"
                                  className="font-mono text-text-secondary"
                                >
                                  {extra.kast
                                    ? `${extra.kast.toFixed(0)}%`
                                    : "—"}
                                </Td>
                                <Td
                                  align="right"
                                  className={`font-mono font-bold ${
                                    rating >= 1.15
                                      ? "text-emerald-300"
                                      : rating >= 0.85
                                        ? "text-text-primary"
                                        : "text-rose-300"
                                  }`}
                                >
                                  {rating.toFixed(2)}
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </div>
                  )
                )}
              </div>
              <p className="text-[10px] font-mono text-text-muted mt-2">
                Rating ≈ (K/D)·0.5 + (ADR/100)·0.3 + (KAST/100)·0.2 ·
                упрощённая HLTV-формула
              </p>
            </section>
          )}

          {/* Veto link if active */}
          {match.vetoStartedAt && !match.map && (
            <section className="mt-5 rounded border border-brand-yellow/40 bg-brand-yellow/5 p-4">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-2">
                Pick/Ban в процессе
              </h2>
              <Link href={`/matches/${match.id}/veto`}>
                <Button size="md">Открыть pick/ban</Button>
              </Link>
            </section>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
