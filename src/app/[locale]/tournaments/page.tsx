export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Game, TournamentStatus } from "@prisma/client";

const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: "Черновик",
  REGISTRATION_OPEN: "Регистрация",
  REGISTRATION_CLOSED: "Закрыта",
  ONGOING: "Идёт",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

function statusVariant(s: TournamentStatus) {
  switch (s) {
    case "ONGOING":
      return "live" as const;
    case "REGISTRATION_OPEN":
      return "win" as const;
    case "REGISTRATION_CLOSED":
      return "upcoming" as const;
    case "COMPLETED":
      return "finished" as const;
    default:
      return "default" as const;
  }
}

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elim",
  DOUBLE_ELIMINATION: "Double Elim",
  ROUND_ROBIN: "Round Robin",
  BATTLE_ROYALE_SERIES: "BR Series",
};

const GAME_FILTERS: Array<{ value: Game | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "CS2", label: "CS2" },
  { value: "DOTA2", label: "Dota 2" },
  { value: "PUBG", label: "PUBG" },
];

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(
    game?.toUpperCase() ?? ""
  )
    ? (game!.toUpperCase() as Game)
    : null;

  const tournaments = await prisma.tournament.findMany({
    where: {
      status: { not: "DRAFT" },
      ...(validGame ? { game: validGame } : {}),
    },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    take: 50,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer>
          <PageHeader
            title="Турниры"
            subtitle="Регулярные чемпионаты по CS2."
          />

          <div className="flex gap-1.5 mb-5 flex-wrap">
            {GAME_FILTERS.map((f) => {
              const active =
                (f.value === "ALL" && !validGame) ||
                (validGame && f.value === validGame);
              const href =
                f.value === "ALL"
                  ? "/tournaments"
                  : `/tournaments?game=${f.value.toLowerCase()}`;
              return (
                <Link
                  key={f.value}
                  href={href}
                  className={`px-3 h-8 inline-flex items-center text-sm rounded border transition-colors ${
                    active
                      ? "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/40"
                      : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {tournaments.length === 0 ? (
            <EmptyState
              title="Турниров пока нет"
              description="Скоро здесь появится первый чемпионат."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.slug}`}
                  className="group rounded border border-border-default bg-bg-panel hover:border-brand-yellow/40 hover:bg-bg-elevated transition-colors p-4"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    <Badge variant="yellow" size="sm">
                      {t.game}
                    </Badge>
                    <Badge variant={statusVariant(t.status)} size="sm">
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-text-primary group-hover:text-brand-yellow transition-colors leading-snug">
                    {t.name}
                  </h3>
                  <div className="text-[11px] font-mono text-text-muted mt-1">
                    {FORMAT_LABEL[t.format] ?? t.format}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-mono text-text-muted uppercase tracking-wide text-[10px]">
                        Призовой
                      </div>
                      <div className="font-bold text-amber-300 tabular-nums">
                        ₸ {(Number(t.prize) / 100).toLocaleString("ru-RU")}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-text-muted uppercase tracking-wide text-[10px]">
                        Команды
                      </div>
                      <div className="font-bold tabular-nums">
                        {t._count.registrations}/{t.maxTeams}
                      </div>
                    </div>
                  </div>
                  {t.startsAt && (
                    <div className="mt-3 pt-3 border-t border-border-default text-[10px] font-mono text-text-muted">
                      Старт:{" "}
                      {new Date(t.startsAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
