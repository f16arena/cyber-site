export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { joinTeam, leaveTeam } from "../actions";
import { ShareButtons } from "@/components/ShareButtons";
import { ROSTER_SIZE, MAX_SUBS, maxRoster } from "@/lib/games";
import type { Region } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toUpperCase();
  const team = await prisma.team.findUnique({
    where: { tag },
    select: { name: true, description: true, logoUrl: true, game: true },
  });
  if (!team) return { title: "Команда не найдена" };
  const description =
    team.description ||
    `${team.game} команда [${tag}] на Esports.kz — состав, статистика, история матчей.`;
  return {
    title: `[${tag}] ${team.name}`,
    description,
    openGraph: {
      title: `[${tag}] ${team.name}`,
      description,
      type: "profile",
      images: team.logoUrl ? [{ url: team.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `[${tag}] ${team.name}`,
      description,
      images: team.logoUrl ? [team.logoUrl] : undefined,
    },
  };
}

const REGION_LABEL: Partial<Record<Region, string>> = {
  ALMATY: "Алматы",
  ASTANA: "Астана",
  SHYMKENT: "Шымкент",
  KARAGANDA: "Караганда",
  AKTAU: "Актау",
  AKTOBE: "Актобе",
  PAVLODAR: "Павлодар",
  ATYRAU: "Атырау",
  ORAL: "Уральск",
  KOSTANAY: "Костанай",
  TARAZ: "Тараз",
  KZ_OTHER: "Другой",
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toUpperCase();

  const [team, user] = await Promise.all([
    prisma.team.findUnique({
      where: { tag },
      include: {
        captain: { select: { id: true, username: true, avatarUrl: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                profiles: { select: { game: true, inGameRole: true, rank: true } },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { matchesA: true, matchesB: true, wonMatches: true } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!team) notFound();

  const isMember = user
    ? team.members.some((m) => m.userId === user.id)
    : false;
  const isCaptain = user?.id === team.captainId;
  const canJoin = user && !isMember;

  const totalMatches = team._count.matchesA + team._count.matchesB;
  const wins = team._count.wonMatches;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Статистика по картам и последние матчи
  const memberIds = team.members.map((m) => m.userId);

  const [recentMatches, mapStats, tournamentHistory] = await Promise.all([
    prisma.match.findMany({
      where: {
        OR: [{ teamAId: team.id }, { teamBId: team.id }],
        status: "FINISHED",
      },
      include: {
        teamA: { select: { name: true, tag: true, logoUrl: true } },
        teamB: { select: { name: true, tag: true, logoUrl: true } },
        tournament: { select: { name: true, slug: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 10,
    }),
    prisma.match.groupBy({
      by: ["map"],
      where: {
        OR: [{ teamAId: team.id }, { teamBId: team.id }],
        status: "FINISHED",
        map: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.tournamentRegistration.findMany({
      where: { teamId: team.id },
      include: {
        tournament: {
          select: { id: true, name: true, slug: true, status: true, prize: true, endsAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Win rate по картам — нужна доп. агрегация
  const mapWinStats = await Promise.all(
    mapStats.map(async (m) => {
      if (!m.map) return null;
      const wins = await prisma.match.count({
        where: {
          OR: [{ teamAId: team.id }, { teamBId: team.id }],
          status: "FINISHED",
          map: m.map,
          winnerId: team.id,
        },
      });
      return {
        map: m.map,
        played: m._count._all,
        wins,
        winRate: Math.round((wins / m._count._all) * 100),
      };
    })
  );
  const mapsWithStats = mapWinStats.filter((m): m is NonNullable<typeof m> => m !== null);

  // Агрегированная стата команды через MatchPlayerStat
  const teamPlayerStats = memberIds.length
    ? await prisma.matchPlayerStat.aggregate({
        where: { userId: { in: memberIds }, teamId: team.id },
        _sum: { kills: true, deaths: true, assists: true },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <Link
          href="/teams"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Команды
        </Link>

        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30 flex items-center justify-center font-black text-3xl">
              {team.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                  {team.name}
                </h1>
                <span className="text-sm font-mono text-zinc-500">
                  [{team.tag}]
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  {team.game}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs font-mono text-zinc-400">
                {team.region && <span>📍 {REGION_LABEL[team.region]}</span>}
                <span>🏆 {team.rating} pts</span>
                <span>⚔ {totalMatches} матчей</span>
                <span>
                  Создана{" "}
                  {new Date(team.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              {team.description && (
                <p className="text-zinc-300 mt-4 leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {isCaptain && (
                <Link
                  href={`/teams/${team.tag}/edit`}
                  className="text-xs font-mono px-4 h-9 inline-flex items-center justify-center rounded border border-violet-500/30 hover:bg-violet-500/10 text-violet-300"
                >
                  ⚙ Редактировать
                </Link>
              )}
              {isMember && (
                <Link
                  href={`/teams/${team.tag}/chat`}
                  className="text-xs font-mono px-4 h-9 inline-flex items-center justify-center rounded border border-violet-500/30 hover:bg-violet-500/10 text-violet-300"
                >
                  💬 Командный чат
                </Link>
              )}
              {canJoin && team.privacy === "PUBLIC" && (
                <form action={joinTeam}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-4 h-9 inline-flex items-center rounded bg-violet-500 hover:bg-violet-400 transition-all"
                  >
                    🔓 Вступить
                  </button>
                </form>
              )}
              {canJoin && team.privacy === "PRIVATE" && (
                <details className="group">
                  <summary className="text-xs font-mono px-4 h-9 inline-flex items-center rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-pointer list-none">
                    🔒 Подать заявку
                  </summary>
                  <form
                    action={joinTeam}
                    className="absolute right-0 mt-2 w-72 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl z-10"
                  >
                    <input type="hidden" name="teamId" value={team.id} />
                    <textarea
                      name="message"
                      placeholder="Расскажи капитану о себе..."
                      rows={3}
                      maxLength={300}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs resize-none focus:outline-none focus:border-violet-400"
                    />
                    <button
                      type="submit"
                      className="mt-2 w-full h-9 rounded bg-violet-500 hover:bg-violet-400 text-xs font-bold uppercase tracking-wider"
                    >
                      Отправить заявку
                    </button>
                  </form>
                </details>
              )}
              {isMember && (
                <form action={leaveTeam}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-4 h-9 inline-flex items-center rounded border border-zinc-700 hover:border-rose-500/50 hover:text-rose-300 transition-all"
                  >
                    {isCaptain ? "Распустить" : "Выйти"}
                  </button>
                </form>
              )}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-800/60">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Поделиться
            </p>
            <ShareButtons
              path={`/teams/${team.tag}`}
              title={`[${team.tag}] ${team.name}`}
              text={`${team.game} команда [${team.tag}] ${team.name} на Esports.kz`}
            />
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Состав ({team.members.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {team.members.map((m) => {
              const profileForGame = m.user.profiles.find(
                (p) => p.game === team.game
              );
              const isMe = user?.id === m.userId;
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/30 transition-colors overflow-hidden"
                >
                  <Link
                    href={`/players/${encodeURIComponent(m.user.username)}`}
                    className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.avatarUrl}
                        alt={m.user.username}
                        className="w-12 h-12 rounded border border-zinc-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-violet-500/20 border border-violet-500/30" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate hover:text-violet-200 transition-colors">
                          {m.user.username}
                        </span>
                        {m.role === "CAPTAIN" && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            C
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {profileForGame?.inGameRole ?? "—"}
                        {profileForGame?.rank && ` · ${profileForGame.rank}`}
                      </div>
                    </div>
                  </Link>
                  {user && !isMe && (
                    <div className="flex border-t border-zinc-800/60 divide-x divide-zinc-800/60">
                      <Link
                        href={`/messages/${m.userId}`}
                        className="flex-1 text-center py-2 text-[10px] font-mono text-zinc-400 hover:bg-violet-500/10 hover:text-violet-300 transition-colors"
                      >
                        💬 Написать
                      </Link>
                      <Link
                        href={`/players/${encodeURIComponent(m.user.username)}`}
                        className="flex-1 text-center py-2 text-[10px] font-mono text-zinc-400 hover:bg-violet-500/10 hover:text-violet-300 transition-colors"
                      >
                        👥 Профиль
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const active = team.members.filter((m) => m.role !== "SUBSTITUTE").length;
            const subs = team.members.filter((m) => m.role === "SUBSTITUTE").length;
            const target = ROSTER_SIZE[team.game];
            const total = team.members.length;
            return (
              <div className="mt-3 text-xs font-mono text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Основной состав:{" "}
                  <span className={active >= target ? "text-emerald-400" : "text-amber-400"}>
                    {active}/{target}
                  </span>
                </span>
                <span>
                  Запасные:{" "}
                  <span className="text-zinc-300">
                    {subs}/{MAX_SUBS}
                  </span>
                </span>
                {total < maxRoster(team.game) && (
                  <span>
                    Свободно слотов: {maxRoster(team.game) - total}
                  </span>
                )}
                {total >= maxRoster(team.game) && (
                  <span className="text-emerald-400">✓ Состав укомплектован</span>
                )}
              </div>
            );
          })()}
        </section>

        {/* Statistics */}
        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Статистика
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-violet-500/10 rounded-lg overflow-hidden border border-violet-500/20">
            <StatCell label="Матчей" value={String(totalMatches)} />
            <StatCell label="Побед" value={String(wins)} accent="text-emerald-300" />
            <StatCell label="Win Rate" value={`${winRate}%`} accent={winRate >= 50 ? "text-emerald-300" : "text-rose-300"} />
            <StatCell label="Рейтинг" value={String(team.rating)} accent="text-violet-300" />
          </div>
          {teamPlayerStats && teamPlayerStats._count._all > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-800">
              <StatCell
                label="Командные K"
                value={String(teamPlayerStats._sum.kills ?? 0)}
              />
              <StatCell
                label="Командные D"
                value={String(teamPlayerStats._sum.deaths ?? 0)}
              />
              <StatCell
                label="Avg Rating"
                value={(teamPlayerStats._avg.rating ?? 0).toFixed(2)}
                accent="text-violet-300"
              />
              <StatCell
                label="Player Stats"
                value={String(teamPlayerStats._count._all)}
              />
            </div>
          )}
        </section>

        {/* Per-map stats */}
        {mapsWithStats.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
              По картам
            </h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
              {mapsWithStats
                .sort((a, b) => b.played - a.played)
                .map((m) => (
                  <div
                    key={m.map}
                    className="flex items-center gap-3 p-3 text-sm"
                  >
                    <span className="font-bold w-32 truncate">{m.map}</span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className={`h-full ${m.winRate >= 50 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${m.winRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs w-16 text-right">
                      {m.wins} / {m.played}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold w-12 text-right ${
                        m.winRate >= 50 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {m.winRate}%
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
              Последние матчи
            </h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
              {recentMatches.map((m) => {
                const opponent = m.teamAId === team.id ? m.teamB : m.teamA;
                const ourScore = m.teamAId === team.id ? m.scoreA : m.scoreB;
                const theirScore = m.teamAId === team.id ? m.scoreB : m.scoreA;
                const won = m.winnerId === team.id;
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-zinc-800/30 transition-colors text-sm"
                  >
                    <span
                      className={`text-[10px] font-mono font-bold w-6 text-center rounded ${
                        won
                          ? "text-emerald-300 bg-emerald-500/10"
                          : "text-rose-300 bg-rose-500/10"
                      }`}
                    >
                      {won ? "W" : "L"}
                    </span>
                    <span className="flex-1 min-w-0 truncate">
                      vs <span className="font-bold">{opponent?.name ?? "TBD"}</span>
                    </span>
                    <span className="font-mono text-zinc-400">
                      {ourScore} : {theirScore}
                    </span>
                    {m.tournament && (
                      <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline truncate max-w-[160px]">
                        {m.tournament.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Tournament history */}
        {tournamentHistory.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              История турниров ({tournamentHistory.length})
            </h2>
            <div className="space-y-2">
              {tournamentHistory.map((r) => (
                <Link
                  key={r.id}
                  href={`/tournaments/${r.tournament.slug}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 p-3 text-sm transition-colors"
                >
                  <span className="font-bold truncate">{r.tournament.name}</span>
                  <span className="text-xs font-mono text-zinc-500">
                    {r.tournament.status === "COMPLETED"
                      ? "Завершён"
                      : r.tournament.status === "ONGOING"
                        ? "Идёт"
                        : "Регистрация"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-950/60 backdrop-blur p-4 text-center">
      <div className={`text-2xl font-black ${accent ?? "text-zinc-100"}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-1 font-mono">
        {label}
      </div>
    </div>
  );
}
