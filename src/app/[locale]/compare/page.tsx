export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Сравнить игроков — Esports.kz",
  description: "Side-by-side сравнение статистики двух игроков КЗ.",
};

async function loadStats(username: string) {
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      region: true,
      profiles: { select: { game: true, inGameRole: true, rank: true } },
      mvpAwards: { select: { id: true } },
    },
  });
  if (!user) return null;

  const stats = await prisma.matchPlayerStat.aggregate({
    where: { userId: user.id },
    _sum: { kills: true, deaths: true, assists: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const totalKills = stats._sum.kills ?? 0;
  const totalDeaths = stats._sum.deaths ?? 0;
  const totalAssists = stats._sum.assists ?? 0;
  const matchesPlayed = stats._count._all;

  return {
    user,
    matchesPlayed,
    totalKills,
    totalDeaths,
    totalAssists,
    kdRatio: totalDeaths > 0 ? totalKills / totalDeaths : totalKills,
    avgRating: stats._avg.rating ?? 0,
    mvps: user.mvpAwards.length,
    games: user.profiles.map((p) => p.game).join(" · "),
  };
}

type Stats = NonNullable<Awaited<ReturnType<typeof loadStats>>>;

function diffClass(a: number, b: number, higherIsBetter = true): string {
  if (a === b) return "text-zinc-400";
  const aBetter = higherIsBetter ? a > b : a < b;
  return aBetter ? "text-emerald-300" : "text-rose-400";
}

function StatRow({
  label,
  a,
  b,
  format = (v: number) => v.toString(),
  higherIsBetter = true,
}: {
  label: string;
  a: number;
  b: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  return (
    <tr className="border-t border-zinc-800/50">
      <td
        className={`text-right px-4 py-3 font-bold font-mono ${diffClass(a, b, higherIsBetter)}`}
      >
        {format(a)}
      </td>
      <td className="text-center px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        {label}
      </td>
      <td
        className={`text-left px-4 py-3 font-bold font-mono ${diffClass(b, a, higherIsBetter)}`}
      >
        {format(b)}
      </td>
    </tr>
  );
}

function PlayerCard({ s, side }: { s: Stats; side: "a" | "b" }) {
  return (
    <div className={`text-${side === "a" ? "right" : "left"}`}>
      {s.user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.user.avatarUrl}
          alt={s.user.username}
          className={`w-20 h-20 rounded-lg border border-violet-500/30 ${side === "a" ? "ml-auto" : ""}`}
        />
      ) : (
        <div
          className={`w-20 h-20 rounded-lg bg-violet-500/20 border border-violet-500/30 ${side === "a" ? "ml-auto" : ""}`}
        />
      )}
      <Link
        href={`/players/${encodeURIComponent(s.user.username)}`}
        className="block text-2xl font-black tracking-tight mt-3 hover:text-violet-200"
      >
        {s.user.username}
      </Link>
      <div className="text-xs font-mono text-zinc-500 mt-1">{s.games}</div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: aParam, b: bParam } = await searchParams;
  const aName = (aParam || "").trim();
  const bName = (bParam || "").trim();

  const [a, b] = await Promise.all([
    aName ? loadStats(aName) : Promise.resolve(null),
    bName ? loadStats(bName) : Promise.resolve(null),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
        <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
          // VS
        </p>
        <h1 className="text-4xl font-display font-black tracking-tighter mb-2">
          Сравнить игроков
        </h1>
        <p className="text-zinc-400 mb-8">
          Введи два ника и сравни статистику side-by-side.
        </p>

        <form className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-10">
          <input
            type="text"
            name="a"
            defaultValue={aName}
            placeholder="Ник игрока A"
            className="bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400"
          />
          <span className="text-center text-zinc-600 font-mono">vs</span>
          <input
            type="text"
            name="b"
            defaultValue={bName}
            placeholder="Ник игрока B"
            className="bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400"
          />
          <button
            type="submit"
            className="sm:col-span-3 mt-2 h-11 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
          >
            Сравнить
          </button>
        </form>

        {(aName || bName) && (!a || !b) && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 p-4 text-sm mb-6">
            {!a && aName && <p>Игрок «{aName}» не найден.</p>}
            {!b && bName && <p>Игрок «{bName}» не найден.</p>}
          </div>
        )}

        {a && b && (
          <div className="rounded-xl border border-violet-500/20 bg-zinc-900/40 overflow-hidden">
            <div className="grid grid-cols-2 p-6 gap-4 border-b border-zinc-800">
              <PlayerCard s={a} side="a" />
              <PlayerCard s={b} side="b" />
            </div>
            <table className="w-full text-sm">
              <tbody>
                <StatRow label="Матчей" a={a.matchesPlayed} b={b.matchesPlayed} />
                <StatRow label="MVP" a={a.mvps} b={b.mvps} />
                <StatRow label="Kills" a={a.totalKills} b={b.totalKills} />
                <StatRow
                  label="Deaths"
                  a={a.totalDeaths}
                  b={b.totalDeaths}
                  higherIsBetter={false}
                />
                <StatRow label="Assists" a={a.totalAssists} b={b.totalAssists} />
                <StatRow
                  label="K/D Ratio"
                  a={a.kdRatio}
                  b={b.kdRatio}
                  format={(v) => v.toFixed(2)}
                />
                <StatRow
                  label="Avg Rating"
                  a={a.avgRating}
                  b={b.avgRating}
                  format={(v) => v.toFixed(2)}
                />
              </tbody>
            </table>
          </div>
        )}

        {!aName && !bName && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            <p className="text-sm">Введи ники выше и нажми «Сравнить».</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
