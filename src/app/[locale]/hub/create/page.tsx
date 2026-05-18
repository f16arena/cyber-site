export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { CreateMatchForm } from "./create-form";

export default async function HubCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getOptionalHubUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
          F16 HUB · Custom match
        </div>
        <h1 className="text-3xl font-black tracking-tight">Создать матч</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Выберите режим, формат и карты. Пригласить игроков и команды можно
          будет в комнате матча.
        </p>
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-[11px] font-mono text-amber-200/80">
          frontend-only превью · бэкенд подключится когда перенесёте проект
          на сервер
        </div>
      </header>

      <CreateMatchForm locale={locale} />
    </div>
  );
}
