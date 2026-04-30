export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";


const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Черновик",
  REGISTRATION_OPEN: "Регистрация",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  ONGOING: "Идёт",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-700/30 text-zinc-300",
  REGISTRATION_OPEN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  REGISTRATION_CLOSED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ONGOING: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  COMPLETED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  CANCELLED: "bg-zinc-700/30 text-zinc-500",
};

export default async function AdminTournamentsPage() {
  await requireAdmin();

  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: { select: { registrations: true, matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <Link
          href="/admin"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Админка
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
              // Tournaments
            </p>
            <h1 className="text-3xl font-black tracking-tight">Турниры</h1>
          </div>
          <Link
            href="/admin/tournaments/new"
            className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
          >
            + Новый турнир
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <p className="mb-4 text-lg">Турниров ещё нет.</p>
            <Link
              href="/admin/tournaments/new"
              className="text-violet-300 hover:text-violet-200 font-mono"
            >
              Создать первый турнир →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tournaments/${t.id}`}
                className="block rounded-lg border border-zinc-800 hover:border-violet-500/40 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all p-5"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                        {t.game}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${STATUS_COLOR[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight">
                      {t.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono text-zinc-400">
                      <span>{t.format}</span>
                      <span>
                        🏆 ₸{" "}
                        {(Number(t.prize) / 100).toLocaleString("ru-RU")}
                      </span>
                      <span>
                        {t._count.registrations}/{t.maxTeams} команд
                      </span>
                      <span>{t._count.matches} матчей</span>
                    </div>
                  </div>
                  <div className="text-violet-300 text-sm font-mono">
                    Управлять →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
    </>
  );
}
