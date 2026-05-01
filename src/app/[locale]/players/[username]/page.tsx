export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { sendFriendRequest } from "../../friends/actions";
import type { Region } from "@prisma/client";

const REGION_LABEL: Partial<Record<Region, string>> = {
  ALMATY: "Алматы", ASTANA: "Астана", SHYMKENT: "Шымкент", KARAGANDA: "Караганда",
  AKTAU: "Актау", AKTOBE: "Актобе", PAVLODAR: "Павлодар", ATYRAU: "Атырау",
  ORAL: "Уральск", KOSTANAY: "Костанай", TARAZ: "Тараз", KZ_OTHER: "Другой",
};

export default async function PlayerPublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  let username: string;
  try {
    username = decodeURIComponent(rawUsername);
  } catch {
    username = rawUsername;
  }

  // Сначала точный поиск, затем case-insensitive (на случай разных регистров в URL)
  let user = await prisma.user.findUnique({
    where: { username },
    include: {
      profiles: true,
      teamMemberships: { include: { team: true } },
      mvpAwards: {
        include: { tournament: { select: { name: true, slug: true, game: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!user) {
    user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      include: {
        profiles: true,
        teamMemberships: { include: { team: true } },
        mvpAwards: {
          include: { tournament: { select: { name: true, slug: true, game: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  if (!user) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === user.id;
  const friendship = me && !isMe
    ? await prisma.friendship.findFirst({
        where: {
          OR: [
            { fromId: me.id, toId: user.id },
            { fromId: user.id, toId: me.id },
          ],
        },
      })
    : null;

  // Сначала получаем командный список (один запрос)
  const myTeams = await prisma.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });
  const myTeamIds = myTeams.map((m) => m.teamId);

  // Параллельно — статистика и матчи
  const [aggStats, recentStats, allStats, allMatches] = await Promise.all([
    prisma.matchPlayerStat.groupBy({
      by: ["game"],
      where: { userId: user.id },
      _sum: { kills: true, deaths: true, assists: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.matchPlayerStat.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
      take: 10,
      select: {
        id: true,
        kills: true,
        deaths: true,
        assists: true,
        rating: true,
        isMvp: true,
        game: true,
        extra: true,
        matchId: true,
        recordedAt: true,
      },
    }),
    prisma.matchPlayerStat.findMany({
      where: { userId: user.id },
      select: {
        kills: true,
        deaths: true,
        assists: true,
        mvpRounds: true,
        rating: true,
        extra: true,
        teamId: true,
      },
    }),
    myTeamIds.length > 0
      ? prisma.match.findMany({
          where: {
            status: "FINISHED",
            OR: [
              { teamAId: { in: myTeamIds } },
              { teamBId: { in: myTeamIds } },
            ],
          },
          select: {
            id: true,
            map: true,
            winnerId: true,
            teamAId: true,
            teamBId: true,
          },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  // Считаем wins и mapStats из allMatches в JS (без доп. запросов к БД)
  const wonMatchesCount = allMatches.filter(
    (m) => m.winnerId && myTeamIds.includes(m.winnerId)
  ).length;
  const mapStats = allMatches.filter((m) => m.map);

  // Базовые агрегаты
  const matchesPlayed = allStats.length;
  const totalKills = allStats.reduce((s, x) => s + x.kills, 0);
  const totalDeaths = allStats.reduce((s, x) => s + x.deaths, 0);
  const totalAssists = allStats.reduce((s, x) => s + x.assists, 0);
  const totalMvpRounds = allStats.reduce((s, x) => s + x.mvpRounds, 0);
  const totalMvps = user.mvpAwards.length;

  const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const kdaRatio =
    totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : totalKills + totalAssists;
  const avgRating =
    matchesPlayed > 0
      ? allStats.reduce((s, x) => s + (x.rating ?? 0), 0) / matchesPlayed
      : 0;
  const kpr = matchesPlayed > 0 ? totalKills / matchesPlayed : 0;
  const dpr = matchesPlayed > 0 ? totalDeaths / matchesPlayed : 0;
  const apr = matchesPlayed > 0 ? totalAssists / matchesPlayed : 0;

  // Из JSON extra собираем CS2-специфичные показатели
  type Extra = {
    adr?: number;
    hsPct?: number;
    kast?: number;
    openingKills?: number;
    clutches1v1?: number;
    clutches1v2?: number;
    multikills2k?: number;
    multikills3k?: number;
    multikills4k?: number;
    multikills5k?: number;
    utilityDamage?: number;
    flashAssists?: number;
  };
  let totalAdr = 0,
    totalHsPct = 0,
    totalKast = 0,
    extraCount = 0;
  let totalOpeningKills = 0,
    totalUtilDmg = 0,
    totalFlashAssists = 0;
  let totalClutches1v1 = 0,
    totalClutches1v2 = 0,
    totalMK2 = 0,
    totalMK3 = 0,
    totalMK4 = 0,
    totalMK5 = 0;
  for (const s of allStats) {
    const e = (s.extra ?? {}) as Extra;
    if (e.adr || e.hsPct || e.kast) {
      extraCount++;
      totalAdr += e.adr ?? 0;
      totalHsPct += e.hsPct ?? 0;
      totalKast += e.kast ?? 0;
    }
    totalOpeningKills += e.openingKills ?? 0;
    totalUtilDmg += e.utilityDamage ?? 0;
    totalFlashAssists += e.flashAssists ?? 0;
    totalClutches1v1 += e.clutches1v1 ?? 0;
    totalClutches1v2 += e.clutches1v2 ?? 0;
    totalMK2 += e.multikills2k ?? 0;
    totalMK3 += e.multikills3k ?? 0;
    totalMK4 += e.multikills4k ?? 0;
    totalMK5 += e.multikills5k ?? 0;
  }
  const avgAdr = extraCount > 0 ? totalAdr / extraCount : 0;
  const avgHsPct = extraCount > 0 ? totalHsPct / extraCount : 0;
  const avgKast = extraCount > 0 ? totalKast / extraCount : 0;

  // Win rate
  const winRate =
    matchesPlayed > 0 ? Math.round((wonMatchesCount / matchesPlayed) * 100) : 0;

  // Per-map breakdown (только если игрок участвовал в матчах с картами)
  const mapBreakdown = new Map<
    string,
    { played: number; wins: number }
  >();
  const myTeamIdsSet = new Set(myTeamIds);
  for (const m of mapStats) {
    if (!m.map) continue;
    const won = m.winnerId !== null && myTeamIdsSet.has(m.winnerId ?? "");
    const cur = mapBreakdown.get(m.map) || { played: 0, wins: 0 };
    cur.played++;
    if (won) cur.wins++;
    mapBreakdown.set(m.map, cur);
  }
  const mapList = Array.from(mapBreakdown.entries())
    .map(([map, s]) => ({
      map,
      played: s.played,
      wins: s.wins,
      winRate: Math.round((s.wins / s.played) * 100),
    }))
    .sort((a, b) => b.played - a.played);

  const lastSeen = user.lastSeenAt;
  const isOnline = lastSeen && Date.now() - lastSeen.getTime() < 5 * 60 * 1000;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <Link
          href="/players"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Все игроки
        </Link>

        {/* Profile header */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-24 h-24 rounded-lg border border-violet-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-violet-500/20 border border-violet-500/30" />
              )}
              {isOnline && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-4 border-zinc-950" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight">
                  {user.username}
                </h1>
                {user.isAdmin && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ADMIN
                  </span>
                )}
                {isOnline && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    online
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-500 font-mono mt-1">
                Steam ID: {user.steamId}
              </div>
              {user.bio && (
                <p className="text-zinc-300 mt-4 leading-relaxed">{user.bio}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
                {user.region && (
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    📍 {REGION_LABEL[user.region]}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                  С {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </span>
                {user.twitchUrl && (
                  <a
                    href={user.twitchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
                  >
                    📺 Twitch
                  </a>
                )}
                {user.discordTag && (
                  <span className="px-2 py-1 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    💬 {user.discordTag}
                  </span>
                )}
                {user.faceitNickname && (
                  <a
                    href={`https://www.faceit.com/en/players/${user.faceitNickname}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25"
                  >
                    🎯 FACEIT
                  </a>
                )}
                {user.dotaAccountId && (
                  <a
                    href={`https://www.opendota.com/players/${user.dotaAccountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                  >
                    ⚔ Dotabuff
                  </a>
                )}
                {user.pubgNickname && (
                  <span className="px-2 py-1 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                    🐔 {user.pubgNickname}
                  </span>
                )}
              </div>
              {me && !isMe && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {friendship?.status === "ACCEPTED" ? (
                    <span className="text-xs font-mono px-3 h-9 inline-flex items-center rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      ✓ В друзьях
                    </span>
                  ) : friendship?.status === "PENDING" ? (
                    <span className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-zinc-700 text-zinc-400">
                      ⌛ Запрос отправлен
                    </span>
                  ) : (
                    <form action={sendFriendRequest}>
                      <input type="hidden" name="username" value={user.username} />
                      <button
                        type="submit"
                        className="text-xs font-mono px-3 h-9 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 transition-all"
                      >
                        + Добавить в друзья
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/messages/${user.id}`}
                    className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5"
                  >
                    💬 Написать
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Career overview — 12 stat-карточек как у профи */}
        {matchesPlayed > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">
                Career Overview
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">
                {matchesPlayed} матчей · win rate {winRate}%
              </span>
            </div>

            {/* Главные показатели */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-violet-500/10 rounded-xl overflow-hidden border border-violet-500/20">
              <BigStat
                label="Rating 2.0"
                value={avgRating.toFixed(2)}
                accent={
                  avgRating >= 1.1
                    ? "text-emerald-300"
                    : avgRating >= 0.9
                      ? "text-violet-300"
                      : "text-rose-300"
                }
              />
              <BigStat
                label="K/D"
                value={kdRatio.toFixed(2)}
                accent={kdRatio >= 1 ? "text-emerald-300" : "text-rose-300"}
              />
              <BigStat label="K+A/D" value={kdaRatio.toFixed(2)} />
              <BigStat label="ADR" value={avgAdr.toFixed(1)} />
              <BigStat label="HS %" value={`${avgHsPct.toFixed(0)}%`} />
              <BigStat label="KAST" value={`${avgKast.toFixed(0)}%`} />
            </div>

            {/* Per-round и матчевые */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-800">
              <BigStat
                label="KPR"
                value={kpr.toFixed(2)}
                small
                hint="Kills / round"
              />
              <BigStat
                label="DPR"
                value={dpr.toFixed(2)}
                small
                hint="Deaths / round"
              />
              <BigStat
                label="APR"
                value={apr.toFixed(2)}
                small
                hint="Assists / round"
              />
              <BigStat
                label="Win Rate"
                value={`${winRate}%`}
                accent={winRate >= 50 ? "text-emerald-300" : "text-rose-300"}
                small
              />
              <BigStat
                label="MVP"
                value={String(totalMvps)}
                accent="text-amber-300"
                small
              />
              <BigStat
                label="MVP-раундов"
                value={String(totalMvpRounds)}
                small
              />
            </div>

            {/* Сырые числа */}
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-px bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800">
              <BigStat label="Матчей" value={String(matchesPlayed)} tiny />
              <BigStat label="Побед" value={String(wonMatchesCount)} tiny accent="text-emerald-300" />
              <BigStat label="Убийств" value={totalKills.toLocaleString("ru-RU")} tiny />
              <BigStat label="Смертей" value={totalDeaths.toLocaleString("ru-RU")} tiny />
              <BigStat label="Помощи" value={totalAssists.toLocaleString("ru-RU")} tiny />
              <BigStat
                label="OpeningK"
                value={String(totalOpeningKills)}
                tiny
                hint="Первые килы"
              />
            </div>
          </section>
        )}

        {/* Multikills (CS2) */}
        {(totalMK2 + totalMK3 + totalMK4 + totalMK5 + totalClutches1v1 + totalClutches1v2 > 0) && (
          <section className="mb-8 grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
                Мульти-килы
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <Multikill label="2K" value={totalMK2} color="text-zinc-300" />
                <Multikill label="3K" value={totalMK3} color="text-violet-300" />
                <Multikill label="4K" value={totalMK4} color="text-amber-300" />
                <Multikill label="5K (ACE)" value={totalMK5} color="text-rose-300" />
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
                Клатчи
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Multikill label="1v1" value={totalClutches1v1} color="text-emerald-300" />
                <Multikill label="1v2+" value={totalClutches1v2} color="text-rose-300" />
              </div>
              {(totalUtilDmg > 0 || totalFlashAssists > 0) && (
                <div className="mt-4 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-zinc-500">Util damage</div>
                    <div className="font-bold">{totalUtilDmg.toLocaleString("ru-RU")}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Flash assists</div>
                    <div className="font-bold">{totalFlashAssists}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Per-map breakdown */}
        {mapList.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
              По картам
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
              {mapList.map((m) => (
                <div
                  key={m.map}
                  className="flex items-center gap-3 p-3 text-sm"
                >
                  <span className="font-bold w-32 truncate">{m.map}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.winRate >= 50 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${m.winRate}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs w-16 text-right text-zinc-400">
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

        {/* Recent matches form */}
        {recentStats.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
              Форма (последние {recentStats.length} матчей)
            </h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-zinc-900/60">
                  <tr className="text-zinc-500 text-left">
                    <th className="p-2 font-normal">Игра</th>
                    <th className="text-right p-2 font-normal">K</th>
                    <th className="text-right p-2 font-normal">D</th>
                    <th className="text-right p-2 font-normal">A</th>
                    <th className="text-right p-2 font-normal">Rating</th>
                    <th className="text-right p-2 font-normal hidden sm:table-cell">
                      Дата
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentStats.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                    >
                      <td className="p-2">
                        <Link
                          href={`/matches/${s.matchId}`}
                          className="hover:text-violet-300"
                        >
                          {s.game}
                        </Link>
                        {s.isMvp && (
                          <span className="ml-2 text-amber-300">⭐</span>
                        )}
                      </td>
                      <td className="text-right p-2 text-zinc-300">{s.kills}</td>
                      <td className="text-right p-2 text-zinc-500">{s.deaths}</td>
                      <td className="text-right p-2 text-zinc-300">{s.assists}</td>
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
                      <td className="text-right p-2 text-zinc-500 hidden sm:table-cell">
                        {new Date(s.recordedAt).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Game profiles */}
        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Дисциплины
          </h2>
          {user.profiles.length === 0 ? (
            <p className="text-sm text-zinc-500">Игрок ещё не добавил дисциплины.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {user.profiles.map((profile) => {
                const agg = aggStats.find((s) => s.game === profile.game);
                return (
                  <div
                    key={profile.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-violet-400 uppercase">
                        {profile.game}
                      </span>
                      {profile.inGameRole && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {profile.inGameRole}
                        </span>
                      )}
                    </div>
                    {profile.rank && (
                      <div className="text-xs text-zinc-500 mb-3">
                        Ранг: <span className="text-zinc-300">{profile.rank}</span>
                      </div>
                    )}
                    {agg ? (
                      <div className="border-t border-zinc-800 pt-3 mt-3 grid grid-cols-3 gap-2 text-xs font-mono">
                        <Stat label="K" value={String(agg._sum.kills ?? 0)} />
                        <Stat label="D" value={String(agg._sum.deaths ?? 0)} />
                        <Stat label="A" value={String(agg._sum.assists ?? 0)} />
                        <Stat
                          label="Rating"
                          value={(agg._avg.rating ?? 0).toFixed(2)}
                          accent="text-violet-300"
                        />
                        <Stat label="Matches" value={String(agg._count._all)} />
                      </div>
                    ) : (
                      <div className="border-t border-zinc-800 pt-3 mt-3 text-[10px] font-mono text-zinc-500">
                        Статистики ещё нет
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Teams */}
        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Команды
          </h2>
          {user.teamMemberships.length === 0 ? (
            <p className="text-sm text-zinc-500">Игрок не в команде.</p>
          ) : (
            <div className="space-y-2">
              {user.teamMemberships.map((m) => (
                <Link
                  key={m.id}
                  href={`/teams/${m.team.tag}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 transition-colors p-4"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-bold">{m.team.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {m.team.game} · {m.role}
                      </div>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xs font-mono">
                    [{m.team.tag}]
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* MVP awards */}
        {user.mvpAwards.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
              🏆 MVP-награды ({user.mvpAwards.length})
            </h2>
            <div className="space-y-2">
              {user.mvpAwards.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-bold">
                      {a.tournament ? (
                        <Link
                          href={`/tournaments/${a.tournament.slug}`}
                          className="hover:text-amber-200"
                        >
                          {a.tournament.name}
                        </Link>
                      ) : (
                        "Match MVP"
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(a.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {a.comment && (
                    <p className="text-sm text-zinc-400 mt-1">{a.comment}</p>
                  )}
                </div>
              ))}
            </div>
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
      <div className="text-zinc-500 uppercase text-[9px]">{label}</div>
      <div className={`font-bold ${accent ?? "text-zinc-200"}`}>{value}</div>
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
  small = false,
  tiny = false,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  small?: boolean;
  tiny?: boolean;
  hint?: string;
}) {
  const padding = tiny ? "p-2.5" : small ? "p-3" : "p-4 sm:p-5";
  const fontSize = tiny ? "text-base" : small ? "text-xl" : "text-2xl sm:text-3xl";
  return (
    <div
      className={`bg-zinc-950/60 backdrop-blur ${padding} text-center`}
      title={hint}
    >
      <div className={`${fontSize} font-display font-black ${accent ?? "text-zinc-100"}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-1 font-mono">
        {label}
      </div>
    </div>
  );
}

function Multikill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center rounded-lg bg-zinc-950/40 border border-zinc-800 p-3">
      <div className={`text-2xl font-display font-black ${color}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1 font-mono">
        {label}
      </div>
    </div>
  );
}
