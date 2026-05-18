export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";

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
    prisma.tournament.count({
      where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } },
    }),
    prisma.team.count(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.news.count(),
    prisma.match.count({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
    }),
    prisma.matchResultClaim.count({ where: { status: "DISPUTED" } }),
    prisma.sponsorshipInquiry.count({ where: { isHandled: false } }),
    prisma.matchResultClaim.count({ where: { status: "PENDING" } }),
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const cards: Array<{
    title: string;
    desc: string;
    href: string;
    stat: number | string;
    statLabel: string;
    highlight?: boolean;
  }> = [
    {
      title: "Турниры",
      desc: "Создать, открыть регистрацию, сгенерить сетку, ввести результаты",
      href: "/admin/tournaments",
      stat: tournamentsCount,
      statLabel: `активных: ${activeTournaments}`,
    },
    {
      title: "Матчи",
      desc: "Ввод счёта, статистика игроков, MVP",
      href: "/admin/matches",
      stat: pendingMatches,
      statLabel:
        disputedClaims > 0 ? `⚠ спорных: ${disputedClaims}` : "ожидают",
      highlight: disputedClaims > 0,
    },
    {
      title: "Серверы CS2",
      desc: "Управление dedicated-серверами (Phase 8)",
      href: "/admin/servers",
      stat: "—",
      statLabel: "phase 8",
    },
    {
      title: "Заявки спонсоров",
      desc: "Новые входящие от брендов",
      href: "/admin/inquiries",
      stat: pendingInquiries,
      statLabel: pendingInquiries > 0 ? "необработано" : "пусто",
      highlight: pendingInquiries > 0,
    },
    {
      title: "Споры по матчам",
      desc: "Команды заявили разные счёта — нужно решение",
      href: "/admin/matches",
      stat: disputedClaims,
      statLabel:
        pendingClaims > 0
          ? `+${pendingClaims} ждут подтверждения`
          : "ожидают решения",
      highlight: disputedClaims > 0,
    },
    {
      title: "Новости",
      desc: "Публикация в ленте на главной",
      href: "/admin/news",
      stat: newsCount,
      statLabel: "опубликовано",
    },
    {
      title: "Команды",
      desc: "Просмотр всех команд",
      href: "/admin/teams",
      stat: teamsCount,
      statLabel: "всего",
    },
    {
      title: "Пользователи",
      desc: "Управление, бан, права",
      href: "/admin/users",
      stat: usersCount,
      statLabel: `+${newUsersWeek} за неделю`,
    },
  ];

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="yellow" size="sm">
          ADMIN
        </Badge>
        <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
          Control Panel
        </span>
      </div>
      <h1 className="text-xl font-bold tracking-tight mb-5">Админка</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {cards.map((c) => (
          <Link
            key={c.href + c.title}
            href={c.href}
            className={`relative rounded border bg-bg-panel transition-colors p-4 ${
              c.highlight
                ? "border-brand-yellow/40 hover:border-brand-yellow"
                : "border-border-default hover:border-border-strong hover:bg-bg-elevated"
            }`}
          >
            {c.highlight && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-brand-yellow animate-pulse" />
            )}
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-bold tracking-tight text-text-primary">
                {c.title}
              </h2>
              <div className="text-right">
                <div className="text-lg font-bold font-mono tabular-nums text-brand-yellow">
                  {c.stat}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">
                  {c.statLabel}
                </div>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary leading-snug">
              {c.desc}
            </p>
            <div className="mt-3 text-[11px] font-mono text-brand-blue">
              Открыть »
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded border border-border-default bg-bg-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
            Последние действия админов
          </h2>
          <Link
            href="/admin/audit"
            className="text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover"
          >
            весь audit log »
          </Link>
        </div>
        {recentAudit.length === 0 ? (
          <p className="text-[12px] text-text-muted">Действий ещё не было.</p>
        ) : (
          <ul className="space-y-1 text-[12px] font-mono">
            {recentAudit.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-text-secondary py-0.5"
              >
                <span className="text-[10px] text-text-muted w-20 shrink-0">
                  {formatRelative(a.createdAt)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 shrink-0">
                  {a.action}
                </span>
                {a.entity && (
                  <span className="text-[11px] text-text-muted truncate">
                    {a.entity}
                    {a.entityId ? `:${a.entityId.slice(0, 8)}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
