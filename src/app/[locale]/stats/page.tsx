export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Статистика платформы — Esports.kz",
  description:
    "Открытая статистика Esports.kz: пользователи, команды, турниры, призовые. Для прессы и спонсоров.",
};

export default async function StatsPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [
    usersTotal,
    usersWeek,
    usersMonth,
    teamsTotal,
    teamsByGame,
    tournaments,
    activeTournaments,
    matchesTotal,
    matchesFinished,
    prizeAgg,
    mvpsTotal,
    activePlayers30d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.team.count(),
    prisma.team.groupBy({ by: ["game"], _count: { _all: true } }),
    prisma.tournament.count(),
    prisma.tournament.count({
      where: { status: { in: ["REGISTRATION_OPEN", "ONGOING"] } },
    }),
    prisma.match.count(),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.tournament.aggregate({ _sum: { prize: true } }),
    prisma.mvpAward.count(),
    prisma.user.count({ where: { lastSeenAt: { gte: thirtyDaysAgo } } }),
  ]);

  const totalPrizeKzt = Number(prizeAgg._sum.prize ?? 0n) / 100;

  const cards = [
    {
      label: "Зарегистрированных игроков",
      value: usersTotal,
      sub: `+${usersWeek} за неделю · +${usersMonth} за месяц`,
      accent: "from-violet-500/20 to-violet-500/5",
    },
    {
      label: "Активных за 30 дней",
      value: activePlayers30d,
      sub: usersTotal > 0
        ? `${Math.round((activePlayers30d / usersTotal) * 100)}% retention`
        : "—",
      accent: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "Команд в базе",
      value: teamsTotal,
      sub:
        teamsByGame
          .map((t) => `${t.game}: ${t._count._all}`)
          .join(" · ") || "—",
      accent: "from-fuchsia-500/20 to-fuchsia-500/5",
    },
    {
      label: "Турниров",
      value: tournaments,
      sub: activeTournaments
        ? `${activeTournaments} активных сейчас`
        : "—",
      accent: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "Сыграно матчей",
      value: matchesFinished,
      sub: `${matchesTotal} всего · ${matchesTotal - matchesFinished} в очереди`,
      accent: "from-cyan-500/20 to-cyan-500/5",
    },
    {
      label: "Общий призовой фонд",
      value: `₸ ${(totalPrizeKzt / 1_000_000).toFixed(2)}M`,
      sub: `${totalPrizeKzt.toLocaleString("ru-RU")} тенге`,
      accent: "from-rose-500/20 to-rose-500/5",
    },
    {
      label: "MVP-наград",
      value: mvpsTotal,
      sub: "выдано игрокам",
      accent: "from-yellow-500/20 to-yellow-500/5",
    },
    {
      label: "Дисциплины",
      value: 3,
      sub: "CS2 · Dota 2 · PUBG",
      accent: "from-indigo-500/20 to-indigo-500/5",
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
          // Open data
        </p>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter">
          Статистика платформы
        </h1>
        <p className="text-zinc-400 mt-3 max-w-2xl">
          Прозрачные числа Esports.kz. Для прессы, партнёров и спонсоров. Данные
          обновляются в реальном времени.
        </p>
        <p className="text-xs font-mono text-zinc-500 mt-2">
          Последнее обновление: {new Date().toLocaleString("ru-RU")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-lg border border-zinc-800 bg-gradient-to-br ${c.accent} via-zinc-900/40 to-zinc-900/60 p-5`}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                {c.label}
              </div>
              <div className="text-3xl font-black tracking-tight">
                {typeof c.value === "number"
                  ? c.value.toLocaleString("ru-RU")
                  : c.value}
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-2">
                {c.sub}
              </div>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-8">
          <h2 className="text-2xl font-display font-black tracking-tight mb-3">
            Хочешь стать частью этих чисел?
          </h2>
          <p className="text-zinc-400 mb-6 max-w-2xl">
            Бренды и спонсоры — обращайтесь. Игроки — регистрируйтесь и
            создавайте команды. Платформа работает на open-source стеке и
            принадлежит сообществу.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sponsors"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
            >
              Для брендов →
            </Link>
            <Link
              href="/api/auth/steam"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 transition-all clip-corner"
            >
              Войти через Steam
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
