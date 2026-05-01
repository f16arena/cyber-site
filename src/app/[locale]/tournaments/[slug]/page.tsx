export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TournamentBracket } from "./bracket";
import { ShareButtons } from "@/components/ShareButtons";
import { Markdown } from "@/components/Markdown";
import type { BracketSide } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION_OPEN: "Регистрация открыта",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  ONGOING: "Идёт",
  COMPLETED: "Завершён",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, description: true, bannerUrl: true, game: true, prize: true },
  });
  if (!t) return { title: "Турнир не найден" };
  const prizeKzt = Number(t.prize) / 100;
  const description =
    t.description ||
    `${t.game} турнир в Казахстане. Призовой фонд: ${prizeKzt.toLocaleString("ru-RU")} ₸.`;
  return {
    title: t.name,
    description,
    openGraph: {
      title: t.name,
      description,
      type: "website",
      images: t.bannerUrl ? [{ url: t.bannerUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: t.name,
      description,
      images: t.bannerUrl ? [t.bannerUrl] : undefined,
    },
  };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      registrations: {
        include: {
          team: { select: { id: true, name: true, tag: true } },
        },
      },
      matches: {
        include: {
          teamA: { select: { name: true, tag: true } },
          teamB: { select: { name: true, tag: true } },
        },
        orderBy: [
          { bracketSide: "asc" },
          { round: "asc" },
          { bracketPosition: "asc" },
        ],
      },
    },
  });

  if (!tournament || tournament.status === "DRAFT") notFound();

  // Для COMPLETED — собираем итоговую таблицу
  let results: {
    winner: { name: string; tag: string } | null;
    runnerUp: { name: string; tag: string } | null;
    mvp: { username: string; avatarUrl: string | null; mvpCount: number } | null;
    topFragger: { username: string; kills: number } | null;
  } | null = null;

  if (tournament.status === "COMPLETED") {
    // Grand final = последний матч с максимальным round среди UB
    const grandFinal = [...tournament.matches]
      .filter((m) => m.status === "FINISHED" && m.winnerId)
      .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];

    let winner: { name: string; tag: string } | null = null;
    let runnerUp: { name: string; tag: string } | null = null;
    if (grandFinal) {
      const wId = grandFinal.winnerId;
      const winnerTeam =
        wId === grandFinal.teamA?.tag
          ? grandFinal.teamA
          : grandFinal.teamA && wId
            ? grandFinal.teamA
            : grandFinal.teamB;
      const a = grandFinal.teamA;
      const b = grandFinal.teamB;
      // Простой winner pick
      const aWon = grandFinal.scoreA > grandFinal.scoreB;
      winner = aWon ? a : b;
      runnerUp = aWon ? b : a;
    }

    const tournamentMvps = await prisma.mvpAward.findMany({
      where: { tournamentId: tournament.id },
      include: { user: { select: { username: true, avatarUrl: true } } },
    });
    const mvpCount = new Map<string, { username: string; avatarUrl: string | null; count: number }>();
    for (const a of tournamentMvps) {
      const cur = mvpCount.get(a.userId);
      if (cur) cur.count++;
      else
        mvpCount.set(a.userId, {
          username: a.user.username,
          avatarUrl: a.user.avatarUrl,
          count: 1,
        });
    }
    const topMvp = Array.from(mvpCount.values()).sort((a, b) => b.count - a.count)[0];

    const matchIds = tournament.matches.map((m) => m.id);
    const fragStats = matchIds.length
      ? await prisma.matchPlayerStat.groupBy({
          by: ["userId"],
          where: { matchId: { in: matchIds } },
          _sum: { kills: true },
          orderBy: { _sum: { kills: "desc" } },
          take: 1,
        })
      : [];
    const topFragUser = fragStats[0]
      ? await prisma.user.findUnique({
          where: { id: fragStats[0].userId },
          select: { username: true },
        })
      : null;

    results = {
      winner,
      runnerUp,
      mvp: topMvp
        ? { username: topMvp.username, avatarUrl: topMvp.avatarUrl, mvpCount: topMvp.count }
        : null,
      topFragger:
        topFragUser && fragStats[0]
          ? { username: topFragUser.username, kills: fragStats[0]._sum.kills ?? 0 }
          : null,
    };
  }

  const matches = tournament.matches.map((m) => ({
    id: m.id,
    side: (m.bracketSide ?? "UPPER") as BracketSide,
    round: m.round ?? 1,
    position: m.bracketPosition ?? 1,
    teamA: m.teamA?.name ?? null,
    teamB: m.teamB?.name ?? null,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    stage: m.stage ?? null,
  }));

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <Link
          href="/tournaments"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Турниры
        </Link>

        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-8 mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
              {tournament.game}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {STATUS_LABEL[tournament.status] || tournament.status}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {tournament.format}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
            {tournament.name}
          </h1>
          <div className="grid sm:grid-cols-4 gap-4 mt-6">
            <Stat label="Призовой" value={`₸ ${(Number(tournament.prize) / 100).toLocaleString("ru-RU")}`} accent="text-amber-300" />
            <Stat label="Команды" value={`${tournament.registrations.length}/${tournament.maxTeams}`} />
            <Stat
              label="Старт"
              value={
                tournament.startsAt
                  ? new Date(tournament.startsAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"
              }
            />
            <Stat label="Матчей" value={String(tournament.matches.length)} />
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-800/60">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Поделиться
            </p>
            <ShareButtons
              path={`/tournaments/${tournament.slug}`}
              title={tournament.name}
              text={`${tournament.name} — киберспорт КЗ. Призовой ₸${(Number(tournament.prize) / 100).toLocaleString("ru-RU")}`}
            />
          </div>
        </div>

        {/* Results — только для завершённых турниров */}
        {results && (results.winner || results.mvp) && (
          <section className="mb-8 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent p-6">
            <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-3">
              🏆 Итоги турнира
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {results.winner && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
                    🥇 1 место
                  </div>
                  <div className="text-xl font-black tracking-tight">
                    {results.winner.name}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    [{results.winner.tag}]
                  </div>
                </div>
              )}
              {results.runnerUp && (
                <div className="rounded-lg border border-zinc-300/30 bg-zinc-500/10 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-300 mb-1">
                    🥈 2 место
                  </div>
                  <div className="text-xl font-black tracking-tight">
                    {results.runnerUp.name}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    [{results.runnerUp.tag}]
                  </div>
                </div>
              )}
              {results.mvp && (
                <Link
                  href={`/players/${encodeURIComponent(results.mvp.username)}`}
                  className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
                    ⭐ MVP турнира
                  </div>
                  <div className="text-xl font-black tracking-tight truncate">
                    {results.mvp.username}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    {results.mvp.mvpCount} MVP-наград
                  </div>
                </Link>
              )}
              {results.topFragger && (
                <Link
                  href={`/players/${encodeURIComponent(results.topFragger.username)}`}
                  className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 hover:bg-rose-500/15 transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-1">
                    🎯 Top fragger
                  </div>
                  <div className="text-xl font-black tracking-tight truncate">
                    {results.topFragger.username}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    {results.topFragger.kills} убийств
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Bracket */}
        {tournament.matches.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Сетка турнира
            </h2>
            <TournamentBracket matches={matches} />
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 mb-8">
            <p className="font-bold mb-2 text-zinc-300">Сетка ещё не сгенерирована</p>
            <p className="text-sm">
              Появится после закрытия регистрации и жеребьёвки.
            </p>
          </section>
        )}

        {/* Teams list */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
            Участники ({tournament.registrations.length})
          </h2>
          {tournament.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Команды ещё не зарегистрированы.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tournament.registrations.map((r) => (
                <Link
                  key={r.id}
                  href={`/teams/${r.team.tag}`}
                  className="rounded border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 p-3 text-sm font-medium"
                >
                  {r.team.name}
                  <span className="text-xs font-mono text-zinc-500 ml-1">
                    [{r.team.tag}]
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {tournament.description && (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              О турнире
            </h2>
            <Markdown source={tournament.description} />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-black ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
