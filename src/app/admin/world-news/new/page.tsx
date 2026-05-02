import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { WorldNewsForm } from "./form";

export default async function NewWorldNewsPage() {
  await requireAdmin();
  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <Link
        href="/admin/world-news"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Мировые новости
      </Link>
      <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight mb-6">
        Новая мировая новость
      </h1>
      <WorldNewsForm />
    </main>
  );
}
