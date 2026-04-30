export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default async function AdminHomePage() {
  await requireAdmin();

  const [tournamentsCount, teamsCount, usersCount, newsCount, pendingMatches] =
    await Promise.all([
      prisma.tournament.count(),
      prisma.team.count(),
      prisma.user.count(),
      prisma.news.count(),
      prisma.match.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
    ]);

  const cards = [
    {
      title: "Турниры",
      desc: "Создать, открыть регистрацию, сгенерить сетку, ввести результаты",
      href: "/admin/tournaments",
      stat: tournamentsCount,
      statLabel: "всего",
      accent: "violet",
    },
    {
      title: "Матчи",
      desc: "Ввод счёта, статистика игроков, MVP",
      href: "/admin/matches",
      stat: pendingMatches,
      statLabel: "ожидают",
      accent: "rose",
    },
    {
      title: "Новости",
      desc: "Публикация в ленте на главной",
      href: "/admin/news",
      stat: newsCount,
      statLabel: "опубликовано",
      accent: "amber",
    },
    {
      title: "Команды",
      desc: "Просмотр всех команд",
      href: "/teams",
      stat: teamsCount,
      statLabel: "всего",
      accent: "fuchsia",
    },
    {
      title: "Игроки",
      desc: "Зарегистрированные пользователи",
      href: "/admin/users",
      stat: usersCount,
      statLabel: "всего",
      accent: "emerald",
    },
    {
      title: "Лидерборды",
      desc: "Top players, MVP, snipers",
      href: "/admin/leaderboards",
      stat: "—",
      statLabel: "ручное наполнение",
      accent: "cyan",
    },
  ];

  const accentBg: Record<string, string> = {
    violet: "from-violet-500/15",
    rose: "from-rose-500/15",
    amber: "from-amber-500/15",
    fuchsia: "from-fuchsia-500/15",
    emerald: "from-emerald-500/15",
    cyan: "from-cyan-500/15",
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            ADMIN
          </span>
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest">
            // Control Panel
          </p>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-8">
          Админка
        </h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative rounded-lg border border-zinc-800 hover:border-violet-500/40 bg-gradient-to-br ${accentBg[c.accent]} via-zinc-900/40 to-zinc-900/60 p-6 transition-all hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-black tracking-tight">{c.title}</h2>
                <div className="text-right">
                  <div className="text-2xl font-black bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-transparent">
                    {c.stat}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                    {c.statLabel}
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400">{c.desc}</p>
              <div className="mt-4 text-xs font-mono text-violet-300 group-hover:text-violet-200">
                Открыть →
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
