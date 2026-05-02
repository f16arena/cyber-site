export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SeasonForm } from "./form";

export default async function AdminSeasonsPage() {
  await requireAdmin();
  const seasons = await prisma.season.findMany({
    orderBy: { startsAt: "desc" },
  });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight mb-6">Сезоны</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section>
          {seasons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              <p>Сезонов ещё нет.</p>
              <p className="text-sm mt-2">
                Создай первый — например, &quot;Spring 2026&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{s.name}</span>
                    {s.game && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        {s.game}
                      </span>
                    )}
                    {s.isActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    {s.startsAt.toLocaleDateString("ru-RU")} —{" "}
                    {s.endsAt.toLocaleDateString("ru-RU")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <aside>
          <div className="rounded-lg border border-violet-500/20 bg-zinc-900/40 p-5 lg:sticky lg:top-20">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Новый сезон
            </h2>
            <SeasonForm />
          </div>
        </aside>
      </div>
    </main>
  );
}
