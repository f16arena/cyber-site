import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TeamCreateForm } from "./form";

export default async function NewTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/steam");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/teams"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Команды
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-2">
          Создать команду
        </h1>
        <p className="text-zinc-400 mb-8">
          Ты будешь капитаном. Можешь приглашать других игроков из их профиля.
        </p>
        <TeamCreateForm />
      </main>
      <SiteFooter />
    </>
  );
}
