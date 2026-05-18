"use client";

import { useEffect, useState } from "react";
import { MapCard } from "@/components/hub/MapCard";

type Player = {
  steamId: string;
  username: string;
  avatarUrl: string | null;
  elo: number;
  eloDelta: number | null;
};

type Snapshot = {
  id: string;
  state: "PENDING" | "WARMUP" | "LIVE" | "FINISHED" | "CANCELLED";
  map: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  startedAt: string | null;
  finishedAt: string | null;
  teamA: Player[];
  teamB: Player[];
};

const MAP_DISPLAY: Record<string, string> = {
  mirage: "Mirage",
  inferno: "Inferno",
  nuke: "Nuke",
  ancient: "Ancient",
  anubis: "Anubis",
  vertigo: "Vertigo",
  dust2: "Dust 2",
};

const STATE_LABEL: Record<Snapshot["state"], string> = {
  PENDING: "Ожидание",
  WARMUP: "Разогрев",
  LIVE: "LIVE",
  FINISHED: "Завершён",
  CANCELLED: "Отменён",
};

export function SpectateScreen({ matchId }: { matchId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/hub/spectate/${matchId}/stream`);
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);
        if (data.state === "FINISHED" || data.state === "CANCELLED") {
          es.close();
        }
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [matchId]);

  if (!snap) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center text-zinc-500 font-mono text-sm">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-[11px] font-mono text-amber-200/80 inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        SPECTATING · live read-only
      </div>

      <header className="grid lg:grid-cols-[280px_1fr] gap-4">
        <MapCard mapId={snap.map} state="selected" size="lg" />
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
              Матч #{snap.id.slice(0, 8)}
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {MAP_DISPLAY[snap.map] ?? snap.map}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Счёт
              </div>
              <div className="text-5xl font-black tabular-nums">
                <span className="text-orange-300">{snap.scoreA}</span>
                <span className="text-zinc-600 mx-2">:</span>
                <span className="text-rose-300">{snap.scoreB}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Состояние
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  snap.state === "LIVE"
                    ? "text-rose-300"
                    : snap.state === "FINISHED"
                    ? "text-emerald-300"
                    : "text-zinc-300"
                }`}
              >
                {STATE_LABEL[snap.state]}
              </div>
            </div>
          </div>
        </div>
      </header>

      {snap.state === "FINISHED" && snap.winner && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">
            Результат
          </div>
          <div className="text-2xl font-black tracking-tight">
            Победила команда {snap.winner}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <TeamSide players={snap.teamA} side="A" score={snap.scoreA} />
        <TeamSide players={snap.teamB} side="B" score={snap.scoreB} />
      </div>
    </div>
  );
}

function TeamSide({
  players,
  side,
  score,
}: {
  players: Player[];
  side: "A" | "B";
  score: number;
}) {
  const accent =
    side === "A"
      ? "border-orange-500/30 bg-orange-500/5 text-orange-300"
      : "border-rose-500/30 bg-rose-500/5 text-rose-300";
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-mono uppercase tracking-widest">
          Team {side}
        </h2>
        <span className="text-2xl font-black tabular-nums">{score}</span>
      </div>
      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.steamId}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
          >
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatarUrl}
                alt={p.username}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                {p.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate text-sm">{p.username}</div>
              <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {p.elo} ELO
              </div>
            </div>
            {p.eloDelta !== null && (
              <div
                className={`text-sm font-bold font-mono tabular-nums ${
                  p.eloDelta > 0
                    ? "text-emerald-300"
                    : p.eloDelta < 0
                    ? "text-rose-300"
                    : "text-zinc-400"
                }`}
              >
                {p.eloDelta > 0 ? "+" : ""}
                {p.eloDelta}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
