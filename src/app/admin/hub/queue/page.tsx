export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { KickButton } from "./kick-button";

function waitTime(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  const m = Math.floor(diff / 60);
  const s = Math.floor(diff % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATUS_STYLE: Record<string, string> = {
  SEARCHING: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  READY_CHECK: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  MATCHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  CANCELLED: "bg-zinc-700/30 text-zinc-500 border-zinc-700",
};

export default async function AdminHubQueuePage() {
  await requireAdmin();

  const tickets = await prisma.hubQueueTicket.findMany({
    where: { status: { in: ["SEARCHING", "READY_CHECK", "MATCHED"] } },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      status: true,
      elo: true,
      joinedAt: true,
      readyCheckId: true,
      user: {
        select: {
          id: true,
          username: true,
          steamId: true,
          avatarUrl: true,
          hubElo: true,
        },
      },
    },
  });

  const counts = {
    searching: tickets.filter((t) => t.status === "SEARCHING").length,
    readyCheck: tickets.filter((t) => t.status === "READY_CHECK").length,
    matched: tickets.filter((t) => t.status === "MATCHED").length,
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">Очередь CS2 MM</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Все активные тикеты очереди в порядке вхождения. На странице
          показан снапшот — обновляется при reload.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <span className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-orange-500/40 bg-orange-500/10 text-orange-300">
          В поиске: {counts.searching}
        </span>
        <span className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
          Ready-check: {counts.readyCheck}
        </span>
        <span className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          Matched: {counts.matched}
        </span>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
          Очередь пуста.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
              <tr>
                <th className="text-left px-4 py-2">Игрок</th>
                <th className="text-left px-4 py-2">SteamID64</th>
                <th className="text-right px-4 py-2">ELO</th>
                <th className="text-right px-4 py-2">В очереди</th>
                <th className="text-left px-4 py-2">Статус</th>
                <th className="text-right px-4 py-2">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.user.avatarUrl}
                          alt={t.user.username}
                          className="w-7 h-7 rounded object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                          {t.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold truncate">
                        {t.user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                    {t.user.steamId}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-orange-300">
                    {t.elo}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {waitTime(t.joinedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        STATUS_STYLE[t.status]
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <KickButton ticketId={t.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
