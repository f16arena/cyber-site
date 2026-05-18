export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { LfgForm } from "./form";
import { deactivateLfgPost } from "./actions";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Game, Region } from "@prisma/client";

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

const GAME_FILTERS = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
] as const;

const VALID_REGIONS = Object.keys(REGION_LABEL) as Region[];

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
  searchParams: Promise<{ game?: string; region?: string; q?: string }>;
}) {
  const params = await searchParams;
  const gameFilter = params.game?.toUpperCase();
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(gameFilter ?? "")
    ? (gameFilter as Game)
    : null;

  const regionFilter = params.region?.toUpperCase();
  const validRegion = VALID_REGIONS.includes(regionFilter as Region)
    ? (regionFilter as Region)
    : null;

  const q = (params.q || "").trim().slice(0, 64);

  const [posts, user] = await Promise.all([
    prisma.lfgPost.findMany({
      where: {
        isActive: true,
        ...(validGame ? { game: validGame } : {}),
        ...(validRegion ? { region: validRegion } : {}),
        ...(q
          ? {
              OR: [
                { description: { contains: q, mode: "insensitive" } },
                { author: { username: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }],
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
      <main className="flex-1">
        <PageContainer>
          <PageHeader
            title="Поиск тиммейтов"
            subtitle="Опубликуй заявку — найдут команды и игроки твоего региона."
          />

          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            <div className="min-w-0">
              {/* Search */}
              <form className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Поиск по нику или описанию"
                  className="flex-1 min-w-[220px] bg-bg-panel border border-border-default rounded h-9 px-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-text-muted"
                />
                {validGame && (
                  <input
                    type="hidden"
                    name="game"
                    value={validGame.toLowerCase()}
                  />
                )}
                {validRegion && (
                  <input
                    type="hidden"
                    name="region"
                    value={validRegion.toLowerCase()}
                  />
                )}
                <Button type="submit" variant="secondary" size="md">
                  Искать
                </Button>
                {(q || validGame || validRegion) && (
                  <Link
                    href="/players"
                    className="h-9 inline-flex items-center px-3 text-xs font-mono text-text-muted hover:text-rose-300"
                  >
                    ✕ сбросить
                  </Link>
                )}
              </form>

              {/* Game filters */}
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {GAME_FILTERS.map((f) => {
                  const active =
                    (f.value === "ALL" && !validGame) ||
                    (validGame && f.value === validGame);
                  const linkParams = new URLSearchParams();
                  if (f.value !== "ALL")
                    linkParams.set("game", f.value.toLowerCase());
                  if (validRegion)
                    linkParams.set("region", validRegion.toLowerCase());
                  if (q) linkParams.set("q", q);
                  const href =
                    "/players" + (linkParams.toString() ? `?${linkParams}` : "");
                  return (
                    <Link
                      key={f.value}
                      href={href}
                      className={`px-3 h-8 inline-flex items-center text-sm rounded border transition-colors ${
                        active
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                          : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {f.label}
                    </Link>
                  );
                })}
              </div>

              {/* Region filters */}
              <div className="flex gap-1 mb-5 flex-wrap">
                {([null, ...VALID_REGIONS] as Array<Region | null>).map((r) => {
                  const active =
                    (r === null && !validRegion) || r === validRegion;
                  const linkParams = new URLSearchParams();
                  if (r) linkParams.set("region", r.toLowerCase());
                  if (validGame)
                    linkParams.set("game", validGame.toLowerCase());
                  if (q) linkParams.set("q", q);
                  const href =
                    "/players" + (linkParams.toString() ? `?${linkParams}` : "");
                  return (
                    <Link
                      key={r ?? "ALL"}
                      href={href}
                      className={`px-2.5 h-7 inline-flex items-center text-[11px] font-mono rounded border transition-colors ${
                        active
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                          : "border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary"
                      }`}
                    >
                      {r === null ? "Все регионы" : REGION_LABEL[r]}
                    </Link>
                  );
                })}
              </div>

              {posts.length === 0 ? (
                <EmptyState
                  title={
                    validGame
                      ? `По ${validGame} никто не ищет команду`
                      : "Никто пока не ищет команду"
                  }
                  description="Будь первым — опубликуй свою заявку справа."
                />
              ) : (
                <div className="space-y-2.5">
                  {posts.map((p) => {
                    const isMine = user?.id === p.authorId;
                    const lastSeen = p.author.lastSeenAt;
                    const isOnline =
                      lastSeen &&
                      Date.now() - lastSeen.getTime() < 5 * 60 * 1000;
                    return (
                      <article
                        key={p.id}
                        className="group rounded border border-border-default bg-bg-panel hover:bg-bg-elevated transition-colors p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {p.author.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.author.avatarUrl}
                                alt={p.author.username}
                                className="w-10 h-10 rounded border border-border-default"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-bg-elevated border border-border-default flex items-center justify-center text-sm font-bold text-text-secondary">
                                {p.author.username[0].toUpperCase()}
                              </div>
                            )}
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-bg-panel" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-text-primary">
                                {p.author.username}
                              </span>
                              <Badge variant="cyan" size="sm">
                                {p.game}
                              </Badge>
                              {p.inGameRole && (
                                <span className="text-[10px] font-mono text-text-secondary">
                                  {p.inGameRole}
                                </span>
                              )}
                              {p.region && (
                                <span className="text-[10px] font-mono text-text-muted">
                                  {REGION_LABEL[p.region]}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                              {p.description}
                            </p>
                            <div className="flex items-center justify-between gap-3 mt-2 text-[10px] font-mono text-text-muted">
                              <span>{formatRelative(p.createdAt)}</span>
                              <div className="flex items-center gap-3">
                                {!isMine && user && (
                                  <Link
                                    href={`/profile/${p.author.username}`}
                                    className="text-cyan-300 hover:text-cyan-200"
                                  >
                                    Профиль →
                                  </Link>
                                )}
                                {isMine && (
                                  <form action={deactivateLfgPost}>
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={p.id}
                                    />
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

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-16 self-start">
              {user ? (
                <div className="rounded border border-border-default bg-bg-panel p-5">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-4">
                    Опубликовать заявку
                  </h2>
                  <LfgForm />
                </div>
              ) : (
                <div className="rounded border border-dashed border-border-strong bg-bg-panel/50 p-6 text-center text-sm text-text-secondary">
                  <p className="mb-3">
                    Войди через Steam, чтобы публиковать заявки.
                  </p>
                  <Link href="/api/auth/steam">
                    <Button size="md">Войти через Steam</Button>
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
