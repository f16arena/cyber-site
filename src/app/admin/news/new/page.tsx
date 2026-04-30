import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

import { NewsCreateForm } from "./form";

export default async function NewNewsPage() {
  await requireAdmin();
  return (
    <>
      
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/admin/news"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Новости
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-8">
          Новая новость
        </h1>
        <NewsCreateForm />
      </main>
      
    </>
  );
}
