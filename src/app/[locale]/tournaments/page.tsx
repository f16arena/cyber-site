export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import type { Game } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION_OPEN: "Регистрация",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  ONGOING: "Идёт сейчас",
  COMPLETED: "Завершён",
};

const STATUS_COLOR: Record<string, string> = {
  REGISTRATION_OPEN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  REGISTRATION_CLOSED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ONGOING: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  COMPLETED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  const validGame = ["CS2", "DOTA2", "PUBG"].includes(game?.toUpperCase() ?? "")
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
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Tournaments
          </p>
          <h1 className="text-4xl font-black tracking-tight">Турниры</h1>
          <p className="text-zinc-400 mt-2">
            Регулярные чемпионаты по CS2, Dota 2 и PUBG.
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { v: "ALL", label: "Все" },
            { v: "CS2", label: "CS2" },
            { v: "DOTA2", label: "Dota 2" },
            { v: "PUBG", label: "PUBG" },
          ].map((f) => {
            const active =
              (f.v === "ALL" && !validGame) ||
              (validGame && f.v === validGame);
            const href = f.v === "ALL" ? "/tournaments" : `/tournaments?game=${f.v.toLowerCase()}`;
            return (
              <Link
                key={f.v}
                href={href}
                className={`px-4 h-9 inline-flex items-center text-sm font-mono rounded border transition-all ${
                  active
                    ? "bg-violet-500/15 text-violet-200 border-violet-500/50"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-500">
            <p className="text-lg mb-2">Турниров пока нет.</p>
            <p className="text-sm">Скоро здесь появится первый чемпионат.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.slug}`}
                className="group rounded-lg border border-zinc-800 hover:border-violet-500/40 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all p-5"
              >
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-900/40 border-zinc-700">
                    {t.game}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${STATUS_COLOR[t.status] || ""}`}
                  >
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight group-hover:text-violet-200 transition-colors">
                  {t.name}
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-zinc-500 uppercase">Призовой</div>
                    <div className="text-amber-300 font-bold">
                      ₸ {(Number(t.prize) / 100).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 uppercase">Команды</div>
                    <div className="font-bold">
                      {t._count.registrations}/{t.maxTeams}
                    </div>
                  </div>
                </div>
                {t.startsAt && (
                  <div className="mt-3 text-[10px] font-mono text-zinc-500">
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
      </main>
      <SiteFooter />
    </>
  );
}
