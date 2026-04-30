import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TournamentCreateForm } from "./form";

export default async function NewTournamentPage() {
  await requireAdmin();
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/admin/tournaments"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Турниры
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-8">
          Создать турнир
        </h1>
        <TournamentCreateForm />
      </main>
      <SiteFooter />
    </>
  );
}
