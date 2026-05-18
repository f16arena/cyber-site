export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/session";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Game, Region } from "@prisma/client";

const GAME_FILTERS: Array<{ value: Game | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
];

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

const VALID_REGIONS = Object.keys(REGION_LABEL) as Region[];

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export default async function TeamsPage({
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

  const [teams, user] = await Promise.all([
    prisma.team.findMany({
      where: {
        ...(validGame ? { game: validGame } : {}),
        ...(validRegion ? { region: validRegion } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { tag: { contains: q.toUpperCase() } },
              ],
            }
          : {}),
      },
      include: {
        captain: { select: { username: true, avatarUrl: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
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
            title="Команды"
            subtitle={`${teams.length} ${pluralRu(teams.length, "команда", "команды", "команд")} в базе`}
            actions={
              user && (
                <Link href="/teams/new">
                  <Button size="md">+ Создать команду</Button>
                </Link>
              )
            }
          />

          {/* Search */}
          <form className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Поиск по названию или тегу"
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
                href="/teams"
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
                "/teams" + (linkParams.toString() ? `?${linkParams}` : "");
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
              const active = (r === null && !validRegion) || r === validRegion;
              const linkParams = new URLSearchParams();
              if (r) linkParams.set("region", r.toLowerCase());
              if (validGame) linkParams.set("game", validGame.toLowerCase());
              if (q) linkParams.set("q", q);
              const href =
                "/teams" + (linkParams.toString() ? `?${linkParams}` : "");
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

          {teams.length === 0 ? (
            <EmptyState
              title="Пока нет ни одной команды"
              description={
                user ? "Создайте первую" : "Войдите чтобы создать команду"
              }
              action={
                user ? (
                  <Link href="/teams/new">
                    <Button size="sm">Создать команду</Button>
                  </Link>
                ) : (
                  <Link href="/api/auth/steam">
                    <Button size="sm">Войти через Steam</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.tag}`}
                  className="group rounded border border-border-default bg-bg-panel hover:border-cyan-500/40 hover:bg-bg-elevated transition-colors p-4"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <Badge variant="cyan" size="sm">
                      {team.game}
                    </Badge>
                    <span className="text-xs font-mono text-text-muted">
                      [{team.tag}]
                    </span>
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-text-primary group-hover:text-cyan-300 transition-colors">
                    {team.name}
                  </h3>
                  {team.region && (
                    <p className="text-[11px] font-mono text-text-muted mt-0.5">
                      {REGION_LABEL[team.region] || team.region}
                    </p>
                  )}
                  {team.description && (
                    <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-default text-xs font-mono">
                    <span className="text-text-muted">
                      {team._count.members}/5 игроков
                    </span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      {team.rating} pts
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-muted flex items-center gap-1.5">
                    <span>Капитан:</span>
                    <span className="text-text-secondary">
                      {team.captain.username}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
