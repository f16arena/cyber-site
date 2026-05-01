export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/session";
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

const GAME_ACCENT: Record<Game, string> = {
  CS2: "border-orange-500/40 bg-orange-500/5",
  DOTA2: "border-rose-500/40 bg-rose-500/5",
  PUBG: "border-yellow-500/40 bg-yellow-500/5",
};

const VALID_REGIONS = Object.keys(REGION_LABEL) as Region[];

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
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
              // Teams
            </p>
            <h1 className="text-4xl font-black tracking-tight">Команды</h1>
            <p className="text-zinc-400 mt-2">
              {teams.length} {pluralRu(teams.length, "команда", "команды", "команд")} в базе
            </p>
          </div>
          {user && (
            <Link
              href="/teams/new"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
            >
              + Создать команду
            </Link>
          )}
        </div>

        <form className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Поиск по названию или тегу"
            className="flex-1 min-w-[220px] bg-zinc-900/60 border border-zinc-700 rounded h-10 px-4 text-sm focus:outline-none focus:border-violet-400"
          />
          {validGame && <input type="hidden" name="game" value={validGame.toLowerCase()} />}
          {validRegion && <input type="hidden" name="region" value={validRegion.toLowerCase()} />}
          <button
            type="submit"
            className="h-10 px-5 rounded font-mono text-xs uppercase tracking-wider border border-violet-500/40 text-violet-200 hover:bg-violet-500/15"
          >
            Искать
          </button>
          {(q || validGame || validRegion) && (
            <Link
              href="/teams"
              className="h-10 inline-flex items-center px-3 text-xs font-mono text-zinc-500 hover:text-rose-300"
            >
              ✕ сбросить
            </Link>
          )}
        </form>

        <div className="flex gap-2 mb-3 flex-wrap">
          {GAME_FILTERS.map((f) => {
            const active =
              (f.value === "ALL" && !validGame) ||
              (validGame && f.value === validGame);
            const linkParams = new URLSearchParams();
            if (f.value !== "ALL") linkParams.set("game", f.value.toLowerCase());
            if (validRegion) linkParams.set("region", validRegion.toLowerCase());
            if (q) linkParams.set("q", q);
            const href = "/teams" + (linkParams.toString() ? `?${linkParams}` : "");
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

        <div className="flex gap-1.5 mb-6 flex-wrap">
          {([null, ...VALID_REGIONS] as Array<Region | null>).map((r) => {
            const active = (r === null && !validRegion) || r === validRegion;
            const linkParams = new URLSearchParams();
            if (r) linkParams.set("region", r.toLowerCase());
            if (validGame) linkParams.set("game", validGame.toLowerCase());
            if (q) linkParams.set("q", q);
            const href = "/teams" + (linkParams.toString() ? `?${linkParams}` : "");
            return (
              <Link
                key={r ?? "ALL"}
                href={href}
                className={`px-3 h-7 inline-flex items-center text-[11px] font-mono rounded border transition-all ${
                  active
                    ? "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/50"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {r === null ? "Все регионы" : REGION_LABEL[r]}
              </Link>
            );
          })}
        </div>

        {teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <p className="mb-4 text-lg">Пока нет ни одной команды.</p>
            {user ? (
              <Link
                href="/teams/new"
                className="text-violet-300 hover:text-violet-200 font-mono"
              >
                Создать первую команду →
              </Link>
            ) : (
              <Link
                href="/api/auth/steam"
                className="text-violet-300 hover:text-violet-200 font-mono"
              >
                Войти через Steam →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.tag}`}
                className={`group rounded-lg border ${GAME_ACCENT[team.game]} hover:bg-zinc-900/70 transition-all p-5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                    {team.game}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    [{team.tag}]
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight group-hover:text-violet-200 transition-colors">
                  {team.name}
                </h3>
                {team.region && (
                  <p className="text-xs font-mono text-zinc-500 mt-1">
                    📍 {REGION_LABEL[team.region] || team.region}
                  </p>
                )}
                {team.description && (
                  <p className="text-sm text-zinc-400 mt-3 line-clamp-2">
                    {team.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/60 text-xs font-mono">
                  <span className="text-zinc-500">
                    {team._count.members}/5 игроков
                  </span>
                  <span className="text-violet-300">
                    {team.rating} pts
                  </span>
                </div>
                <div className="mt-3 text-xs text-zinc-500 flex items-center gap-2">
                  Капитан:
                  <span className="text-zinc-300">{team.captain.username}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
