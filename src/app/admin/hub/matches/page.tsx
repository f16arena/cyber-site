export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { displayNameFor } from "@/lib/hub/maps";
import { FinishMatchForm } from "./finish-form";

const STATE_STYLE: Record<string, string> = {
  PENDING: "bg-zinc-700/30 text-zinc-300 border-zinc-700",
  WARMUP: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  CANCELLED: "bg-zinc-700/30 text-zinc-500 border-zinc-700",
};

export default async function AdminHubMatchesPage() {
  await requireAdmin();

  const matches = await prisma.hubMatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      state: true,
      map: true,
      scoreA: true,
      scoreB: true,
      winner: true,
      connectString: true,
      createdAt: true,
      finishedAt: true,
      teamAPlayerIds: true,
      teamBPlayerIds: true,
      server: { select: { name: true, ip: true, port: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">CS2 матчи</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Активные матчи можно завершить вручную со счётом — ELO игроков
          пересчитается автоматически, сервер освободится. На MVP это
          основной путь финализации. Когда подключим MatchZy webhook, результат
          будет приходить сам.
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
          Пока не сыграно ни одного матча.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isActive =
              m.state === "PENDING" ||
              m.state === "WARMUP" ||
              m.state === "LIVE";
            return (
              <div
                key={m.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        STATE_STYLE[m.state]
                      }`}
                    >
                      {m.state}
                    </span>
                    <Link
                      href={`/ru/hub/match/${m.id}`}
                      className="font-mono text-xs text-violet-300 hover:text-violet-200"
                    >
                      #{m.id.slice(0, 10)}
                    </Link>
                    <span className="text-sm font-bold">
                      {displayNameFor(m.map)}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      {m.server?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black tabular-nums">
                      <span className="text-orange-300">{m.scoreA}</span>
                      <span className="text-zinc-600 mx-1">:</span>
                      <span className="text-rose-300">{m.scoreB}</span>
                    </span>
                    {m.winner && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                        WIN: {m.winner}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 mb-3 flex-wrap">
                  <span>{m.connectString}</span>
                  <span>
                    Создан: {m.createdAt.toLocaleString("ru-RU")}
                  </span>
                  {m.finishedAt && (
                    <span>
                      Завершён: {m.finishedAt.toLocaleString("ru-RU")}
                    </span>
                  )}
                  <span>
                    A: {m.teamAPlayerIds.length} / B: {m.teamBPlayerIds.length}
                  </span>
                </div>

                {isActive && (
                  <div className="border-t border-zinc-800 pt-3">
                    <FinishMatchForm matchId={m.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
