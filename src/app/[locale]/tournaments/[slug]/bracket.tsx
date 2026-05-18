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

  const upperByRound = groupByRound(upper);
  const lowerByRound = groupByRound(lower);

  const hasLower = lowerByRound.length > 0;
  const upperTitle = hasLower ? "Upper Bracket" : "Сетка";

  return (
    <div className="space-y-6">
      {upperByRound.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-2">
            {upperTitle}
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {upperByRound.map((round, idx) => {
                const isLast = idx === upperByRound.length - 1;
                return (
                  <RoundColumn
                    key={`U${idx}`}
                    title={
                      isLast && !hasLower
                        ? "Финал"
                        : isLast
                          ? "UB Final"
                          : `R${idx + 1}`
                    }
                    matches={round}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hasLower && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-2">
            Lower Bracket
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {lowerByRound.map((round, idx) => (
                <RoundColumn
                  key={`L${idx}`}
                  title={`LB R${idx + 1}`}
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
    <div className="flex flex-col gap-2 w-56 shrink-0">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
        {title}
      </div>
      {matches.map((m) => {
        const aWon = m.status === "FINISHED" && m.scoreA > m.scoreB;
        const bWon = m.status === "FINISHED" && m.scoreB > m.scoreA;
        const isLive = m.status === "LIVE";
        return (
          <div
            key={m.id}
            className={`rounded-sm border overflow-hidden ${
              isLive
                ? "border-rose-500/50 bg-rose-500/10"
                : "border-border-default bg-bg-panel"
            }`}
          >
            <MatchSide
              team={m.teamA}
              score={m.status === "SCHEDULED" ? null : m.scoreA}
              won={aWon}
              border
            />
            <MatchSide
              team={m.teamB}
              score={m.status === "SCHEDULED" ? null : m.scoreB}
              won={bWon}
            />
            {isLive && (
              <div className="px-2 py-1 bg-rose-500/20 border-t border-rose-500/40 text-[9px] font-mono uppercase tracking-widest text-rose-300 flex items-center gap-1">
                <span className="live-dot" />
                Live
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchSide({
  team,
  score,
  won,
  border = false,
}: {
  team: string | null;
  score: number | null;
  won: boolean;
  border?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1.5 ${
        border ? "border-b border-border-default" : ""
      }`}
    >
      <span
        className={`text-[12px] truncate ${
          won ? "font-bold text-text-primary" : "text-text-secondary"
        }`}
      >
        {team ?? <span className="text-text-muted">TBD</span>}
      </span>
      <span
        className={`font-mono text-[12px] tabular-nums ${
          won ? "text-brand-yellow font-bold" : "text-text-muted"
        }`}
      >
        {score === null ? "—" : score}
      </span>
    </div>
  );
}
