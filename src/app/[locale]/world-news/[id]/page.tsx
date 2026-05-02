export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

type Translated = { title: string; excerpt: string | null; body: string };

function pickLang(
  newsItem: {
    title: string;
    excerpt: string | null;
    body: string;
    translations: unknown;
  },
  locale: string
): Translated {
  const tr = newsItem.translations as Record<string, Translated> | null;
  if (tr && tr[locale]) return tr[locale];
  return {
    title: newsItem.title,
    excerpt: newsItem.excerpt,
    body: newsItem.body,
  };
}

export default async function WorldNewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const item = await prisma.worldNews.findUnique({ where: { id } });
  if (!item || !item.isPublished) notFound();

  const t = pickLang(item, locale);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/world-news"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← {locale === "kk" ? "Әлемдік жаңалықтар" : locale === "en" ? "World news" : "Мировые новости"}
        </Link>

        <article>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30">
              {item.category}
            </span>
            {item.game && (
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                {item.game}
              </span>
            )}
            <span className="text-[10px] font-mono text-zinc-500">
              {item.publishedAt.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter leading-[1.05] mb-4">
            {t.title}
          </h1>

          {t.excerpt && (
            <p className="text-xl text-zinc-300 leading-relaxed mb-6">
              {t.excerpt}
            </p>
          )}

          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="w-full rounded-xl border border-zinc-800 mb-6"
            />
          )}

          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {t.body}
          </div>

          {item.sourceUrl && (
            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center gap-2 text-sm text-zinc-400">
              <span>
                {locale === "kk" ? "Дереккөз:" : locale === "en" ? "Source:" : "Источник:"}
              </span>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-violet-200"
              >
                {item.sourceName || item.sourceUrl}
              </a>
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
