export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { toggleSponsorActive, deleteSponsor } from "../actions";

const TIER_COLOR: Record<string, string> = {
  BRONZE: "from-amber-700 to-amber-900",
  SILVER: "from-zinc-300 to-zinc-500",
  GOLD: "from-yellow-300 to-amber-600",
  PLATINUM: "from-violet-300 to-fuchsia-500",
};

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Бронза",
  SILVER: "Серебро",
  GOLD: "Золото",
  PLATINUM: "Платина",
};

export default async function AdminSponsorsPage() {
  await requireAdmin();
  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ isActive: "desc" }, { tier: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-black tracking-tight">Спонсоры</h1>
        <Link
          href="/admin/sponsors/new"
          className="inline-flex items-center justify-center h-10 px-5 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
        >
          + Добавить
        </Link>
      </div>

      {sponsors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          <p className="mb-3">Партнёров пока нет.</p>
          <Link
            href="/admin/sponsors/new"
            className="text-violet-300 hover:text-violet-200 font-mono"
          >
            Добавить первого →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg border ${s.isActive ? "border-zinc-800" : "border-zinc-800/50 opacity-60"} bg-zinc-900/40 p-4 flex items-center gap-4 flex-wrap`}
            >
              <div className="w-12 h-12 rounded bg-zinc-800/50 flex items-center justify-center text-xs font-mono text-zinc-500">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logoUrl}
                    alt={s.name}
                    className="max-w-full max-h-full"
                  />
                ) : (
                  "LOGO"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{s.name}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gradient-to-r ${TIER_COLOR[s.tier]} text-white`}
                  >
                    {TIER_LABEL[s.tier]}
                  </span>
                  {!s.isActive && (
                    <span className="text-[9px] font-mono text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                      ARCHIVED
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-zinc-500 mt-0.5">
                  {s.monthlyFeeKzt
                    ? `₸ ${s.monthlyFeeKzt.toLocaleString("ru-RU")} / мес`
                    : "цена не указана"}
                  {s.websiteUrl && (
                    <>
                      {" · "}
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-300 hover:text-violet-200"
                      >
                        {s.websiteUrl}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={toggleSponsorActive}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-3 h-8 rounded border border-zinc-700 hover:border-violet-400 transition-all"
                  >
                    {s.isActive ? "Архивировать" : "Активировать"}
                  </button>
                </form>
                <form action={deleteSponsor}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-3 h-8 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
                  >
                    Удалить
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
