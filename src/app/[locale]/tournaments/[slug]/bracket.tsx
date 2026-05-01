type BracketMatch = {
  id: string;
  side: "UPPER" | "LOWER" | "GROUP";
  round: number;
  position: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  status: string;
  stage: string | null;
};

export function TournamentBracket({ matches }: { matches: BracketMatch[] }) {
  const upper = matches.filter((m) => m.side === "UPPER");
  const lower = matches.filter((m) => m.side === "LOWER");

  // Группируем по раундам
  const upperByRound = groupByRound(upper);
  const lowerByRound = groupByRound(lower);

  return (
    <div className="space-y-8">
      {upperByRound.length > 0 && (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
            Upper Bracket
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {upperByRound.map((round, idx) => (
                <RoundColumn
                  key={`U${idx}`}
                  title={`Round ${idx + 1}`}
                  matches={round}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {lowerByRound.length > 0 && (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
            Lower Bracket
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {lowerByRound.map((round, idx) => (
                <RoundColumn
                  key={`L${idx}`}
                  title={`LB Round ${idx + 1}`}
                  matches={round}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupByRound(matches: BracketMatch[]): BracketMatch[][] {
  const map = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    if (!map.has(m.round)) map.set(m.round, []);
    map.get(m.round)!.push(m);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, ms]) => ms.sort((a, b) => a.position - b.position));
}

function RoundColumn({
  title,
  matches,
}: {
  title: string;
  matches: BracketMatch[];
}) {
  return (
    <div className="flex flex-col gap-3 w-64 shrink-0">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        {title}
      </div>
      {matches.map((m) => {
        const aWon = m.status === "FINISHED" && m.scoreA > m.scoreB;
        const bWon = m.status === "FINISHED" && m.scoreB > m.scoreA;
        const isLive = m.status === "LIVE";
        return (
          <div
            key={m.id}
            className={`rounded border ${isLive ? "border-rose-500/50 bg-rose-500/5" : "border-zinc-800 bg-zinc-900/40"} overflow-hidden`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
              <span
                className={`flex items-center gap-1 text-xs font-medium truncate ${aWon ? "text-emerald-300 font-bold" : "text-zinc-300"}`}
              >
                {m.teamA ?? <span className="text-zinc-600">TBD</span>}
              </span>
              <span
                className={`font-mono text-sm ${aWon ? "text-emerald-400 font-bold" : "text-zinc-500"}`}
              >
                {m.status === "SCHEDULED" ? "—" : m.scoreA}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span
                className={`flex items-center gap-1 text-xs font-medium truncate ${bWon ? "text-emerald-300 font-bold" : "text-zinc-300"}`}
              >
                {m.teamB ?? <span className="text-zinc-600">TBD</span>}
              </span>
              <span
                className={`font-mono text-sm ${bWon ? "text-emerald-400 font-bold" : "text-zinc-500"}`}
              >
                {m.status === "SCHEDULED" ? "—" : m.scoreB}
              </span>
            </div>
            {isLive && (
              <div className="px-3 py-1 bg-rose-500/20 border-t border-rose-500/30 text-[9px] font-mono uppercase tracking-widest text-rose-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Live
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
