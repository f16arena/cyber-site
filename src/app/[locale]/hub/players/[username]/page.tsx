export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LevelBadge } from "@/components/hub/LevelBadge";
import { displayNameFor } from "@/lib/hub/maps";
import { levelFor } from "@/lib/hub/level";

function formatRelative(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-black tabular-nums ${accent ?? "text-zinc-100"}`}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{hint}</div>
      )}
    </div>
  );
}

/**
 * Простой ASCII-sparkline для последних 20 ELO-точек.
 */
function EloSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 200;
  const height = 50;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-orange-300"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default async function HubPlayerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      steamId: true,
      username: true,
      avatarUrl: true,
      hubElo: true,
      hubWins: true,
      hubLosses: true,
      hubMatchesPlayed: true,
      hubBannedUntil: true,
      hubCooldownUntil: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  const lvl = levelFor(user.hubElo);

  // Последние 20 ELO-событий — для sparkline
  const eloHistory = await prisma.hubEloHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { delta: true, before: true, after: true, createdAt: true },
  });
  const eloValues = eloHistory
    .slice()
    .reverse()
    .map((h) => h.after);

  // Последние матчи + winrate per map
  const recentMatches = await prisma.hubMatch.findMany({
    where: {
      OR: [
        { teamAPlayerIds: { has: user.steamId } },
        { teamBPlayerIds: { has: user.steamId } },
      ],
      state: "FINISHED",
    },
    orderBy: { finishedAt: "desc" },
    take: 20,
    select: {
      id: true,
      map: true,
      scoreA: true,
      scoreB: true,
      winner: true,
      teamAPlayerIds: true,
      finishedAt: true,
    },
  });

  // Winrate per map
  const mapStats = new Map<string, { wins: number; losses: number }>();
  for (const m of recentMatches) {
    const wasA = m.teamAPlayerIds.includes(user.steamId);
    const won = m.winner === (wasA ? "A" : "B");
    const cur = mapStats.get(m.map) ?? { wins: 0, losses: 0 };
    if (won) cur.wins += 1;
    else cur.losses += 1;
    mapStats.set(m.map, cur);
  }
  const mapStatsArr = Array.from(mapStats.entries())
    .map(([map, s]) => ({
      map,
      wins: s.wins,
      losses: s.losses,
      winrate: Math.round((s.wins / (s.wins + s.losses)) * 100),
      total: s.wins + s.losses,
    }))
    .sort((a, b) => b.total - a.total);

  const winrate =
    user.hubWins + user.hubLosses === 0
      ? null
      : Math.round((user.hubWins / (user.hubWins + user.hubLosses)) * 100);

  const now = new Date();
  const isBanned = user.hubBannedUntil && user.hubBannedUntil > now;
  const isCooldown =
    !isBanned && user.hubCooldownUntil && user.hubCooldownUntil > now;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 flex items-center gap-6 flex-wrap">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-24 h-24 rounded-xl border-2 border-orange-500/40 object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-zinc-800 border-2 border-orange-500/40 flex items-center justify-center font-black text-3xl text-zinc-500">
            {user.username[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
            F16 HUB · CS2 Player
          </div>
          <h1 className="text-3xl font-black tracking-tight truncate flex items-center gap-3">
            <span className="truncate">{user.username}</span>
            <LevelBadge elo={user.hubElo} size="lg" />
          </h1>
          <div className="text-xs font-mono text-zinc-500 mt-1">
            SteamID64: {user.steamId} · в hub с{" "}
            {user.createdAt.toLocaleDateString("ru-RU")}
          </div>
          {isBanned && (
            <div className="mt-2 inline-block text-[10px] font-mono font-bold px-2 py-1 rounded border bg-rose-500/15 text-rose-300 border-rose-500/40">
              BANNED до {user.hubBannedUntil!.toLocaleString("ru-RU")}
            </div>
          )}
          {isCooldown && (
            <div className="mt-2 inline-block text-[10px] font-mono font-bold px-2 py-1 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
              COOLDOWN до{" "}
              {user.hubCooldownUntil!.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
        {eloValues.length >= 2 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              ELO · последние {eloValues.length} матчей
            </div>
            <EloSparkline values={eloValues} />
            <div className="text-[10px] font-mono text-zinc-400 mt-1">
              {eloValues[0]} → {eloValues[eloValues.length - 1]}
            </div>
          </div>
        )}
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="ELO" value={String(user.hubElo)} accent="text-orange-300" />
        <Stat
          label="Level"
          value={String(lvl.level)}
          accent={lvl.textClass}
          hint={lvl.label}
        />
        <Stat label="Wins" value={String(user.hubWins)} accent="text-emerald-300" />
        <Stat label="Losses" value={String(user.hubLosses)} accent="text-rose-300" />
        <Stat
          label="Winrate"
          value={winrate === null ? "—" : `${winrate}%`}
          accent={
            winrate !== null && winrate >= 50
              ? "text-emerald-300"
              : "text-zinc-300"
          }
          hint={`${user.hubMatchesPlayed} матчей`}
        />
      </section>

      {/* Per-map stats */}
      {mapStatsArr.length > 0 && (
        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-3">
            По картам (последние {recentMatches.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {mapStatsArr.map((s) => (
              <div
                key={s.map}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center"
              >
                <div className="text-sm font-bold">{displayNameFor(s.map)}</div>
                <div className="text-2xl font-black tabular-nums mt-1">
                  <span
                    className={
                      s.winrate >= 50 ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {s.winrate}%
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {s.wins}W · {s.losses}L
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent matches */}
      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-3">
          Последние матчи
        </h2>
        {recentMatches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
            Этот игрок ещё не сыграл ни одного матча в hub.
          </div>
        ) : (
          <div className="grid gap-2">
            {recentMatches.map((m) => {
              const wasA = m.teamAPlayerIds.includes(user.steamId);
              const userTeam: "A" | "B" = wasA ? "A" : "B";
              const won = m.winner === userTeam;
              return (
                <Link
                  key={m.id}
                  href={`/${locale}/hub/match/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        won
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {won ? "WIN" : "LOSS"}
                    </span>
                    <span className="text-sm font-medium">
                      {displayNameFor(m.map)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono tabular-nums">
                      {m.scoreA} : {m.scoreB}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 w-20 text-right">
                      {m.finishedAt ? formatRelative(m.finishedAt) : "—"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
