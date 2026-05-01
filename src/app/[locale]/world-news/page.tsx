export const dynamic = "force-dynamic";

import Link from "next/link";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import type { Game } from "@prisma/client";

const CATEGORY_LABEL: Record<string, { ru: string; kk: string; en: string }> = {
  TOURNAMENT_RESULT: { ru: "Результаты", kk: "Нәтижелер", en: "Results" },
  TRANSFER: { ru: "Трансферы", kk: "Трансферлер", en: "Transfers" },
  ROSTER_CHANGE: { ru: "Состав", kk: "Құрам", en: "Roster" },
  ANNOUNCEMENT: { ru: "Анонс", kk: "Жариялау", en: "Announcement" },
  GENERAL: { ru: "Общее", kk: "Жалпы", en: "General" },
};

const PAGE_TITLE: Record<string, string> = {
  ru: "Мировые новости",
  kk: "Әлемдік жаңалықтар",
  en: "World News",
};

const PAGE_SUBTITLE: Record<string, string> = {
  ru: "Трансферы, результаты турниров и события в CS2, Dota 2 и PUBG",
  kk: "CS2, Dota 2 және PUBG трансферлері, турнир нәтижелері мен оқиғалары",
  en: "Transfers, tournament results and events in CS2, Dota 2 and PUBG",
};

type Translated = {
  title: string;
  excerpt: string | null;
  body: string;
};

function pickLang(
  newsItem: {
    title: string;
    excerpt: string | null;
    body: string;
    originalLang: string;
    translations: unknown;
  },
  locale: string
): Translated {
  const tr = newsItem.translations as Record<string, Translated> | null;
  if (tr && tr[locale]) return tr[locale];
  // fallback на оригинал
  return {
    title: newsItem.title,
    excerpt: newsItem.excerpt,
    body: newsItem.body,
  };
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function WorldNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; category?: string }>;
}) {
  const locale = await getLocale();
  const { game, category } = await searchParams;
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(game?.toUpperCase() ?? "")
    ? (game!.toUpperCase() as Game)
    : null;
  const validCategory = [
    "TOURNAMENT_RESULT",
    "TRANSFER",
    "ROSTER_CHANGE",
    "ANNOUNCEMENT",
  ].includes(category ?? "")
    ? (category as
        | "TOURNAMENT_RESULT"
        | "TRANSFER"
        | "ROSTER_CHANGE"
        | "ANNOUNCEMENT")
    : null;

  const items = await prisma.worldNews.findMany({
    where: {
      isPublished: true,
      ...(validGame ? { game: validGame } : {}),
      ...(validCategory ? { category: validCategory } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Global · Pro Scene
          </p>
          <h1 className="text-4xl font-display font-black tracking-tight">
            {PAGE_TITLE[locale] ?? PAGE_TITLE.ru}
          </h1>
          <p className="text-zinc-400 mt-2">
            {PAGE_SUBTITLE[locale] ?? PAGE_SUBTITLE.ru}
          </p>
        </div>

        {/* Game filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { v: "ALL", label: "All" },
            { v: "CS2", label: "CS2" },
            { v: "DOTA2", label: "Dota 2" },
            { v: "PUBG", label: "PUBG" },
          ].map((f) => {
            const active =
              (f.v === "ALL" && !validGame) ||
              (validGame && f.v === validGame);
            const url = new URLSearchParams();
            if (f.v !== "ALL") url.set("game", f.v.toLowerCase());
            if (validCategory) url.set("category", validCategory);
            const href = url.toString() ? `/world-news?${url}` : "/world-news";
            return (
              <Link
                key={f.v}
                href={href}
                className={`px-4 h-9 inline-flex items-center text-sm font-mono rounded border transition-all ${
                  active
                    ? "bg-violet-500/15 text-violet-200 border-violet-500/50"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(["ALL", "TRANSFER", "TOURNAMENT_RESULT", "ROSTER_CHANGE", "ANNOUNCEMENT"] as const).map(
            (c) => {
              const active =
                (c === "ALL" && !validCategory) ||
                (validCategory && c === validCategory);
              const url = new URLSearchParams();
              if (validGame) url.set("game", validGame.toLowerCase());
              if (c !== "ALL") url.set("category", c);
              const href = url.toString() ? `/world-news?${url}` : "/world-news";
              const label =
                c === "ALL"
                  ? locale === "ru" ? "Все" : locale === "kk" ? "Барлығы" : "All"
                  : CATEGORY_LABEL[c]?.[locale as "ru" | "kk" | "en"] ?? c;
              return (
                <Link
                  key={c}
                  href={href}
                  className={`px-3 h-8 inline-flex items-center text-xs font-mono rounded border transition-all ${
                    active
                      ? "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/50"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                  }`}
                >
                  {label}
                </Link>
              );
            }
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <div className="text-4xl mb-3">🌍</div>
            <p className="font-bold mb-2 text-zinc-300">
              {locale === "ru"
                ? "Пока нет мировых новостей"
                : locale === "kk"
                  ? "Әлемдік жаңалықтар әлі жоқ"
                  : "No world news yet"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const t = pickLang(item, locale);
              const cat = CATEGORY_LABEL[item.category]?.[locale as "ru" | "kk" | "en"] ?? item.category;
              return (
                <Link
                  key={item.id}
                  href={`/world-news/${item.id}`}
                  className="group rounded-xl border border-zinc-800 hover:border-violet-500/40 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors overflow-hidden"
                >
                  {item.imageUrl ? (
                    <div className="aspect-[16/9] bg-zinc-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-zinc-900 flex items-center justify-center">
                      <span className="font-mono text-zinc-700 text-2xl">
                        {item.game ?? "ESPORTS"}
                      </span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30">
                        {cat}
                      </span>
                      {item.game && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                          {item.game}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-zinc-500">
                        {formatDate(item.publishedAt, locale)}
                      </span>
                    </div>
                    <h3 className="font-bold leading-tight group-hover:text-violet-200 transition-colors line-clamp-2">
                      {t.title}
                    </h3>
                    {t.excerpt && (
                      <p className="text-sm text-zinc-400 mt-2 line-clamp-3">
                        {t.excerpt}
                      </p>
                    )}
                    {item.sourceName && (
                      <p className="text-[10px] font-mono text-zinc-500 mt-3">
                        Источник: {item.sourceName}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
