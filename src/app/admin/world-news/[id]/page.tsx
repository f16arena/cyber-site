export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/ImageUploader";
import { uploadWorldNewsCover, deleteWorldNews } from "../../actions";

export default async function AdminWorldNewsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const item = await prisma.worldNews.findUnique({ where: { id } });
  if (!item) notFound();

  const tr = item.translations as Record<string, { title: string }> | null;
  const langs = tr ? Object.keys(tr).filter((k) => tr[k]?.title) : [];

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <Link
        href="/admin/world-news"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Мировые новости
      </Link>
      <h1 className="text-2xl font-display font-black tracking-tight mb-2">
        {item.title}
      </h1>
      <p className="text-zinc-400 mb-8 text-sm font-mono">
        {item.category} · оригинал: {item.originalLang} ·
        {langs.length > 0 ? ` переводы: ${langs.join("/")}` : " без переводов"}
      </p>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Изображение
        </h2>
        <ImageUploader
          currentUrl={item.imageUrl}
          action={uploadWorldNewsCover}
          extraFields={{ id: item.id }}
          label="Image"
          hint="PNG / JPG / WebP до 1 МБ. 16:9 рекомендуется."
        />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Содержимое
        </h2>
        {item.excerpt && (
          <p className="text-sm text-zinc-300 mb-3 italic">{item.excerpt}</p>
        )}
        <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
          {item.body}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
          ⚠ Опасная зона
        </h2>
        <form action={deleteWorldNews}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="text-xs font-mono px-4 h-9 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
          >
            Удалить новость
          </button>
        </form>
      </section>
    </main>
  );
}
