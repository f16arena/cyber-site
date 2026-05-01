export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

import { toggleAdmin } from "../actions";

export default async function AdminUsersPage() {
  const me = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { teamMemberships: true, mvpAwards: true } },
    },
  });

  return (
    <>
      
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <Link
          href="/admin"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Админка
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-6">
          Игроки ({users.length})
        </h1>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
            >
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt={u.username}
                  className="w-10 h-10 rounded border border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-violet-500/20" />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/players/${encodeURIComponent(u.username)}`}
                  className="font-bold hover:text-violet-200"
                >
                  {u.username}
                </Link>
                {u.isAdmin && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 ml-2">
                    ADMIN
                  </span>
                )}
                <div className="text-xs font-mono text-zinc-500 mt-0.5">
                  Steam: {u.steamId} · Команд:{" "}
                  {u._count.teamMemberships} · MVP: {u._count.mvpAwards}
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {new Date(u.createdAt).toLocaleDateString("ru-RU")}
              </span>
              {u.id !== me.id && (
                <form action={toggleAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className={`text-xs font-mono px-3 h-8 rounded border transition-all ${
                      u.isAdmin
                        ? "border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
                        : "border-zinc-700 hover:border-amber-400 hover:bg-amber-500/10"
                    }`}
                  >
                    {u.isAdmin ? "Снять админа" : "Сделать админом"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </main>
      
    </>
  );
}
