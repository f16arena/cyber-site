export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TournamentStatus } from "@prisma/client";

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

export default async function AdminTournamentsPage() {
  await requireAdmin();

  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: {
        select: { registrations: true, matches: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <Link
        href="/admin"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Админка
      </Link>

      <PageHeader
        title="Турниры"
        actions={
          <Link href="/admin/tournaments/new">
            <Button size="md">+ Новый турнир</Button>
          </Link>
        }
      />

      {tournaments.length === 0 ? (
        <EmptyState
          title="Турниров ещё нет"
          description="Создай первый турнир и начни принимать заявки от команд."
          action={
            <Link href="/admin/tournaments/new">
              <Button size="md">Создать турнир</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/admin/tournaments/${t.id}`}
              className="block rounded border border-border-default bg-bg-panel hover:border-brand-yellow/40 hover:bg-bg-elevated transition-colors p-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="yellow" size="sm">
                      {t.game}
                    </Badge>
                    <Badge variant={statusVariant(t.status)} size="sm">
                      {STATUS_LABEL[t.status]}
                    </Badge>
                    <span className="text-[11px] font-mono text-text-muted">
                      {t.format}
                    </span>
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-text-primary">
                    {t.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] font-mono text-text-muted tabular-nums">
                    <span>
                      ₸ {(Number(t.prize) / 100).toLocaleString("ru-RU")}
                    </span>
                    <span>
                      {t._count.registrations}/{t.maxTeams} команд
                    </span>
                    <span>{t._count.matches} матчей</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-brand-yellow">
                  Управлять »
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
