export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { displayNameFor } from "@/lib/hub/maps";
import { CancelLobbyButton } from "./cancel-button";

const STATE_STYLE: Record<string, string> = {
  CAPTAIN_SELECT: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  PICKING: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  VETO: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  SERVER_ALLOCATION: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  LIVE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  FINISHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  CANCELLED: "bg-zinc-700/30 text-zinc-500 border-zinc-700",
};

function relTime(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)} сек назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  return `${Math.floor(diff / 3600)} ч назад`;
}

export default async function AdminHubLobbiesPage() {
  await requireAdmin();

  const lobbies = await prisma.hubLobby.findMany({
    where: {
      state: {
        in: ["CAPTAIN_SELECT", "PICKING", "VETO", "SERVER_ALLOCATION", "LIVE"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      state: true,
      pickTurn: true,
      vetoTurn: true,
      selectedMap: true,
      matchId: true,
      createdAt: true,
      expiresAt: true,
      captainAId: true,
      captainBId: true,
      players: {
        select: {
          userId: true,
          team: true,
          isCaptain: true,
          pickOrder: true,
        },
      },
      server: { select: { name: true, ip: true, port: true } },
    },
  });

  const allUserIds = lobbies.flatMap((l) => l.players.map((p) => p.userId));
  const users = allUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, username: true },
      })
    : [];
  const usernameById = new Map(users.map((u) => [u.id, u.username]));
  const nameOf = (uid: string) => usernameById.get(uid) ?? uid.slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">Активные лобби</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Все лобби в фазе пика / veto / выделения сервера / live. Можно
          принудительно отменить — игроки уйдут из лобби без штрафа.
        </p>
      </header>

      {lobbies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
          Сейчас ни одно лобби не активно.
        </div>
      ) : (
        <div className="space-y-3">
          {lobbies.map((l) => {
            const teamA = l.players.filter((p) => p.team === "A");
            const teamB = l.players.filter((p) => p.team === "B");
            const available = l.players.filter(
              (p) => p.team === null && !p.isCaptain
            );
            return (
              <div
                key={l.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        STATE_STYLE[l.state]
                      }`}
                    >
                      {l.state}
                    </span>
                    <span className="font-mono text-xs text-zinc-400">
                      #{l.id.slice(0, 10)}
                    </span>
                    {l.matchId && (
                      <Link
                        href={`/admin/hub/matches`}
                        className="font-mono text-xs text-violet-300 hover:text-violet-200"
                      >
                        → match #{l.matchId.slice(0, 8)}
                      </Link>
                    )}
                    {l.selectedMap && (
                      <span className="text-xs font-bold text-emerald-300">
                        {displayNameFor(l.selectedMap)}
                      </span>
                    )}
                    {l.server && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {l.server.name} ({l.server.ip}:{l.server.port})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-500">
                      создано {relTime(l.createdAt)}
                    </span>
                    <CancelLobbyButton lobbyId={l.id} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded border border-orange-500/30 bg-orange-500/5 p-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-orange-300 mb-1">
                      Team A {l.pickTurn === "A" && (l.state === "PICKING" || l.state === "CAPTAIN_SELECT") ? "· ход" : ""}
                      {l.vetoTurn === "A" && l.state === "VETO" ? "· veto" : ""}
                    </div>
                    <ul className="space-y-0.5">
                      {teamA.map((p) => (
                        <li
                          key={p.userId}
                          className={p.isCaptain ? "font-bold" : ""}
                        >
                          {p.isCaptain && "⭐ "}
                          {nameOf(p.userId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                      Доступные ({available.length})
                    </div>
                    <ul className="space-y-0.5 text-zinc-400">
                      {available.length === 0 ? (
                        <li className="text-zinc-600">—</li>
                      ) : (
                        available.map((p) => (
                          <li key={p.userId}>{nameOf(p.userId)}</li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="rounded border border-rose-500/30 bg-rose-500/5 p-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-1">
                      Team B {l.pickTurn === "B" && (l.state === "PICKING" || l.state === "CAPTAIN_SELECT") ? "· ход" : ""}
                      {l.vetoTurn === "B" && l.state === "VETO" ? "· veto" : ""}
                    </div>
                    <ul className="space-y-0.5">
                      {teamB.map((p) => (
                        <li
                          key={p.userId}
                          className={p.isCaptain ? "font-bold" : ""}
                        >
                          {p.isCaptain && "⭐ "}
                          {nameOf(p.userId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
