export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { markInquiryHandled } from "../actions";

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Бронза",
  SILVER: "Серебро",
  GOLD: "Золото",
  PLATINUM: "Платина",
};

export default async function AdminInquiriesPage() {
  await requireAdmin();
  const inquiries = await prisma.sponsorshipInquiry.findMany({
    orderBy: [{ isHandled: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const open = inquiries.filter((i) => !i.isHandled);
  const handled = inquiries.filter((i) => i.isHandled);

  return (
    <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight mb-6">
        Заявки от спонсоров
      </h1>

      <section className="mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
          Новые ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-zinc-400">Новых заявок нет.</p>
        ) : (
          <div className="space-y-3">
            {open.map((i) => (
              <div
                key={i.id}
                className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold">{i.companyName}</span>
                      {i.tier && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          {TIER_LABEL[i.tier]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-zinc-400">
                      {i.contactName} · {i.email}
                      {i.phone && ` · ${i.phone}`}
                    </div>
                    {i.message && (
                      <p className="text-sm text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap">
                        {i.message}
                      </p>
                    )}
                  </div>
                  <form action={markInquiryHandled}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      type="submit"
                      className="text-xs font-mono px-3 h-8 rounded border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300"
                    >
                      ✓ Обработано
                    </button>
                  </form>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-3">
                  Поступила {i.createdAt.toLocaleString("ru-RU")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Обработанные ({handled.length})
          </h2>
          <div className="space-y-2">
            {handled.map((i) => (
              <div
                key={i.id}
                className="rounded border border-zinc-800 bg-zinc-900/30 p-3 text-sm opacity-70"
              >
                <span className="font-bold">{i.companyName}</span>
                <span className="text-xs font-mono text-zinc-500 ml-2">
                  {i.email} · {i.createdAt.toLocaleDateString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
