export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { joinTeam, leaveTeam } from "../actions";
import type { Region } from "@prisma/client";

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

  // Игрок может присоединиться, если: залогинен, не уже в этой команде, и
  // не состоит в другой команде по этой же игре
  const canJoin = user && !isMember;

  const totalMatches = team._count.matchesA + team._count.matchesB;

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
                <h1 className="text-3xl font-black tracking-tight">
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
              {canJoin && (
                <form action={joinTeam}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-4 h-9 inline-flex items-center rounded bg-violet-500 hover:bg-violet-400 transition-all"
                  >
                    Вступить
                  </button>
                </form>
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
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
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
                      <span className="font-bold truncate">
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
                </div>
              );
            })}
          </div>
          {team.members.length < 5 && (
            <div className="mt-3 text-xs font-mono text-zinc-500">
              До полного состава: {5 - team.members.length}{" "}
              {team.members.length === 4 ? "игрок" : "игроков"}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
