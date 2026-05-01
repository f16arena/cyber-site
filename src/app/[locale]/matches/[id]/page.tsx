export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ClaimResultForm } from "./claim-form";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Запланирован",
  LIVE: "LIVE",
  FINISHED: "Завершён",
  CANCELLED: "Отменён",
  WALKOVER: "Walkover",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-zinc-700/30 text-zinc-300 border-zinc-700",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  CANCELLED: "bg-zinc-700/30 text-zinc-500",
  WALKOVER: "bg-amber-500/15 text-amber-300",
};

function extractTwitchChannel(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Если это URL — выдернем имя канала
  const m = trimmed.match(/twitch\.tv\/([\w-]+)/i);
  if (m) return m[1];
  // Если это просто имя канала
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
        include: {
          // user через userId — нет relation на User в схеме MatchPlayerStat
        },
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

  // Подгружаем имена игроков для статистики
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

  const statsTeamA = match.playerStats.filter((s) => s.teamId === match.teamAId);
  const statsTeamB = match.playerStats.filter((s) => s.teamId === match.teamBId);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
        <Link
          href="/matches"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Матчи
        </Link>

        {/* Hero */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-6 mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${STATUS_COLOR[match.status]}`}
            >
              {STATUS_LABEL[match.status]}
              {match.status === "LIVE" && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
            </span>
            {match.tournament && (
              <Link
                href={`/tournaments/${match.tournament.slug}`}
                className="text-[10px] font-mono text-zinc-400 hover:text-violet-300"
              >
                {match.tournament.name}
              </Link>
            )}
            {match.stage && (
              <span className="text-[10px] font-mono text-zinc-500">
                · {match.stage} · BO{match.bestOf}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-right">
              <div className="text-xl sm:text-3xl font-black tracking-tight">
                {match.teamA?.name ?? "TBD"}
              </div>
              <div className="text-xs font-mono text-zinc-500">
                [{match.teamA?.tag ?? "—"}]
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-black font-mono">
                <span
                  className={
                    match.scoreA > match.scoreB
                      ? "text-emerald-400"
                      : "text-zinc-500"
                  }
                >
                  {match.scoreA}
                </span>
                <span className="text-zinc-700 mx-2">:</span>
                <span
                  className={
                    match.scoreB > match.scoreA
                      ? "text-emerald-400"
                      : "text-zinc-500"
                  }
                >
                  {match.scoreB}
                </span>
              </div>
              {match.map && (
                <div className="text-[10px] font-mono text-zinc-500 mt-1">
                  {match.map}
                </div>
              )}
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black tracking-tight">
                {match.teamB?.name ?? "TBD"}
              </div>
              <div className="text-xs font-mono text-zinc-500">
                [{match.teamB?.tag ?? "—"}]
              </div>
            </div>
          </div>

          {match.startsAt && match.status === "SCHEDULED" && (
            <div className="text-center text-xs font-mono text-zinc-400 mt-4">
              Старт:{" "}
              {new Date(match.startsAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Captain claim form (only for SCHEDULED/LIVE) */}
        {isCaptainHere && match.status !== "FINISHED" && match.status !== "CANCELLED" && (
          <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">
              Заявить результат матча
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Введи итоговый счёт. Если оба капитана введут одинаковый счёт —
              результат зафиксируется автоматически. Иначе — админ разберёт.
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
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              LIVE TRANSLATION
            </h2>
            <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
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
          <section className="mb-8">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 flex items-center gap-4">
              <div className="text-3xl">⭐</div>
              <div className="flex-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 mb-1">
                  MVP матча
                </div>
                <Link
                  href={`/players/${encodeURIComponent(match.mvp.user.username)}`}
                  className="text-xl font-black hover:text-amber-200"
                >
                  {match.mvp.user.username}
                </Link>
                {match.mvp.comment && (
                  <p className="text-sm text-zinc-300 mt-1">
                    {match.mvp.comment}
                  </p>
                )}
              </div>
              {match.mvp.user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.mvp.user.avatarUrl}
                  alt={match.mvp.user.username}
                  className="w-16 h-16 rounded border border-amber-500/30"
                />
              )}
            </div>
          </section>
        )}

        {/* Player stats — HLTV-style scoreboard */}
        {match.playerStats.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              Scoreboard
            </h2>
            <div className="space-y-4">
              {[
                { team: match.teamA, stats: statsTeamA },
                { team: match.teamB, stats: statsTeamB },
              ].map((side, i) =>
                !side.team || side.stats.length === 0 ? null : (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                      <div>
                        <span className="font-bold">{side.team.name}</span>
                        <span className="text-xs font-mono text-zinc-500 ml-2">
                          [{side.team.tag}]
                        </span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">
                        {side.stats.reduce((a, s) => a + s.kills, 0)}–
                        {side.stats.reduce((a, s) => a + s.deaths, 0)} K–D
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono min-w-[640px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            <th className="text-left px-3 py-2 font-normal">Игрок</th>
                            <th className="text-right px-2 py-2 font-normal">K</th>
                            <th className="text-right px-2 py-2 font-normal">D</th>
                            <th className="text-right px-2 py-2 font-normal">A</th>
                            <th className="text-right px-2 py-2 font-normal">±</th>
                            <th className="text-right px-2 py-2 font-normal">ADR</th>
                            <th className="text-right px-2 py-2 font-normal">HS%</th>
                            <th className="text-right px-2 py-2 font-normal">KAST</th>
                            <th className="text-right px-3 py-2 font-normal">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {side.stats.map((s) => {
                            const u = userMap.get(s.userId);
                            const extra = (s.extra ?? {}) as Record<string, number>;
                            const diff = s.kills - s.deaths;
                            return (
                              <tr
                                key={s.id}
                                className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {u?.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={u.avatarUrl}
                                        alt={u.username}
                                        className="w-6 h-6 rounded border border-zinc-700"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded bg-violet-500/20 border border-violet-500/30" />
                                    )}
                                    {u ? (
                                      <Link
                                        href={`/players/${encodeURIComponent(u.username)}`}
                                        className="hover:text-violet-300 font-medium font-sans"
                                      >
                                        {u.username}
                                      </Link>
                                    ) : (
                                      "—"
                                    )}
                                    {s.isMvp && (
                                      <span className="text-amber-300" title="MVP">⭐</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right px-2 py-2 text-zinc-200">{s.kills}</td>
                                <td className="text-right px-2 py-2 text-zinc-500">{s.deaths}</td>
                                <td className="text-right px-2 py-2 text-zinc-300">{s.assists}</td>
                                <td
                                  className={`text-right px-2 py-2 ${
                                    diff > 0
                                      ? "text-emerald-300"
                                      : diff < 0
                                        ? "text-rose-400"
                                        : "text-zinc-400"
                                  }`}
                                >
                                  {diff > 0 ? `+${diff}` : diff}
                                </td>
                                <td className="text-right px-2 py-2 text-zinc-400">
                                  {extra.adr ? extra.adr.toFixed(0) : "—"}
                                </td>
                                <td className="text-right px-2 py-2 text-zinc-400">
                                  {extra.hsPct ? `${extra.hsPct.toFixed(0)}%` : "—"}
                                </td>
                                <td className="text-right px-2 py-2 text-zinc-400">
                                  {extra.kast ? `${extra.kast.toFixed(0)}%` : "—"}
                                </td>
                                <td
                                  className={`text-right px-3 py-2 font-bold ${
                                    (s.rating ?? 0) >= 1.1
                                      ? "text-emerald-300"
                                      : (s.rating ?? 0) >= 0.9
                                        ? "text-zinc-200"
                                        : "text-rose-400"
                                  }`}
                                >
                                  {(s.rating ?? 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-3">
              Rating = (K/D)*0.5 + (ADR/100)*0.3 + (KAST/100)*0.2 · упрощённая HLTV-формула
            </p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
