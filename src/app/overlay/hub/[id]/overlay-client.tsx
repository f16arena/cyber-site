"use client";

import { useEffect, useState } from "react";

type Player = {
  steamId: string;
  username: string;
  avatarUrl: string | null;
};

type Snapshot = {
  id: string;
  state: string;
  map: string;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  teamA: Player[];
  teamB: Player[];
};

const MAP_DISPLAY: Record<string, string> = {
  mirage: "MIRAGE",
  inferno: "INFERNO",
  nuke: "NUKE",
  ancient: "ANCIENT",
  anubis: "ANUBIS",
  vertigo: "VERTIGO",
  dust2: "DUST 2",
};

export function OverlayClient({ matchId }: { matchId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/hub/spectate/${matchId}/stream`);
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [matchId]);

  if (!snap) return null;

  return (
    <div className="pointer-events-none select-none flex items-start justify-center pt-6">
      <div className="inline-flex items-center gap-4 bg-black/70 backdrop-blur-md border border-orange-500/40 rounded-lg px-6 py-3 shadow-2xl">
        {/* Team A */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono uppercase tracking-widest text-orange-300 font-bold">
            TEAM A
          </div>
          <div className="text-4xl font-black tabular-nums text-orange-300 leading-none">
            {snap.scoreA}
          </div>
        </div>

        {/* Map */}
        <div className="flex flex-col items-center px-4 border-x border-zinc-700">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            {snap.state === "LIVE" ? "🔴 LIVE" : snap.state}
          </div>
          <div className="text-xl font-black tracking-tight text-white">
            {MAP_DISPLAY[snap.map] ?? snap.map.toUpperCase()}
          </div>
        </div>

        {/* Team B */}
        <div className="flex items-center gap-2">
          <div className="text-4xl font-black tabular-nums text-rose-300 leading-none">
            {snap.scoreB}
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-rose-300 font-bold">
            TEAM B
          </div>
        </div>
      </div>
    </div>
  );
}
