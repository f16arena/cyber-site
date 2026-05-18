export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  approveTournamentRegistration,
  rejectTournamentRegistration,
} from "@/app/admin/actions";

export default async function TournamentRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              logoUrl: true,
              captain: { select: { username: true, id: true } },
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      rosters: {
        include: {
          tournament: { select: { id: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  // Группировка ростеров по teamId
  const rostersByTeam = new Map<
    string,
    typeof tournament.rosters
  >();
  for (const r of tournament.rosters) {
    const arr = rostersByTeam.get(r.teamId) ?? [];
    arr.push(r);
    rostersByTeam.set(r.teamId, arr);
  }

  // Подгружаем юзеров для ростеров
  const allUserIds = Array.from(
    new Set(tournament.rosters.map((r) => r.userId))
  );
  const users = allUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, username: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const pending = tournament.registrations.filter((r) => !r.approvedAt);
  const approved = tournament.registrations.filter((r) => r.approvedAt);

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <PageHeader
        title={`Заявки на ${tournament.name}`}
        subtitle={`${approved.length}/${tournament.maxTeams} принято · ${pending.length} ожидает`}
        actions={
          <Link
            href={`/admin/tournaments/${tournament.id}`}
            className="text-xs font-mono text-text-muted hover:text-brand-yellow"
          >
            ← К турниру
          </Link>
        }
      />

      {/* PENDING */}
      <section className="mb-6">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
          На рассмотрении ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState compact title="Заявок нет" />
        ) : (
          <div className="space-y-3">
            {pending.map((reg) => {
              const teamRosters = rostersByTeam.get(reg.team.id) ?? [];
              return (
                <RegistrationRow
                  key={reg.id}
                  registration={reg}
                  rosters={teamRosters}
                  userById={userById}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* APPROVED */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-3">
          Принято ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <EmptyState compact title="Команд не принято" />
        ) : (
          <div className="space-y-3">
            {approved.map((reg) => {
              const teamRosters = rostersByTeam.get(reg.team.id) ?? [];
              return (
                <RegistrationRow
                  key={reg.id}
                  registration={reg}
                  rosters={teamRosters}
                  userById={userById}
                  approved
                />
              );
            })}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function RegistrationRow({
  registration,
  rosters,
  userById,
  approved = false,
}: {
  registration: {
    id: string;
    createdAt: Date;
    approvedAt: Date | null;
    team: {
      id: string;
      name: string;
      tag: string;
      logoUrl: string | null;
      captain: { username: string; id: string };
      _count: { members: number };
    };
  };
  rosters: Array<{
    userId: string;
    isMain: boolean;
    isCaptain: boolean;
  }>;
  userById: Map<string, { id: string; username: string }>;
  approved?: boolean;
}) {
  const team = registration.team;
  const main = rosters.filter((r) => r.isMain);
  const subs = rosters.filter((r) => !r.isMain);

  return (
    <div className="rounded border border-border-default bg-bg-panel p-4">
      <div className="flex items-start gap-4">
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-12 h-12 border border-border-default shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-lg text-text-secondary shrink-0">
            {team.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/teams/${team.tag}`}
              className="text-base font-bold text-text-primary hover:text-brand-yellow"
            >
              {team.name}
            </Link>
            <span className="text-[11px] font-mono text-text-muted">
              [{team.tag}]
            </span>
            {approved ? (
              <Badge variant="win" size="sm">
                Принят
              </Badge>
            ) : (
              <Badge variant="upcoming" size="sm">
                Ждёт
              </Badge>
            )}
          </div>
          <div className="text-[11px] font-mono text-text-muted mb-2">
            Капитан:{" "}
            <Link
              href={`/players/${encodeURIComponent(team.captain.username)}`}
              className="text-brand-blue hover:text-brand-blue-hover"
            >
              {team.captain.username}
            </Link>
            {" · "}
            подано{" "}
            {registration.createdAt.toLocaleString("ru-RU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Roster */}
          <div className="rounded-sm border border-border-default bg-bg-elevated p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
              Ростер ({main.length} основ + {subs.length} запас)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {main.map((r) => {
                const u = userById.get(r.userId);
                return (
                  <span
                    key={r.userId}
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded-sm border ${
                      r.isCaptain
                        ? "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/40"
                        : "bg-bg-base border-border-default text-text-secondary"
                    }`}
                  >
                    {u?.username ?? "?"}
                    {r.isCaptain && " ★"}
                  </span>
                );
              })}
              {subs.map((r) => {
                const u = userById.get(r.userId);
                return (
                  <span
                    key={r.userId}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm border border-dashed border-border-strong text-text-muted bg-bg-base"
                  >
                    {u?.username ?? "?"} (зап)
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {!approved && (
            <form action={approveTournamentRegistration}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <Button type="submit" size="sm">
                ✓ Принять
              </Button>
            </form>
          )}
          <form action={rejectTournamentRegistration}>
            <input type="hidden" name="registrationId" value={registration.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-rose-300 hover:text-rose-200"
            >
              {approved ? "Удалить" : "Отклонить"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
