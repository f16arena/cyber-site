export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import type { MatchStatus } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Запланирован",
  LIVE: "LIVE",
  FINISHED: "Завершён",
  CANCELLED: "Отменён",
  WALKOVER: "Walkover",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-zinc-700/30 text-zinc-300",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-zinc-700/30 text-zinc-500",
  WALKOVER: "bg-amber-500/15 text-amber-300",
};

const FILTERS: Array<{ value: MatchStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "LIVE", label: "Live" },
  { value: "SCHEDULED", label: "Скоро" },
  { value: "FINISHED", label: "Завершённые" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const validStatus = ["LIVE", "SCHEDULED", "FINISHED"].includes(params.status ?? "")
    ? (params.status as MatchStatus)
    : null;

  const matches = await prisma.match.findMany({
    where: validStatus ? { status: validStatus } : {},
    include: {
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
      tournament: { select: { name: true, slug: true, game: true } },
    },
    orderBy: [
      { status: "asc" },
      { startsAt: "asc" },
      { finishedAt: "desc" },
    ],
    take: 100,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Matches
          </p>
          <h1 className="text-4xl font-black tracking-tight">Матчи</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => {
            const active =
              (f.value === "ALL" && !validStatus) ||
              (validStatus && f.value === validStatus);
            const href =
              f.value === "ALL" ? "/matches" : `/matches?status=${f.value}`;
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

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <p className="text-lg mb-2">Матчей пока нет.</p>
            <p className="text-sm">Создайте турнир и сгенерируйте сетку.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-1 rounded border w-20 text-center ${STATUS_COLOR[m.status]}`}
                >
                  {STATUS_LABEL[m.status]}
                </span>
                {m.status === "LIVE" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">
                    {m.teamA?.name ?? "TBD"}{" "}
                    <span className="text-zinc-500 font-mono mx-2">
                      {m.scoreA}:{m.scoreB}
                    </span>
                    {m.teamB?.name ?? "TBD"}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-0.5">
                    {m.tournament ? (
                      <>
                        {m.tournament.game} · {m.tournament.name}
                      </>
                    ) : (
                      "—"
                    )}
                    {m.stage && ` · ${m.stage}`}
                    {m.map && ` · ${m.map}`}
                  </div>
                </div>
                <div className="text-xs font-mono text-zinc-500 hidden sm:block">
                  {m.startsAt
                    ? new Date(m.startsAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
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
