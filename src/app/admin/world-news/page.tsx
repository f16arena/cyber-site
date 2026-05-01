export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteWorldNews } from "../actions";

export default async function AdminWorldNewsPage() {
  await requireAdmin();
  const items = await prisma.worldNews.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tight">
            Мировые новости
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Трансферы, результаты, события профессиональной сцены
          </p>
        </div>
        <Link
          href="/admin/world-news/new"
          className="inline-flex items-center justify-center h-10 px-5 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500"
        >
          + Новая
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          Новостей нет. <Link href="/admin/world-news/new" className="text-violet-300">Создать →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const tr = n.translations as Record<string, { title: string }> | null;
            const langs = tr
              ? Object.keys(tr).filter((k) => tr[k]?.title)
              : [n.originalLang];
            return (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30">
                      {n.category}
                    </span>
                    {n.game && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                        {n.game}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-zinc-500">
                      {n.publishedAt.toLocaleDateString("ru-RU")}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {langs.length === 3 ? "✓ RU/KK/EN" : `${langs.join("/")}`}
                    </span>
                  </div>
                  <Link
                    href={`/world-news/${n.id}`}
                    className="font-bold hover:text-violet-200"
                  >
                    {n.title}
                  </Link>
                  {n.sourceName && (
                    <div className="text-xs font-mono text-zinc-500 mt-1">
                      {n.sourceName}
                    </div>
                  )}
                </div>
                <form action={deleteWorldNews}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-xs font-mono px-3 h-8 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
                  >
                    Удалить
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
