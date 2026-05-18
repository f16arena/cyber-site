export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { LevelBadge } from "@/components/hub/LevelBadge";

const PAGE_SIZE = 100;

export default async function HubLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getOptionalHubUser();

  // Берём только реальных игроков (исключая ботов dev-fill, dev-логинов и admin-учёток)
  const players = await prisma.user.findMany({
    where: {
      AND: [
        { hubMatchesPlayed: { gt: 0 } },
        { NOT: { steamId: { startsWith: "bot_" } } },
        { NOT: { steamId: { startsWith: "dev_" } } },
        { NOT: { steamId: { startsWith: "admin_" } } },
      ],
    },
    orderBy: [{ hubElo: "desc" }, { hubWins: "desc" }, { username: "asc" }],
    take: PAGE_SIZE,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      hubElo: true,
      hubWins: true,
      hubLosses: true,
      hubMatchesPlayed: true,
    },
  });

  const myRank = me
    ? await prisma.user.count({
        where: {
          AND: [
            { hubMatchesPlayed: { gt: 0 } },
            { NOT: { steamId: { startsWith: "bot_" } } },
            { NOT: { steamId: { startsWith: "dev_" } } },
            { NOT: { steamId: { startsWith: "admin_" } } },
            {
              OR: [
                { hubElo: { gt: me.hubElo } },
                {
                  AND: [
                    { hubElo: me.hubElo },
                    { hubWins: { gt: me.hubWins } },
                  ],
                },
              ],
            },
          ],
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400">
          F16 HUB
        </div>
        <h1 className="text-3xl font-black tracking-tight">Лидерборд CS2 MM</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Топ-{PAGE_SIZE} игроков по hub-ELO. Боты и dev-аккаунты исключены.
        </p>
      </header>

      {me && me.hubMatchesPlayed > 0 && myRank !== null && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <LevelBadge elo={me.hubElo} size="lg" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-orange-300">
                Ваша позиция
              </div>
              <div className="text-xl font-black">
                #{myRank + 1}{" "}
                <span className="text-zinc-500 text-sm font-mono ml-1">
                  · {me.hubElo} ELO
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            {me.hubWins} W · {me.hubLosses} L · {me.hubMatchesPlayed} матчей
          </div>
        </div>
      )}

      {players.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center text-sm text-zinc-500">
          Пока никто не сыграл ни одного матча.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
              <tr>
                <th className="text-left px-4 py-2 w-12">#</th>
                <th className="text-left px-4 py-2">Игрок</th>
                <th className="text-left px-4 py-2 w-20">Уровень</th>
                <th className="text-right px-4 py-2 w-20">ELO</th>
                <th className="text-right px-4 py-2 w-24">W / L</th>
                <th className="text-right px-4 py-2 w-20">Winrate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {players.map((p, idx) => {
                const rank = idx + 1;
                const total = p.hubWins + p.hubLosses;
                const wr =
                  total > 0 ? Math.round((p.hubWins / total) * 100) : null;
                const isMe = me?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    className={isMe ? "bg-orange-500/5" : undefined}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-zinc-400 tabular-nums">
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatarUrl}
                            alt={p.username}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                            {p.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <Link
                          href={`/${locale}/players/${encodeURIComponent(
                            p.username
                          )}`}
                          className="font-bold truncate hover:text-orange-300"
                        >
                          {p.username}
                        </Link>
                        {isMe && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                            ВЫ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge elo={p.hubElo} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-orange-300">
                      {p.hubElo}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span className="text-emerald-300">{p.hubWins}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-rose-300">{p.hubLosses}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {wr === null ? (
                        <span className="text-zinc-500">—</span>
                      ) : (
                        <span
                          className={
                            wr >= 50 ? "text-emerald-300" : "text-zinc-300"
                          }
                        >
                          {wr}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
