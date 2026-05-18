export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

import {
  generateBracket,
  resetBracket,
  registerTeam,
  uploadTournamentBanner,
  saveAsTemplate,
  setTournamentStatus,
} from "../../actions";
import { ImageUploader } from "@/components/ImageUploader";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminTournamentManagePage({
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
        include: { team: true },
        orderBy: { createdAt: "asc" },
      },
      matches: {
        include: {
          teamA: { select: { name: true, tag: true } },
          teamB: { select: { name: true, tag: true } },
        },
        orderBy: [
          { bracketSide: "asc" },
          { round: "asc" },
          { bracketPosition: "asc" },
        ],
      },
    },
  });

  if (!tournament) notFound();

  const registeredTeamIds = new Set(
    tournament.registrations.map((r) => r.teamId)
  );
  const availableTeams = await prisma.team.findMany({
    where: {
      game: tournament.game,
      id: { notIn: Array.from(registeredTeamIds) },
    },
    orderBy: { rating: "desc" },
    take: 30,
  });

  const approved = tournament.registrations.filter((r) => r.approvedAt);
  const pending = tournament.registrations.filter((r) => !r.approvedAt);
  const approvedCount = approved.length;

  const canGenerate =
    (tournament.format === "SINGLE_ELIMINATION" ||
      tournament.format === "DOUBLE_ELIMINATION") &&
    tournament.matches.length === 0 &&
    approvedCount >= 2 &&
    [4, 8, 16].includes(approvedCount);

  const hasBracket = tournament.matches.length > 0;

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <Link
        href="/admin/tournaments"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Турниры
      </Link>

      <PageHeader
        title={tournament.name}
        subtitle={`${tournament.format} · ₸ ${(Number(tournament.prize) / 100).toLocaleString("ru-RU")} · ${approvedCount}/${tournament.maxTeams} команд`}
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href={`/tournaments/${tournament.slug}`}>
              <Button variant="secondary" size="md">
                Публичная страница →
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-2 flex-wrap mb-5">
        <Badge variant="yellow" size="sm">
          {tournament.game}
        </Badge>
        <Badge variant="upcoming" size="sm">
          {tournament.status}
        </Badge>
        <span className="text-[11px] font-mono text-text-muted">
          ростер {tournament.rosterSize}+{tournament.substitutesAllowed}
        </span>
        {tournament.autoApproveTeams && (
          <span className="text-[11px] font-mono text-emerald-300">
            ✓ auto-approve
          </span>
        )}
      </div>

      {/* Status controls */}
      <section className="rounded border border-border-default bg-bg-panel p-4 mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
          Управление
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          <form action={setTournamentStatus}>
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <input type="hidden" name="status" value="REGISTRATION_OPEN" />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={tournament.status === "REGISTRATION_OPEN"}
            >
              Открыть регистрацию
            </Button>
          </form>
          <form action={setTournamentStatus}>
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <input type="hidden" name="status" value="REGISTRATION_CLOSED" />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={tournament.status === "REGISTRATION_CLOSED"}
            >
              Закрыть регистрацию
            </Button>
          </form>
          {canGenerate && (
            <form action={generateBracket}>
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <Button type="submit" size="sm">
                ⚙ Сгенерировать сетку
              </Button>
            </form>
          )}
          {hasBracket && (
            <form action={resetBracket}>
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-rose-300 hover:text-rose-200"
              >
                Сбросить сетку
              </Button>
            </form>
          )}
          <form action={saveAsTemplate}>
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <input type="hidden" name="templateName" value={tournament.name} />
            <Button type="submit" variant="ghost" size="sm">
              💾 Сохранить шаблон
            </Button>
          </form>
        </div>
        {!canGenerate && !hasBracket && (
          <p className="text-[11px] font-mono text-text-muted mt-2">
            Для генерации сетки нужно ровно 4/8/16 принятых команд (сейчас{" "}
            {approvedCount}).
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        {/* Registered teams */}
        <section className="rounded border border-border-default bg-bg-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Зарегистрированные ({approvedCount}
              {pending.length > 0 && ` · ${pending.length} ждёт`})
            </h2>
            {pending.length > 0 && (
              <Link
                href={`/admin/tournaments/${tournament.id}/registrations`}
                className="text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover"
              >
                Заявки »
              </Link>
            )}
          </div>
          {tournament.registrations.length === 0 ? (
            <EmptyState compact title="Команд нет" />
          ) : (
            <ul className="space-y-1">
              {tournament.registrations.map((r) => {
                const isApproved = !!r.approvedAt;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-sm border border-border-default bg-bg-elevated p-2 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">
                        {r.team.name}
                      </span>
                      <span className="font-mono text-text-muted">
                        [{r.team.tag}]
                      </span>
                    </div>
                    {isApproved ? (
                      <Badge variant="win" size="sm">
                        ✓
                      </Badge>
                    ) : (
                      <Badge variant="upcoming" size="sm">
                        wait
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Available teams to register manually */}
        <section className="rounded border border-border-default bg-bg-panel p-4">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
            Добавить вручную
          </h2>
          {availableTeams.length === 0 ? (
            <EmptyState compact title={`Нет других команд по ${tournament.game}`} />
          ) : (
            <ul className="space-y-1">
              {availableTeams.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-sm border border-border-default bg-bg-elevated p-2 text-[12px]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold truncate">{t.name}</span>
                    <span className="font-mono text-text-muted ml-2">
                      [{t.tag}] · {t.rating}
                    </span>
                  </div>
                  <form action={registerTeam}>
                    <input
                      type="hidden"
                      name="tournamentId"
                      value={tournament.id}
                    />
                    <input type="hidden" name="teamId" value={t.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      + Добавить
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Matches */}
      {tournament.matches.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
            Матчи ({tournament.matches.length})
          </h2>
          <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default">
            {tournament.matches.map((m) => (
              <Link
                key={m.id}
                href={`/admin/matches/${m.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-bg-elevated text-[12px]"
              >
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <Badge variant="default" size="sm">
                    {m.bracketSide ?? "—"} R{m.round}·{m.bracketPosition}
                  </Badge>
                  <span className="font-semibold truncate">
                    {m.teamA?.name ?? "TBD"}
                  </span>
                  <span className="text-text-muted font-mono tabular-nums">
                    {m.scoreA}:{m.scoreB}
                  </span>
                  <span className="font-semibold truncate">
                    {m.teamB?.name ?? "TBD"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-text-muted shrink-0">
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Banner */}
      <section className="rounded border border-border-default bg-bg-panel p-4 mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
          Баннер
        </h2>
        <ImageUploader
          currentUrl={tournament.bannerUrl}
          action={uploadTournamentBanner}
          extraFields={{ tournamentId: tournament.id }}
          label="Баннер"
          hint="PNG / JPG / WebP. До 1 МБ. Лучше 1920×640 (3:1)."
        />
      </section>

      {tournament.description && (
        <section className="rounded border border-border-default bg-bg-panel p-4">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
            Описание
          </h2>
          <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">
            {tournament.description}
          </p>
        </section>
      )}
    </PageContainer>
  );
}
