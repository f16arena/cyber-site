export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CreateServerForm } from "./create-form";
import { RowActions } from "./row-actions";

const STATUS_STYLE: Record<string, string> = {
  FREE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  RESERVED: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  OFFLINE: "bg-zinc-700/30 text-zinc-400 border-zinc-700",
};

export default async function AdminHubServersPage() {
  await requireAdmin();

  const servers = await prisma.hubServer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      ip: true,
      port: true,
      status: true,
      reservedForLobbyId: true,
      notes: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">CS2 серверы</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Зарегистрированные dedicated-серверы для матчмейкинга. Один сервер ↔
          один матч. На MVP RCON-команды только логируются (stub) —
          реальная отправка будет на этапе 6 с фича-флагом{" "}
          <code className="text-zinc-300">HUB_RCON_LIVE=true</code>.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-3">
          Добавить сервер
        </h2>
        <CreateServerForm />
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-3">
          Все серверы ({servers.length})
        </h2>
        {servers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
            Пока нет ни одного сервера. Добавьте хотя бы один — без него очередь
            не сможет создать матч после veto.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
                <tr>
                  <th className="text-left px-4 py-2">Имя</th>
                  <th className="text-left px-4 py-2">IP:Port</th>
                  <th className="text-left px-4 py-2">Статус</th>
                  <th className="text-left px-4 py-2">Лобби</th>
                  <th className="text-right px-4 py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {servers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="font-bold">{s.name}</div>
                      {s.notes && (
                        <div className="text-[11px] text-zinc-500">{s.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s.ip}:{s.port}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          STATUS_STYLE[s.status]
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                      {s.reservedForLobbyId
                        ? s.reservedForLobbyId.slice(0, 10) + "…"
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions id={s.id} status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
