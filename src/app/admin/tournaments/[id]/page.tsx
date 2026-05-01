export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

import {
  generateBracket,
  registerTeam,
  uploadTournamentBanner,
  saveAsTemplate,
} from "../../actions";
import { ImageUploader } from "@/components/ImageUploader";

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
        orderBy: [{ bracketSide: "asc" }, { round: "asc" }, { bracketPosition: "asc" }],
      },
    },
  });

  if (!tournament) notFound();

  // Команды доступные для регистрации (не зарегистрированные ещё, той же игры)
  const registeredTeamIds = new Set(tournament.registrations.map((r) => r.teamId));
  const availableTeams = await prisma.team.findMany({
    where: {
      game: tournament.game,
      id: { notIn: Array.from(registeredTeamIds) },
    },
    orderBy: { rating: "desc" },
  });

  const canGenerate =
    tournament.format === "DOUBLE_ELIMINATION" &&
    tournament.matches.length === 0 &&
    tournament.registrations.length >= 2 &&
    [4, 8, 16].includes(tournament.registrations.length);

  return (
    <>
      
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <Link
          href="/admin/tournaments"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Турниры
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                {tournament.game}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {tournament.status}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-zinc-400 text-sm mt-1 font-mono">
              {tournament.format} · ₸{" "}
              {(Number(tournament.prize) / 100).toLocaleString("ru-RU")} ·{" "}
              {tournament.registrations.length}/{tournament.maxTeams} команд
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Link
              href={`/tournaments/${tournament.slug}`}
              className="text-xs font-mono px-4 h-9 inline-flex items-center rounded border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all"
            >
              Публичная страница →
            </Link>
            {canGenerate && (
              <form action={generateBracket}>
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <button
                  type="submit"
                  className="text-xs font-mono px-4 h-9 inline-flex items-center rounded bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
                >
                  ⚙ Сгенерировать сетку
                </button>
              </form>
            )}
            <form action={saveAsTemplate}>
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <input type="hidden" name="templateName" value={tournament.name} />
              <button
                type="submit"
                className="text-xs font-mono px-4 h-9 inline-flex items-center rounded border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all"
                title="Сохранить настройки как шаблон для будущих турниров"
              >
                💾 Сохранить как шаблон
              </button>
            </form>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Registered teams */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Зарегистрированные ({tournament.registrations.length})
            </h2>
            {tournament.registrations.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Команд ещё нет. Регистрируй вручную справа.
              </p>
            ) : (
              <ul className="space-y-2">
                {tournament.registrations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/40 p-3 text-sm"
                  >
                    <div>
                      <span className="font-bold">{r.team.name}</span>
                      <span className="text-xs font-mono text-zinc-500 ml-2">
                        [{r.team.tag}]
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">
                      ✓ approved
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Available teams to register */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Можно зарегистрировать
            </h2>
            {availableTeams.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Нет других команд по {tournament.game}.
              </p>
            ) : (
              <ul className="space-y-2">
                {availableTeams.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/40 p-3 text-sm"
                  >
                    <div>
                      <span className="font-bold">{t.name}</span>
                      <span className="text-xs font-mono text-zinc-500 ml-2">
                        [{t.tag}] · {t.rating} pts
                      </span>
                    </div>
                    <form action={registerTeam}>
                      <input type="hidden" name="tournamentId" value={tournament.id} />
                      <input type="hidden" name="teamId" value={t.id} />
                      <button
                        type="submit"
                        className="text-xs font-mono px-3 h-7 inline-flex items-center rounded border border-violet-500/30 hover:bg-violet-500/10 transition-all"
                      >
                        + Добавить
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Bracket — список матчей */}
        {tournament.matches.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Матчи турнира ({tournament.matches.length})
            </h2>
            <div className="space-y-2">
              {tournament.matches.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/matches/${m.id}`}
                  className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 p-3 text-sm"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      {m.bracketSide ?? "—"} R{m.round} · #{m.bracketPosition}
                    </span>
                    <span className="font-bold">
                      {m.teamA?.name ?? "TBD"}
                    </span>
                    <span className="text-zinc-500 font-mono">
                      {m.scoreA} : {m.scoreB}
                    </span>
                    <span className="font-bold">
                      {m.teamB?.name ?? "TBD"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {m.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Баннер турнира
          </h2>
          <ImageUploader
            currentUrl={tournament.bannerUrl}
            action={uploadTournamentBanner}
            extraFields={{ tournamentId: tournament.id }}
            label="Баннер"
            hint="PNG / JPG / WebP. До 1 МБ. Лучше широкая картинка 1920×640 или похожая (соотношение 3:1)."
          />
        </section>

        {tournament.description && (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              Описание
            </h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {tournament.description}
            </p>
          </section>
        )}
      </main>
      
    </>
  );
}
