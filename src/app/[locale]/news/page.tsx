export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const CATEGORY_LABEL: Record<string, string> = {
  TOURNAMENT: "Турнир",
  MVP: "MVP",
  SPONSOR: "Спонсоры",
  TEAM: "Команды",
  GENERAL: "Общее",
};

function formatRelative(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

export default async function NewsListPage() {
  const news = await prisma.news.findMany({
    where: { publishedAt: { not: null, lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // News
          </p>
          <h1 className="text-4xl font-black tracking-tight">Новости</h1>
        </div>

        {news.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <div className="text-4xl mb-3">📰</div>
            <p className="font-bold mb-2 text-zinc-300">Скоро здесь появятся новости</p>
            <p className="text-sm">
              Турниры, MVP-результаты, объявления о партнёрах.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((n) => (
              <Link
                key={n.id}
                href={`/news/${n.slug}`}
                className="group block rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 hover:bg-zinc-900/70 transition-all p-6"
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30">
                    {CATEGORY_LABEL[n.category] || n.category}
                  </span>
                  {n.game && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                      {n.game}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-500">
                    {n.publishedAt && formatRelative(n.publishedAt)}
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight group-hover:text-violet-200 transition-colors">
                  {n.title}
                </h2>
                {n.excerpt && (
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                    {n.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
