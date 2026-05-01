export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

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

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      tournament: { select: { name: true, slug: true, game: true } },
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
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

        {/* Player stats */}
        {match.playerStats.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              Статистика игроков
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { team: match.teamA, stats: statsTeamA },
                { team: match.teamB, stats: statsTeamB },
              ].map((side, i) =>
                !side.team || side.stats.length === 0 ? null : (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
                  >
                    <div className="p-3 border-b border-zinc-800 bg-zinc-900/60">
                      <span className="font-bold">{side.team.name}</span>
                      <span className="text-xs font-mono text-zinc-500 ml-2">
                        [{side.team.tag}]
                      </span>
                    </div>
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="text-left p-2 font-normal">Игрок</th>
                          <th className="text-right p-2 font-normal">K</th>
                          <th className="text-right p-2 font-normal">D</th>
                          <th className="text-right p-2 font-normal">A</th>
                          <th className="text-right p-2 font-normal">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {side.stats.map((s) => {
                          const u = userMap.get(s.userId);
                          return (
                            <tr
                              key={s.id}
                              className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                            >
                              <td className="p-2">
                                {u ? (
                                  <Link
                                    href={`/players/${encodeURIComponent(u.username)}`}
                                    className="hover:text-violet-300 font-medium"
                                  >
                                    {u.username}
                                  </Link>
                                ) : (
                                  "—"
                                )}
                                {s.isMvp && (
                                  <span className="ml-2 text-amber-300">⭐</span>
                                )}
                              </td>
                              <td className="text-right p-2 text-zinc-300">
                                {s.kills}
                              </td>
                              <td className="text-right p-2 text-zinc-500">
                                {s.deaths}
                              </td>
                              <td className="text-right p-2 text-zinc-300">
                                {s.assists}
                              </td>
                              <td
                                className={`text-right p-2 font-bold ${
                                  (s.rating ?? 0) >= 1.1
                                    ? "text-emerald-300"
                                    : (s.rating ?? 0) >= 0.9
                                      ? "text-zinc-300"
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
                )
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
