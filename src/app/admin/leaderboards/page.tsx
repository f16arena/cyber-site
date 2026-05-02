export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLeaderboardsPage() {
  await requireAdmin();
  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight mb-2">Лидерборды</h1>
      <p className="text-zinc-400 mb-8">
        Лидерборды наполняются автоматически из{" "}
        <Link href="/admin/matches" className="text-violet-300 hover:text-violet-200">
          матчей
        </Link>
        : Top Players по среднему рейтингу, Top Teams по очкам, MVP Leaders по
        кол-ву наград.
      </p>

      <section className="rounded-lg border border-violet-500/20 bg-zinc-900/40 p-6 mb-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Как это работает
        </h2>
        <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
          <li>
            Создай турнир в{" "}
            <Link href="/admin/tournaments" className="text-violet-300 hover:text-violet-200">
              разделе Турниры
            </Link>{" "}
            и зарегистрируй команды.
          </li>
          <li>Сгенерируй сетку — появятся матчи в статусе SCHEDULED.</li>
          <li>
            После каждого матча открывай его в{" "}
            <Link href="/admin/matches" className="text-violet-300 hover:text-violet-200">
              списке матчей
            </Link>{" "}
            и вводи счёт + статистику игроков (K/D/A, ADR, HS%, KAST, MVP).
          </li>
          <li>
            Победитель автоматически продвигается дальше по сетке. Лидерборд
            обновляется в реальном времени из {"`MatchPlayerStat`"}.
          </li>
          <li>
            Опционально: подключи FACEIT API (`FACEIT_API_KEY` в env), и стата
            будет подтягиваться автоматически из FACEIT-матчей.
          </li>
        </ol>
      </section>

      <Link
        href="/leaderboard"
        className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
      >
        Открыть публичный лидерборд →
      </Link>
    </main>
  );
}
