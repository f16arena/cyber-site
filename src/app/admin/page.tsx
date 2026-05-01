export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function formatRelative(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return `${Math.floor(diff / 86400)}д назад`;
}

export default async function AdminHomePage() {
  await requireAdmin();

  const weekAgo = new Date(Date.now() - 7 * 86400_000);

  const [
    tournamentsCount,
    activeTournaments,
    teamsCount,
    usersCount,
    newUsersWeek,
    newsCount,
    pendingMatches,
    disputedClaims,
    pendingInquiries,
    pendingClaims,
    recentAudit,
  ] = await Promise.all([
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } } }),
    prisma.team.count(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.news.count(),
    prisma.match.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
    prisma.matchResultClaim.count({ where: { status: "DISPUTED" } }),
    prisma.sponsorshipInquiry.count({ where: { isHandled: false } }),
    prisma.matchResultClaim.count({ where: { status: "PENDING" } }),
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const cards = [
    {
      title: "Турниры",
      desc: "Создать, открыть регистрацию, сгенерить сетку, ввести результаты",
      href: "/admin/tournaments",
      stat: tournamentsCount,
      statLabel: `активных: ${activeTournaments}`,
      accent: "violet",
    },
    {
      title: "Матчи",
      desc: "Ввод счёта, статистика игроков, MVP",
      href: "/admin/matches",
      stat: pendingMatches,
      statLabel: disputedClaims > 0 ? `⚠ спорных: ${disputedClaims}` : "ожидают",
      accent: disputedClaims > 0 ? "rose" : "amber",
    },
    {
      title: "Заявки спонсоров",
      desc: "Новые входящие от брендов",
      href: "/admin/inquiries",
      stat: pendingInquiries,
      statLabel: pendingInquiries > 0 ? "необработано" : "пусто",
      accent: pendingInquiries > 0 ? "amber" : "fuchsia",
      highlight: pendingInquiries > 0,
    },
    {
      title: "Споры по матчам",
      desc: "Команды заявили разные счёта — нужно решение",
      href: "/admin/matches",
      stat: disputedClaims,
      statLabel: pendingClaims > 0 ? `+${pendingClaims} ждут подтверждения` : "ожидают решения",
      accent: disputedClaims > 0 ? "rose" : "cyan",
      highlight: disputedClaims > 0,
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
      href: "/admin/teams",
      stat: teamsCount,
      statLabel: "всего",
      accent: "fuchsia",
    },
    {
      title: "Пользователи",
      desc: "Управление, бан, права",
      href: "/admin/users",
      stat: usersCount,
      statLabel: `+${newUsersWeek} за неделю`,
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
    <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
          ADMIN
        </span>
        <p className="text-violet-400 font-mono text-xs uppercase tracking-widest">
          // Control Panel
        </p>
      </div>
      <h1 className="text-4xl font-black tracking-tight mb-8">Админка</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href + c.title}
            href={c.href}
            className={`group relative rounded-lg border ${
              c.highlight ? "border-amber-500/50" : "border-zinc-800 hover:border-violet-500/40"
            } bg-gradient-to-br ${accentBg[c.accent]} via-zinc-900/40 to-zinc-900/60 p-6 transition-all hover:-translate-y-0.5`}
          >
            {c.highlight && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
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

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">
            // Последние действия админов
          </h2>
          <Link
            href="/admin/audit"
            className="text-xs font-mono text-zinc-500 hover:text-violet-300"
          >
            весь audit log →
          </Link>
        </div>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-zinc-500">Действий ещё не было.</p>
        ) : (
          <ul className="space-y-1.5 text-sm font-mono">
            {recentAudit.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 text-zinc-400 hover:text-zinc-200 py-1"
              >
                <span className="text-[10px] text-zinc-600 w-20 shrink-0">
                  {formatRelative(a.createdAt)}
                </span>
                <span className="text-amber-300 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                  {a.action}
                </span>
                {a.entity && (
                  <span className="text-xs text-zinc-500 truncate">
                    {a.entity}
                    {a.entityId ? `:${a.entityId.slice(0, 8)}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
