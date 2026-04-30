import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { LfgForm } from "./form";
import { deactivateLfgPost } from "./actions";
import type { Game, Region } from "@prisma/client";

const REGION_LABEL: Partial<Record<Region, string>> = {
  ALMATY: "Алматы", ASTANA: "Астана", SHYMKENT: "Шымкент", KARAGANDA: "Караганда",
  AKTAU: "Актау", AKTOBE: "Актобе", PAVLODAR: "Павлодар", ATYRAU: "Атырау",
  ORAL: "Уральск", KOSTANAY: "Костанай", TARAZ: "Тараз", KZ_OTHER: "Другой",
};

const GAME_FILTERS = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
] as const;

const GAME_ACCENT: Record<Game, string> = {
  CS2: "border-orange-500/30 bg-orange-500/5",
  DOTA2: "border-rose-500/30 bg-rose-500/5",
  PUBG: "border-yellow-500/30 bg-yellow-500/5",
};

function formatRelative(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 86400 * 2) return "вчера";
  return `${Math.floor(diff / 86400)} дн назад`;
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; region?: string }>;
}) {
  const params = await searchParams;
  const gameFilter = params.game?.toUpperCase();
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(gameFilter ?? "")
    ? (gameFilter as Game)
    : null;

  const [posts, user] = await Promise.all([
    prisma.lfgPost.findMany({
      where: {
        isActive: true,
        ...(validGame ? { game: validGame } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getCurrentUser(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
              // LFG · Looking For Game
            </p>
            <h1 className="text-4xl font-black tracking-tight">Поиск тиммейтов</h1>
            <p className="text-zinc-400 mt-2">
              Опубликуй заявку — найдут команды и игроки твоего региона.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          {/* Лента LFG */}
          <div>
            <div className="flex gap-2 mb-6 flex-wrap">
              {GAME_FILTERS.map((f) => {
                const active =
                  (f.value === "ALL" && !validGame) ||
                  (validGame && f.value === validGame);
                const href = f.value === "ALL" ? "/players" : `/players?game=${f.value.toLowerCase()}`;
                return (
                  <Link
                    key={f.value}
                    href={href}
                    className={`px-4 h-9 inline-flex items-center text-sm font-mono rounded border transition-all ${
                      active
                        ? "bg-violet-500/15 text-violet-200 border-violet-500/50"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>

            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
                <div className="text-4xl mb-3">🎮</div>
                <p className="font-bold mb-1 text-zinc-300">
                  {validGame
                    ? `По ${validGame} никто не ищет команду`
                    : "Никто пока не ищет команду"}
                </p>
                <p className="text-sm">
                  Будь первым — опубликуй свою заявку справа.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => {
                  const isMine = user?.id === p.authorId;
                  const lastSeen = p.author.lastSeenAt;
                  const isOnline =
                    lastSeen &&
                    Date.now() - lastSeen.getTime() < 5 * 60 * 1000;
                  return (
                    <article
                      key={p.id}
                      className={`group rounded-lg border ${GAME_ACCENT[p.game]} hover:bg-zinc-900/70 transition-colors p-5`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          {p.author.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.author.avatarUrl}
                              alt={p.author.username}
                              className="w-12 h-12 rounded border border-zinc-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-violet-500/20 border border-violet-500/30" />
                          )}
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold">{p.author.username}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                              {p.game}
                            </span>
                            {p.inGameRole && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                {p.inGameRole}
                              </span>
                            )}
                            {p.region && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                📍 {REGION_LABEL[p.region]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {p.description}
                          </p>
                          <div className="flex items-center justify-between gap-3 mt-3 text-[10px] font-mono text-zinc-500">
                            <span>{formatRelative(p.createdAt)}</span>
                            <div className="flex items-center gap-3">
                              {!isMine && user && (
                                <Link
                                  href={`/profile/${p.author.username}`}
                                  className="text-violet-300 hover:text-violet-200"
                                >
                                  Профиль →
                                </Link>
                              )}
                              {isMine && (
                                <form action={deactivateLfgPost}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <button
                                    type="submit"
                                    className="text-rose-400 hover:text-rose-300"
                                  >
                                    Закрыть
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar — форма создания */}
          <aside className="lg:sticky lg:top-20 self-start">
            {user ? (
              <div className="rounded-lg border border-violet-500/20 bg-zinc-900/40 p-5">
                <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
                  Опубликовать заявку
                </h2>
                <LfgForm />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
                <p className="mb-3">
                  Войди через Steam, чтобы публиковать заявки.
                </p>
                <Link
                  href="/api/auth/steam"
                  className="inline-flex items-center justify-center h-10 px-5 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
                >
                  Войти через Steam
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
