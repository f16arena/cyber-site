export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const CATEGORY_LABEL: Record<string, string> = {
  TOURNAMENT: "Турнир",
  MVP: "MVP",
  SPONSOR: "Спонсоры",
  TEAM: "Команды",
  GENERAL: "Общее",
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.news.findUnique({
    where: { slug },
    include: {
      author: { select: { username: true, avatarUrl: true } },
    },
  });

  if (!article || !article.publishedAt) notFound();

  const related = await prisma.news.findMany({
    where: {
      id: { not: article.id },
      category: article.category,
      publishedAt: { not: null, lte: new Date() },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/news"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Все новости
        </Link>

        <article>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-violet-500/15 text-violet-300 border-violet-500/30">
              {CATEGORY_LABEL[article.category] || article.category}
            </span>
            {article.game && (
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                {article.game}
              </span>
            )}
            <span className="text-[10px] font-mono text-zinc-500">
              {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-[1.05] mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-xl text-zinc-300 leading-relaxed mb-8">
              {article.excerpt}
            </p>
          )}

          {article.author && (
            <div className="flex items-center gap-3 pb-6 mb-8 border-b border-zinc-800">
              {article.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.author.avatarUrl}
                  alt={article.author.username}
                  className="w-8 h-8 rounded border border-zinc-700"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-violet-500/20" />
              )}
              <div className="text-sm">
                <div className="text-zinc-300 font-medium">
                  {article.author.username}
                </div>
                <div className="text-xs font-mono text-zinc-500">Редакция</div>
              </div>
            </div>
          )}

          <div className="prose prose-invert prose-zinc max-w-none whitespace-pre-wrap text-zinc-300 leading-relaxed">
            {article.body}
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-zinc-800">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              По теме
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/news/${r.slug}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 transition-colors p-4"
                >
                  <div className="text-[9px] font-mono uppercase text-violet-400 mb-1">
                    {CATEGORY_LABEL[r.category]}
                  </div>
                  <div className="font-bold text-sm leading-snug">
                    {r.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
