import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SponsorForm } from "./form";

export default async function NewSponsorPage() {
  await requireAdmin();
  return (
    <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-8">
      <Link
        href="/admin/sponsors"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Спонсоры
      </Link>
      <h1 className="text-2xl font-black tracking-tight mb-6">
        Новый партнёр
      </h1>
      <SponsorForm />
    </main>
  );
}
