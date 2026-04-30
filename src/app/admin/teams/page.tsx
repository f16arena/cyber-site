export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const teams = await prisma.team.findMany({
    include: {
      captain: { select: { username: true } },
      _count: { select: { members: true, registrations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <h1 className="text-2xl font-black tracking-tight mb-6">
        Команды ({teams.length})
      </h1>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          Команд пока нет.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.tag}`}
              className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="w-10 h-10 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center font-black">
                {t.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{t.name}</div>
                <div className="text-xs font-mono text-zinc-500">
                  [{t.tag}] · {t.game} · капитан {t.captain.username}
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400 hidden sm:block text-right">
                <div>{t._count.members} игроков</div>
                <div>{t._count.registrations} турниров</div>
              </div>
              <span className="text-violet-300 text-xs font-mono">→</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
