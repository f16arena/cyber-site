export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";


export default async function AdminNewsPage() {
  await requireAdmin();
  const news = await prisma.news.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
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
        <div className="flex items-end justify-between mb-8">
          <h1 className="text-3xl font-black tracking-tight">Новости</h1>
          <Link
            href="/admin/news/new"
            className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
          >
            + Новая
          </Link>
        </div>
        {news.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            <p className="mb-3">Новостей ещё нет.</p>
            <Link
              href="/admin/news/new"
              className="text-violet-300 hover:text-violet-200 font-mono"
            >
              Создать первую →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30">
                      {n.category}
                    </span>
                    {n.publishedAt ? (
                      <span className="text-[10px] font-mono text-emerald-400">
                        ✓ опубликовано {n.publishedAt.toLocaleDateString("ru-RU")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">
                        DRAFT
                      </span>
                    )}
                  </div>
                  <div className="font-bold">{n.title}</div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    /news/{n.slug}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
    </>
  );
}
