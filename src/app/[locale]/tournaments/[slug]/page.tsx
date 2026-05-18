export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TournamentBracket } from "./bracket";
import { ShareButtons } from "@/components/ShareButtons";
import { Markdown } from "@/components/Markdown";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { submitTournamentRegistration } from "@/app/admin/actions";
import type { BracketSide, TournamentStatus } from "@prisma/client";

const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: "Черновик",
  REGISTRATION_OPEN: "Регистрация",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  ONGOING: "Идёт",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

function statusBadgeVariant(s: TournamentStatus) {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      bannerUrl: true,
      game: true,
      prize: true,
    },
  });
  if (!t) return { title: "Турнир не найден" };
  const prizeKzt = Number(t.prize) / 100;
  const description =
    t.description ||
    `${t.game} турнир в Казахстане. Призовой фонд: ${prizeKzt.toLocaleString("ru-RU")} ₸.`;
  return {
    title: t.name,
    description,
    openGraph: {
      title: t.name,
      description,
      type: "website",
      images: t.bannerUrl ? [{ url: t.bannerUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: t.name,
      description,
      images: t.bannerUrl ? [t.bannerUrl] : undefined,
    },
  };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [tournament, user] = await Promise.all([
    prisma.tournament.findUnique({
      where: { slug },
      include: {
        registrations: {
          include: {
            team: { select: { id: true, name: true, tag: true } },
          },
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
    }),
    getCurrentUser(),
  ]);

  if (!tournament || tournament.status === "DRAFT") notFound();

  // Эта команда уже зарегистрирована? Является ли user капитаном какой-то команды
  // подходящей под турнир?
  type EligibleTeam = {
    id: string;
    name: string;
    tag: string;
    members: { userId: string; user: { id: string; username: string } }[];
  };
  let captainTeam: EligibleTeam | null = null;
  let alreadyRegistered = false;
  if (user) {
    const t = await prisma.team.findFirst({
      where: { captainId: user.id, game: tournament.game },
      select: {
        id: true,
        name: true,
        tag: true,
        members: {
          select: {
            userId: true,
            user: { select: { id: true, username: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    captainTeam = t;
    if (t) {
      alreadyRegistered = tournament.registrations.some(
        (r) => r.team.id === t.id
      );
    }
  }

  // Результаты для COMPLETED
  let results: {
    winner: { name: string; tag: string } | null;
    runnerUp: { name: string; tag: string } | null;
    mvp: {
      username: string;
      avatarUrl: string | null;
      mvpCount: number;
    } | null;
    topFragger: { username: string; kills: number } | null;
  } | null = null;

  if (tournament.status === "COMPLETED") {
    const grandFinal = [...tournament.matches]
      .filter((m) => m.status === "FINISHED" && m.winnerId)
      .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];

    let winner: { name: string; tag: string } | null = null;
    let runnerUp: { name: string; tag: string } | null = null;
    if (grandFinal) {
      const aWon = grandFinal.scoreA > grandFinal.scoreB;
      winner = aWon ? grandFinal.teamA : grandFinal.teamB;
      runnerUp = aWon ? grandFinal.teamB : grandFinal.teamA;
    }

    const tournamentMvps = await prisma.mvpAward.findMany({
      where: { tournamentId: tournament.id },
      include: { user: { select: { username: true, avatarUrl: true } } },
    });
    const mvpCount = new Map<
      string,
      { username: string; avatarUrl: string | null; count: number }
    >();
    for (const a of tournamentMvps) {
      const cur = mvpCount.get(a.userId);
      if (cur) cur.count++;
      else
        mvpCount.set(a.userId, {
          username: a.user.username,
          avatarUrl: a.user.avatarUrl,
          count: 1,
        });
    }
    const topMvp = Array.from(mvpCount.values()).sort(
      (a, b) => b.count - a.count
    )[0];

    const matchIds = tournament.matches.map((m) => m.id);
    const fragStats = matchIds.length
      ? await prisma.matchPlayerStat.groupBy({
          by: ["userId"],
          where: { matchId: { in: matchIds } },
          _sum: { kills: true },
          orderBy: { _sum: { kills: "desc" } },
          take: 1,
        })
      : [];
    const topFragUser = fragStats[0]
      ? await prisma.user.findUnique({
          where: { id: fragStats[0].userId },
          select: { username: true },
        })
      : null;

    results = {
      winner,
      runnerUp,
      mvp: topMvp
        ? {
            username: topMvp.username,
            avatarUrl: topMvp.avatarUrl,
            mvpCount: topMvp.count,
          }
        : null,
      topFragger:
        topFragUser && fragStats[0]
          ? {
              username: topFragUser.username,
              kills: fragStats[0]._sum.kills ?? 0,
            }
          : null,
    };
  }

  const matches = tournament.matches.map((m) => ({
    id: m.id,
    side: (m.bracketSide ?? "UPPER") as BracketSide,
    round: m.round ?? 1,
    position: m.bracketPosition ?? 1,
    teamA: m.teamA?.name ?? null,
    teamB: m.teamB?.name ?? null,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: m.status,
    stage: m.stage ?? null,
  }));

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer className="py-6">
          <Link
            href="/tournaments"
            className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-4"
          >
            ← Турниры
          </Link>

          {/* Header card */}
          <div className="rounded border border-border-default bg-bg-panel p-5 mb-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="yellow" size="sm">
                {tournament.game}
              </Badge>
              <Badge variant={statusBadgeVariant(tournament.status)} size="sm">
                {STATUS_LABEL[tournament.status]}
              </Badge>
              <span className="text-[11px] font-mono text-text-muted">
                {FORMAT_LABEL[tournament.format] ?? tournament.format}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {tournament.name}
            </h1>
            <div className="grid sm:grid-cols-4 gap-4 mt-5">
              <Stat
                label="Призовой"
                value={`₸ ${(Number(tournament.prize) / 100).toLocaleString("ru-RU")}`}
                accent="text-amber-300"
              />
              <Stat
                label="Команды"
                value={`${tournament.registrations.length}/${tournament.maxTeams}`}
              />
              <Stat
                label="Старт"
                value={
                  tournament.startsAt
                    ? new Date(tournament.startsAt).toLocaleDateString(
                        "ru-RU",
                        { day: "2-digit", month: "short" }
                      )
                    : "—"
                }
              />
              <Stat label="Матчей" value={String(tournament.matches.length)} />
            </div>
            <div className="mt-5 pt-4 border-t border-border-default">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
                Поделиться
              </p>
              <ShareButtons
                path={`/tournaments/${tournament.slug}`}
                title={tournament.name}
                text={`${tournament.name} — призовой ₸${(Number(tournament.prize) / 100).toLocaleString("ru-RU")}`}
              />
            </div>
          </div>

          {/* Registration widget */}
          {tournament.status === "REGISTRATION_OPEN" && (
            <section className="rounded border border-brand-yellow/40 bg-bg-panel p-5 mb-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
                Регистрация команды
              </h2>
              {!user ? (
                <div className="text-[13px] text-text-secondary">
                  <Link
                    href="/api/auth/steam"
                    className="text-brand-blue hover:text-brand-blue-hover"
                  >
                    Войди через Steam
                  </Link>{" "}
                  чтобы зарегистрировать команду.
                </div>
              ) : !captainTeam ? (
                <div className="text-[13px] text-text-secondary">
                  Нужно быть капитаном команды по {tournament.game}.{" "}
                  <Link
                    href="/teams/new"
                    className="text-brand-blue hover:text-brand-blue-hover"
                  >
                    Создать команду →
                  </Link>
                </div>
              ) : alreadyRegistered ? (
                <div className="text-[13px] text-emerald-300">
                  ✓ Команда{" "}
                  <span className="font-semibold">{captainTeam.name}</span>{" "}
                  уже зарегистрирована.
                </div>
              ) : captainTeam.members.length < tournament.rosterSize ? (
                <div className="text-[13px] text-text-secondary">
                  В команде {captainTeam.members.length} игроков. Нужно как
                  минимум {tournament.rosterSize}.{" "}
                  <Link
                    href={`/teams/${captainTeam.tag}/edit`}
                    className="text-brand-blue hover:text-brand-blue-hover"
                  >
                    Добавить игроков →
                  </Link>
                </div>
              ) : (
                <RegistrationForm
                  tournamentId={tournament.id}
                  rosterSize={tournament.rosterSize}
                  substitutesAllowed={tournament.substitutesAllowed}
                  team={captainTeam}
                  autoApprove={tournament.autoApproveTeams}
                />
              )}
            </section>
          )}

          {/* Results */}
          {results && (results.winner || results.mvp) && (
            <section className="mb-5 rounded border border-brand-yellow/40 bg-bg-panel p-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
                Итоги турнира
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {results.winner && (
                  <ResultCard
                    label="🥇 1 место"
                    title={results.winner.name}
                    subtitle={`[${results.winner.tag}]`}
                  />
                )}
                {results.runnerUp && (
                  <ResultCard
                    label="🥈 2 место"
                    title={results.runnerUp.name}
                    subtitle={`[${results.runnerUp.tag}]`}
                  />
                )}
                {results.mvp && (
                  <ResultCard
                    label="⭐ MVP"
                    title={results.mvp.username}
                    subtitle={`${results.mvp.mvpCount} наград`}
                    href={`/players/${encodeURIComponent(results.mvp.username)}`}
                  />
                )}
                {results.topFragger && (
                  <ResultCard
                    label="🎯 Top fragger"
                    title={results.topFragger.username}
                    subtitle={`${results.topFragger.kills} убийств`}
                    href={`/players/${encodeURIComponent(results.topFragger.username)}`}
                  />
                )}
              </div>
            </section>
          )}

          {/* Tabs: Bracket | Stats */}
          <div className="flex gap-1 border-b border-border-default mb-3">
            <span className="px-3 h-9 inline-flex items-center text-[12px] font-medium uppercase tracking-wide border-b-2 border-brand-yellow text-text-primary">
              Bracket
            </span>
            <Link
              href={`/tournaments/${tournament.slug}/stats`}
              className="px-3 h-9 inline-flex items-center text-[12px] font-medium uppercase tracking-wide border-b-2 -mb-px border-transparent text-text-secondary hover:text-text-primary"
            >
              Stats
            </Link>
          </div>

          {/* Bracket */}
          {tournament.matches.length > 0 ? (
            <section className="mb-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
                Сетка турнира
              </h2>
              <TournamentBracket matches={matches} />
            </section>
          ) : (
            <section className="rounded border border-dashed border-border-default p-8 text-center text-text-secondary mb-5">
              <p className="font-semibold mb-1 text-text-primary text-sm">
                Сетка ещё не сгенерирована
              </p>
              <p className="text-[12px]">
                Появится после закрытия регистрации и жеребьёвки.
              </p>
            </section>
          )}

          {/* Teams */}
          <section className="mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
              Участники ({tournament.registrations.length})
            </h2>
            {tournament.registrations.length === 0 ? (
              <p className="text-[12px] text-text-muted">
                Команды ещё не зарегистрированы.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {tournament.registrations.map((r) => {
                  const isApproved = !!r.approvedAt;
                  return (
                    <Link
                      key={r.id}
                      href={`/teams/${r.team.tag}`}
                      className={`rounded border bg-bg-panel hover:bg-bg-elevated p-3 text-[13px] font-semibold transition-colors ${
                        isApproved
                          ? "border-border-default"
                          : "border-dashed border-border-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.team.name}</span>
                        {!isApproved && (
                          <Badge variant="upcoming" size="sm">
                            wait
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        [{r.team.tag}]
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Description / rules */}
          {(tournament.description || tournament.rulesMarkdown) && (
            <section className="rounded border border-border-default bg-bg-panel p-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
                О турнире
              </h2>
              <Markdown
                source={
                  tournament.rulesMarkdown || tournament.description || ""
                }
              />
            </section>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold tabular-nums ${accent ?? "text-text-primary"}`}
      >
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  title,
  subtitle,
  href,
}: {
  label: string;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded border border-border-default bg-bg-elevated p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-1">
        {label}
      </div>
      <div className="text-base font-bold tracking-tight truncate">{title}</div>
      <div className="text-[11px] font-mono text-text-muted mt-0.5">
        {subtitle}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function RegistrationForm({
  tournamentId,
  rosterSize,
  substitutesAllowed,
  team,
  autoApprove,
}: {
  tournamentId: string;
  rosterSize: number;
  substitutesAllowed: number;
  team: {
    id: string;
    name: string;
    tag: string;
    members: { userId: string; user: { id: string; username: string } }[];
  };
  autoApprove: boolean;
}) {
  const maxTotal = rosterSize + substitutesAllowed;
  return (
    <form action={submitTournamentRegistration} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="teamId" value={team.id} />

      <div className="text-[12px] text-text-secondary">
        Команда:{" "}
        <span className="text-text-primary font-semibold">{team.name}</span>{" "}
        <span className="text-text-muted font-mono">[{team.tag}]</span>
      </div>
      <p className="text-[11px] text-text-muted">
        Выбери ростер — первые {rosterSize} будут основным составом,
        ещё до {substitutesAllowed} запасных. Всего до {maxTotal} игроков.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {team.members.map((m) => (
          <label
            key={m.userId}
            className="flex items-center gap-2 rounded-sm border border-border-default bg-bg-elevated p-2 text-[12px] hover:bg-bg-base cursor-pointer"
          >
            <input
              type="checkbox"
              name="userId"
              value={m.userId}
              defaultChecked
              className="accent-brand-yellow"
            />
            <span className="truncate">{m.user.username}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="md">
          Зарегистрировать
        </Button>
        <p className="text-[11px] text-text-muted">
          {autoApprove
            ? "Регистрация авто-подтвердится"
            : "Заявка уйдёт админу на проверку"}
        </p>
      </div>
    </form>
  );
}
