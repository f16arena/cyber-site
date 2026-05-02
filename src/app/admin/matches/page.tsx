export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-zinc-700/30 text-zinc-300",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-zinc-700/30 text-zinc-500",
  WALKOVER: "bg-amber-500/15 text-amber-300",
};

export default async function AdminMatchesPage() {
  await requireAdmin();

  const matches = await prisma.match.findMany({
    include: {
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
      tournament: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight mb-6">
        Матчи ({matches.length})
      </h1>
      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          Матчей пока нет. Создай турнир и сгенерируй сетку, матчи появятся
          автоматически.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/admin/matches/${m.id}`}
              className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors text-sm"
            >
              <span
                className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${STATUS_COLOR[m.status]}`}
              >
                {m.status}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {m.teamA?.name ?? "TBD"}{" "}
                  <span className="text-zinc-500 font-mono mx-2">
                    {m.scoreA}:{m.scoreB}
                  </span>
                  {m.teamB?.name ?? "TBD"}
                </div>
                <div className="text-xs font-mono text-zinc-500 mt-0.5">
                  {m.tournament?.name || "—"} · {m.stage ?? "—"}
                  {m.map && ` · ${m.map}`}
                </div>
              </div>
              <span className="text-violet-300 text-xs font-mono">→</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
