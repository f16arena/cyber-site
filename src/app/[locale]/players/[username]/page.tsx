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
  const username = decodeURIComponent(rawUsername);

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profiles: true,
      teamMemberships: {
        include: { team: true },
      },
      mvpAwards: {
        include: {
          tournament: { select: { name: true, slug: true, game: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

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

  // Агрегированная статистика по матчам
  const aggStats = await prisma.matchPlayerStat.groupBy({
    by: ["game"],
    where: { userId: user.id },
    _sum: { kills: true, deaths: true, assists: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

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
