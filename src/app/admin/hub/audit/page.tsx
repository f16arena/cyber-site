export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const KIND_COLORS: Record<string, string> = {
  QUEUE_JOIN: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  QUEUE_LEAVE: "bg-zinc-700/40 text-zinc-300 border-zinc-700",
  READY_CHECK_STARTED: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  READY_CHECK_ACCEPTED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  READY_DECLINE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  READY_TIMEOUT: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  LOBBY_CREATED: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  LOBBY_PICK: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  VETO_BAN: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
  VETO_FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  SERVER_ALLOCATED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  NO_SERVER_AVAILABLE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  MATCH_FINISH: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  MATCH_CANCEL: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  ADMIN_BAN: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  ADMIN_UNBAN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  ADMIN_CANCEL_LOBBY: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  ADMIN_KICK_QUEUE: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  RCON_STUB: "bg-zinc-700/40 text-zinc-400 border-zinc-700",
  MATCHZY_WEBHOOK: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
};

const PAGE_SIZE = 50;

export default async function AdminHubAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; user?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const kindFilter = sp.kind?.trim() || undefined;
  const userQuery = sp.user?.trim() || undefined;

  let userIdFilter: string | undefined;
  if (userQuery) {
    const u = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: userQuery, mode: "insensitive" } },
          { steamId: userQuery },
        ],
      },
      select: { id: true },
    });
    userIdFilter = u?.id ?? "__none__"; // невалидный id, чтобы выдача была пустой
  }

  const where = {
    ...(kindFilter ? { kind: kindFilter } : {}),
    ...(userIdFilter ? { userId: userIdFilter } : {}),
  };

  const [events, total, kindCounts] = await Promise.all([
    prisma.hubAuditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        userId: true,
        kind: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.hubAuditEvent.count({ where }),
    prisma.hubAuditEvent.groupBy({
      by: ["kind"],
      _count: { kind: true },
      orderBy: { _count: { kind: "desc" } },
      take: 12,
    }),
  ]);

  const userIds = events
    .map((e) => e.userId)
    .filter((u): u is string => !!u);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      })
    : [];
  const usernameById = new Map(users.map((u) => [u.id, u.username]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">Журнал событий</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Аудит-лог HubAuditEvent: queue, ready-check, лобби, veto, серверы,
          матчи, бан/cooldown, действия админов. Помогает разобрать
          «что произошло» при инцидентах.
        </p>
      </header>

      <form className="flex items-center gap-2 flex-wrap">
        <input
          name="user"
          defaultValue={userQuery ?? ""}
          placeholder="ник или steamId"
          className="h-10 w-60 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 outline-none"
        />
        <select
          name="kind"
          defaultValue={kindFilter ?? ""}
          className="h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 outline-none"
        >
          <option value="">Все события</option>
          {kindCounts.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.kind} ({k._count.kind})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded bg-violet-500/20 border border-violet-500/40 text-violet-100 text-sm font-bold"
        >
          Применить
        </button>
        {(kindFilter || userQuery) && (
          <Link
            href="/admin/hub/audit"
            className="h-10 px-3 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs font-mono inline-flex items-center"
          >
            сбросить
          </Link>
        )}
      </form>

      <div className="text-[11px] font-mono text-zinc-500">
        Найдено: {total} событий · страница {page} / {totalPages}
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
            <tr>
              <th className="text-left px-4 py-2 w-44">Время</th>
              <th className="text-left px-4 py-2 w-40">Событие</th>
              <th className="text-left px-4 py-2 w-40">Игрок</th>
              <th className="text-left px-4 py-2">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                  Нет событий по фильтру
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                  {e.createdAt.toLocaleString("ru-RU")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      KIND_COLORS[e.kind] ??
                      "bg-zinc-700/40 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {e.kind}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {e.userId ? usernameById.get(e.userId) ?? e.userId.slice(0, 8) : "—"}
                </td>
                <td className="px-4 py-3">
                  <code className="text-[10px] font-mono text-zinc-400 break-all">
                    {e.payload ? JSON.stringify(e.payload) : "—"}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {page > 1 && (
            <Link
              href={`/admin/hub/audit?page=${page - 1}${
                kindFilter ? `&kind=${kindFilter}` : ""
              }${userQuery ? `&user=${encodeURIComponent(userQuery)}` : ""}`}
              className="h-9 px-3 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-mono inline-flex items-center"
            >
              ← Назад
            </Link>
          )}
          <span className="text-[11px] font-mono text-zinc-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/hub/audit?page=${page + 1}${
                kindFilter ? `&kind=${kindFilter}` : ""
              }${userQuery ? `&user=${encodeURIComponent(userQuery)}` : ""}`}
              className="h-9 px-3 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-mono inline-flex items-center"
            >
              Далее →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
