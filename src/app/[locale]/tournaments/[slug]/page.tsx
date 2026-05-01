export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TournamentBracket } from "./bracket";
import type { BracketSide } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION_OPEN: "Регистрация открыта",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  ONGOING: "Идёт",
  COMPLETED: "Завершён",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, description: true, bannerUrl: true, game: true, prize: true },
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

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      registrations: {
        include: {
          team: { select: { id: true, name: true, tag: true } },
        },
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

  if (!tournament || tournament.status === "DRAFT") notFound();

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
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <Link
          href="/tournaments"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Турниры
        </Link>

        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-8 mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
              {tournament.game}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {STATUS_LABEL[tournament.status] || tournament.status}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {tournament.format}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
            {tournament.name}
          </h1>
          <div className="grid sm:grid-cols-4 gap-4 mt-6">
            <Stat label="Призовой" value={`₸ ${(Number(tournament.prize) / 100).toLocaleString("ru-RU")}`} accent="text-amber-300" />
            <Stat label="Команды" value={`${tournament.registrations.length}/${tournament.maxTeams}`} />
            <Stat
              label="Старт"
              value={
                tournament.startsAt
                  ? new Date(tournament.startsAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"
              }
            />
            <Stat label="Матчей" value={String(tournament.matches.length)} />
          </div>
        </div>

        {/* Bracket */}
        {tournament.matches.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              Сетка турнира
            </h2>
            <TournamentBracket matches={matches} />
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 mb-8">
            <p className="font-bold mb-2 text-zinc-300">Сетка ещё не сгенерирована</p>
            <p className="text-sm">
              Появится после закрытия регистрации и жеребьёвки.
            </p>
          </section>
        )}

        {/* Teams list */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
            Участники ({tournament.registrations.length})
          </h2>
          {tournament.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Команды ещё не зарегистрированы.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tournament.registrations.map((r) => (
                <Link
                  key={r.id}
                  href={`/teams/${r.team.tag}`}
                  className="rounded border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 p-3 text-sm font-medium"
                >
                  {r.team.name}
                  <span className="text-xs font-mono text-zinc-500 ml-1">
                    [{r.team.tag}]
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {tournament.description && (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
              О турнире
            </h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {tournament.description}
            </p>
          </section>
        )}
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
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-black ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
