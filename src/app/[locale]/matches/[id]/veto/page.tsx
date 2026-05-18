export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CS2_MAP_POOL, displayNameFor } from "@/lib/cs2/maps";
import { getPresetSteps, resolveVetoPresetId } from "@/lib/veto/presets";
import {
  isVetoComplete,
  getMatchMaps,
  currentStep,
  availableMaps,
  type AppliedAction,
} from "@/lib/veto/engine";
import { submitVetoAction } from "../../actions";

export default async function MatchVetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [match, user] = await Promise.all([
    prisma.match.findUnique({
      where: { id },
      include: {
        teamA: { select: { id: true, name: true, tag: true, captainId: true } },
        teamB: { select: { id: true, name: true, tag: true, captainId: true } },
        tournament: {
          select: { id: true, name: true, slug: true, mapPool: true, vetoPreset: true },
        },
        vetoActions: { orderBy: { order: "asc" } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!match) notFound();

  const mapPool = Array.isArray(match.tournament?.mapPool)
    ? (match.tournament!.mapPool as string[])
    : CS2_MAP_POOL.map((m) => m.id);

  const presetId = resolveVetoPresetId(
    match.tournament?.vetoPreset ?? "AUTO",
    match.bestOf
  );
  const preset = getPresetSteps(presetId);

  const applied: AppliedAction[] = match.vetoActions.map((a) => ({
    team: a.team as "A" | "B",
    action: a.action as "BAN" | "PICK" | "DECIDER",
    map: a.map,
    order: a.order,
  }));
  const state = { preset, applied, mapPool };

  const step = currentStep(state);
  const avail = availableMaps(state);
  const complete = isVetoComplete(state);
  const finalMaps = complete ? getMatchMaps(state) : [];

  let myTeam: "A" | "B" | null = null;
  if (user) {
    if (match.teamA?.captainId === user.id) myTeam = "A";
    else if (match.teamB?.captainId === user.id) myTeam = "B";
  }
  const isMyTurn = step !== null && myTeam !== null && step.team === myTeam;

  if (!match.vetoStartedAt) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <PageContainer maxWidth="narrow" className="py-10">
            <BackLink matchId={match.id} />
            <h1 className="text-xl font-bold tracking-tight mb-2">
              Veto не запущен
            </h1>
            <p className="text-text-secondary text-[13px]">
              Админ запустит pick/ban за несколько минут до старта матча.
            </p>
          </PageContainer>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer maxWidth="narrow" className="py-6">
          <BackLink matchId={match.id} />

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="yellow" size="sm">BO{match.bestOf}</Badge>
            <Badge variant="default" size="sm">{presetId}</Badge>
            {complete && <Badge variant="win" size="sm">Завершён</Badge>}
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1">
            Pick / Ban
          </h1>
          <p className="text-[13px] text-text-secondary mb-5">
            {match.teamA?.name ?? "TBD"}{" "}
            <span className="text-text-muted font-mono">vs</span>{" "}
            {match.teamB?.name ?? "TBD"}
            {match.tournament && (
              <>
                {" · "}
                <Link
                  href={`/tournaments/${match.tournament.slug}`}
                  className="text-brand-blue hover:text-brand-blue-hover"
                >
                  {match.tournament.name}
                </Link>
              </>
            )}
          </p>

          {/* Current step / map grid */}
          {!complete && step && (
            <section className="rounded border border-brand-yellow/40 bg-bg-panel p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="yellow" size="md">
                  Шаг {applied.length + 1}
                </Badge>
                <span className="text-[13px] text-text-primary font-semibold">
                  Команда {step.team}:{" "}
                  {step.action === "BAN" ? "БАН" : "ПИК"}
                </span>
                {isMyTurn ? (
                  <Badge variant="live" size="sm">Ваш ход</Badge>
                ) : (
                  <span className="text-[11px] font-mono text-text-muted">
                    ждём капитана {step.team}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {avail.map((mapId) => {
                  const meta = CS2_MAP_POOL.find((m) => m.id === mapId);
                  return (
                    <form
                      key={mapId}
                      action={submitVetoAction}
                      className="contents"
                    >
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="map" value={mapId} />
                      <button
                        type="submit"
                        disabled={!isMyTurn}
                        className={`relative rounded-sm border bg-bg-elevated transition-all overflow-hidden ${
                          isMyTurn
                            ? step.action === "BAN"
                              ? "border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/10"
                              : "border-brand-yellow/40 hover:border-brand-yellow hover:bg-brand-yellow/10"
                            : "border-border-default opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div
                          className="h-16"
                          style={{
                            background:
                              meta?.gradient ?? "var(--bg-elevated)",
                          }}
                        />
                        <div className="px-2 py-1.5 text-left">
                          <div className="text-[13px] font-semibold text-text-primary">
                            {displayNameFor(mapId)}
                          </div>
                          {meta?.tagline && (
                            <div className="text-[10px] font-mono text-text-muted">
                              {meta.tagline}
                            </div>
                          )}
                        </div>
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          )}

          {/* Final maps (veto complete) */}
          {complete && (
            <section className="rounded border border-emerald-500/40 bg-emerald-500/5 p-4 mb-5">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-3">
                Карты для игры
              </h3>
              <div className="flex flex-wrap gap-2">
                {finalMaps.map((m, i) => (
                  <div
                    key={m}
                    className="rounded-sm border border-emerald-500/40 bg-bg-elevated px-3 py-1.5 text-[13px]"
                  >
                    <span className="text-[10px] font-mono text-text-muted mr-1">
                      #{i + 1}
                    </span>
                    <span className="font-semibold">{displayNameFor(m)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          <section className="rounded border border-border-default bg-bg-panel p-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
              История действий
            </h3>
            {applied.length === 0 ? (
              <p className="text-[12px] text-text-muted">Пока пусто.</p>
            ) : (
              <ol className="space-y-1.5">
                {applied.map((a) => {
                  const teamName =
                    a.team === "A"
                      ? match.teamA?.name ?? "Команда A"
                      : match.teamB?.name ?? "Команда B";
                  const actionLabel =
                    a.action === "BAN"
                      ? "забанила"
                      : a.action === "PICK"
                        ? "пикнула"
                        : "decider";
                  const actionColor =
                    a.action === "BAN"
                      ? "text-rose-300"
                      : a.action === "PICK"
                        ? "text-brand-yellow"
                        : "text-emerald-300";
                  return (
                    <li
                      key={a.order}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span className="font-mono text-text-muted w-5">
                        {a.order}.
                      </span>
                      <span className="text-text-primary font-semibold">
                        {teamName}
                      </span>
                      <span className={actionColor}>{actionLabel}</span>
                      <span className="font-semibold text-text-primary">
                        {displayNameFor(a.map)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

function BackLink({ matchId }: { matchId: string }) {
  return (
    <Link
      href={`/matches/${matchId}`}
      className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-4"
    >
      ← К матчу
    </Link>
  );
}
