export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/ImageUploader";
import { uploadNewsCover } from "../../actions";

export default async function AdminNewsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const news = await prisma.news.findUnique({ where: { id } });
  if (!news) notFound();

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <Link
        href="/admin/news"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Новости
      </Link>
      <h1 className="text-2xl font-display font-black tracking-tight mb-2">
        {news.title}
      </h1>
      <p className="text-zinc-400 mb-8 text-sm font-mono">
        /news/{news.slug} · {news.category}
      </p>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Обложка
        </h2>
        <ImageUploader
          currentUrl={news.coverUrl}
          action={uploadNewsCover}
          extraFields={{ newsId: news.id }}
          label="Cover"
          hint="PNG / JPG / WebP до 1 МБ. Лучше 16:9, например 1280×720."
        />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Содержимое
        </h2>
        {news.excerpt && (
          <p className="text-sm text-zinc-300 mb-3 italic">{news.excerpt}</p>
        )}
        <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
          {news.body}
        </div>
        <p className="text-xs text-zinc-500 mt-4 font-mono">
          ⚠ Редактирование текста через UI пока не сделано — правь в Supabase
          Studio (Dashboard → Table Editor → News).
        </p>
      </section>
    </main>
  );
}
