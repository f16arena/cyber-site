export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

import {
  setMatchResult,
  recordPlayerStat,
  importFaceitMatch,
  importOpenDotaMatch,
} from "../../actions";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      tournament: { select: { id: true, name: true, game: true } },
      teamA: {
        include: {
          members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
        },
      },
      teamB: {
        include: {
          members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
        },
      },
      playerStats: {
        include: { match: true },
      },
    },
  });

  if (!match) notFound();

  const game = match.tournament?.game ?? "CS2";
  const allPlayers = [
    ...(match.teamA?.members ?? []).map((m) => ({
      ...m.user,
      teamId: match.teamAId!,
      teamName: match.teamA!.name,
    })),
    ...(match.teamB?.members ?? []).map((m) => ({
      ...m.user,
      teamId: match.teamBId!,
      teamName: match.teamB!.name,
    })),
  ];
  const statByUser = new Map(match.playerStats.map((s) => [s.userId, s]));

  return (
    <>
      
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <Link
          href={
            match.tournament
              ? `/admin/tournaments/${match.tournament.id}`
              : "/admin"
          }
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Назад
        </Link>

        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-6 mb-8">
          <div className="text-xs font-mono text-zinc-500 mb-2">
            {match.tournament?.name ?? "Match"} · {match.stage ?? "—"} · BO{match.bestOf}
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold">{match.teamA?.name ?? "TBD"}</div>
              <div className="text-xs font-mono text-zinc-500">
                [{match.teamA?.tag ?? "—"}]
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold font-mono">
                <span
                  className={
                    match.scoreA > match.scoreB ? "text-emerald-400" : "text-zinc-500"
                  }
                >
                  {match.scoreA}
                </span>
                <span className="text-zinc-700 mx-2">:</span>
                <span
                  className={
                    match.scoreB > match.scoreA ? "text-emerald-400" : "text-zinc-500"
                  }
                >
                  {match.scoreB}
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">
                {match.status} {match.map ? `· ${match.map}` : ""}
              </div>
            </div>
            <div>
              <div className="text-xl font-bold">{match.teamB?.name ?? "TBD"}</div>
              <div className="text-xs font-mono text-zinc-500">
                [{match.teamB?.tag ?? "—"}]
              </div>
            </div>
          </div>
        </div>

        {/* OpenDota Import */}
        {game === "DOTA2" && (
          <section className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-rose-500/15 text-rose-300 border-rose-500/40">
                OPENDOTA
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Авто-импорт статистики Dota 2 матча
              </span>
            </div>
            <form
              action={importOpenDotaMatch}
              className="flex flex-col sm:flex-row gap-3 items-start"
            >
              <input type="hidden" name="matchId" value={match.id} />
              <input
                name="opendotaMatch"
                placeholder="https://www.opendota.com/matches/8234567890 или 8234567890"
                className="flex-1 bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-rose-400 transition-colors font-mono"
              />
              <button
                type="submit"
                className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 transition-all"
              >
                Импортировать
              </button>
            </form>
            <p className="text-[10px] font-mono text-zinc-500 mt-2">
              Бесплатно (60 запросов/мин). С OPENDOTA_API_KEY лимит выше.
            </p>
          </section>
        )}

        {/* FACEIT Import */}
        {game === "CS2" && (
          <section className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-orange-500/15 text-orange-300 border-orange-500/40">
                FACEIT
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Авто-импорт статистики матча
              </span>
            </div>
            <form
              action={importFaceitMatch}
              className="flex flex-col sm:flex-row gap-3 items-start"
            >
              <input type="hidden" name="matchId" value={match.id} />
              <input
                name="faceitMatch"
                placeholder="https://www.faceit.com/en/cs2/room/1-abc-123 или 1-abc-123"
                className="flex-1 bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-orange-400 transition-colors font-mono"
              />
              <button
                type="submit"
                className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all"
              >
                Импортировать
              </button>
            </form>
            <p className="text-[10px] font-mono text-zinc-500 mt-2">
              Требуется FACEIT_API_KEY. Получить: developers.faceit.com
            </p>
          </section>
        )}

        {/* Result form */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
            Результат матча
          </h2>
          <form action={setMatchResult} className="grid sm:grid-cols-4 gap-3 items-end">
            <input type="hidden" name="matchId" value={match.id} />
            <Field label={`Счёт ${match.teamA?.tag ?? "A"}`}>
              <input
                name="scoreA"
                type="number"
                min={0}
                defaultValue={match.scoreA}
                className={inputCls}
              />
            </Field>
            <Field label={`Счёт ${match.teamB?.tag ?? "B"}`}>
              <input
                name="scoreB"
                type="number"
                min={0}
                defaultValue={match.scoreB}
                className={inputCls}
              />
            </Field>
            <Field label="Карта">
              <input
                name="map"
                defaultValue={match.map ?? ""}
                placeholder="Mirage / Inferno / Anubis"
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
            >
              Сохранить
            </button>
          </form>
        </section>

        {/* Player stats */}
        {allPlayers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-sm">
            В командах нет игроков — пока нечего отслеживать. Состав появится,
            когда команды зарегистрируют игроков.
          </div>
        ) : (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Статистика игроков ({game})
            </h2>
            <div className="space-y-3">
              {allPlayers.map((p) => {
                const stat = statByUser.get(p.id);
                return (
                  <details
                    key={p.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 group"
                  >
                    <summary className="cursor-pointer p-4 flex items-center gap-3 list-none">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarUrl}
                          alt={p.username}
                          className="w-8 h-8 rounded border border-zinc-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-violet-500/20" />
                      )}
                      <div className="flex-1">
                        <span className="font-bold">{p.username}</span>
                        <span className="text-xs font-mono text-zinc-500 ml-2">
                          {p.teamName}
                        </span>
                      </div>
                      {stat && (
                        <span className="text-xs font-mono text-emerald-400">
                          {stat.kills}/{stat.deaths}/{stat.assists}
                          {stat.isMvp && " · ⭐ MVP"}
                        </span>
                      )}
                      <span className="text-violet-400 group-open:rotate-45 transition-transform">
                        +
                      </span>
                    </summary>
                    <div className="p-4 border-t border-zinc-800">
                      <form
                        action={recordPlayerStat}
                        className="grid sm:grid-cols-4 gap-3"
                      >
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="teamId" value={p.teamId} />
                        <input type="hidden" name="game" value={game} />
                        <Field label="K">
                          <input
                            name="kills"
                            type="number"
                            min={0}
                            defaultValue={stat?.kills ?? 0}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="D">
                          <input
                            name="deaths"
                            type="number"
                            min={0}
                            defaultValue={stat?.deaths ?? 0}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="A">
                          <input
                            name="assists"
                            type="number"
                            min={0}
                            defaultValue={stat?.assists ?? 0}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="ADR">
                          <input
                            name="adr"
                            type="number"
                            step="0.1"
                            defaultValue={
                              ((stat?.extra as { adr?: number })?.adr ?? 0) || ""
                            }
                            className={inputCls}
                          />
                        </Field>
                        <Field label="HS %">
                          <input
                            name="hsPct"
                            type="number"
                            step="0.1"
                            min={0}
                            max={100}
                            defaultValue={
                              ((stat?.extra as { hsPct?: number })?.hsPct ?? 0) || ""
                            }
                            className={inputCls}
                          />
                        </Field>
                        <Field label="KAST %">
                          <input
                            name="kast"
                            type="number"
                            step="0.1"
                            min={0}
                            max={100}
                            defaultValue={
                              ((stat?.extra as { kast?: number })?.kast ?? 0) || ""
                            }
                            className={inputCls}
                          />
                        </Field>
                        <label className="flex items-end gap-2 text-sm pb-2">
                          <input
                            type="checkbox"
                            name="isMvp"
                            defaultChecked={stat?.isMvp ?? false}
                            className="w-4 h-4"
                          />
                          MVP матча
                        </label>
                        <button
                          type="submit"
                          className="h-11 rounded font-bold text-xs uppercase tracking-wider bg-violet-500 hover:bg-violet-400 transition-all"
                        >
                          Сохранить
                        </button>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </main>
      
    </>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-3 text-sm focus:outline-none focus:border-violet-400 transition-colors";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
