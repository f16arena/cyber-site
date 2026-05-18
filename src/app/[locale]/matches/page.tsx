export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MatchStatus } from "@prisma/client";

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Скоро",
  LIVE: "LIVE",
  FINISHED: "Финиш",
  CANCELLED: "Отменён",
  WALKOVER: "WO",
};

function statusVariant(s: MatchStatus) {
  switch (s) {
    case "LIVE":
      return "live" as const;
    case "FINISHED":
      return "finished" as const;
    case "SCHEDULED":
      return "upcoming" as const;
    default:
      return "default" as const;
  }
}

const FILTERS: Array<{ value: MatchStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "LIVE", label: "Live" },
  { value: "SCHEDULED", label: "Скоро" },
  { value: "FINISHED", label: "Завершённые" },
];

function formatTime(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const validStatus = ["LIVE", "SCHEDULED", "FINISHED"].includes(
    params.status ?? ""
  )
    ? (params.status as MatchStatus)
    : null;

  const matches = await prisma.match.findMany({
    where: validStatus ? { status: validStatus } : {},
    include: {
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
      tournament: { select: { name: true, slug: true, game: true } },
    },
    orderBy: [
      { status: "asc" },
      { startsAt: "asc" },
      { finishedAt: "desc" },
    ],
    take: 100,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer>
          <PageHeader title="Матчи" />

          <div className="flex gap-1.5 mb-4 flex-wrap">
            {FILTERS.map((f) => {
              const active =
                (f.value === "ALL" && !validStatus) ||
                (validStatus && f.value === validStatus);
              const href =
                f.value === "ALL" ? "/matches" : `/matches?status=${f.value}`;
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

          {matches.length === 0 ? (
            <EmptyState
              title="Матчей пока нет"
              description="Создай турнир и сгенерируй сетку."
            />
          ) : (
            <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default">
              {matches.map((m) => {
                const aWon =
                  m.status === "FINISHED" && m.scoreA > m.scoreB;
                const bWon =
                  m.status === "FINISHED" && m.scoreB > m.scoreA;
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated transition-colors text-[13px]"
                  >
                    <Badge variant={statusVariant(m.status)} size="sm">
                      {STATUS_LABEL[m.status]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-tight">
                        <span
                          className={
                            aWon ? "text-text-primary" : "text-text-secondary"
                          }
                        >
                          {m.teamA?.name ?? "TBD"}
                        </span>
                        <span className="text-text-muted font-mono mx-2 tabular-nums">
                          {m.scoreA}:{m.scoreB}
                        </span>
                        <span
                          className={
                            bWon ? "text-text-primary" : "text-text-secondary"
                          }
                        >
                          {m.teamB?.name ?? "TBD"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-text-muted mt-0.5 truncate">
                        {m.tournament ? (
                          <>
                            {m.tournament.game} · {m.tournament.name}
                          </>
                        ) : (
                          "—"
                        )}
                        {m.stage && ` · ${m.stage}`}
                        {m.map && ` · ${m.map}`}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-text-muted hidden sm:block whitespace-nowrap">
                      {formatTime(m.startsAt ?? m.finishedAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
