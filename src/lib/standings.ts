/**
 * Подсчёт таблицы группового этапа / Round Robin.
 *
 * Очки: 3 win / 1 draw / 0 loss. Tiebreaker: head-to-head, разница раундов.
 */

export type MatchRow = {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
};

export type StandingsRow = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  roundsFor: number;
  roundsAgainst: number;
  diff: number;
  points: number;
};

export function computeStandings(matches: MatchRow[]): StandingsRow[] {
  const tab = new Map<string, StandingsRow>();

  function get(teamId: string): StandingsRow {
    let r = tab.get(teamId);
    if (!r) {
      r = {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        roundsFor: 0,
        roundsAgainst: 0,
        diff: 0,
        points: 0,
      };
      tab.set(teamId, r);
    }
    return r;
  }

  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    if (!m.teamAId || !m.teamBId) continue;

    const a = get(m.teamAId);
    const b = get(m.teamBId);
    a.played++;
    b.played++;
    a.roundsFor += m.scoreA;
    a.roundsAgainst += m.scoreB;
    b.roundsFor += m.scoreB;
    b.roundsAgainst += m.scoreA;

    if (m.winnerId === m.teamAId) {
      a.wins++;
      b.losses++;
      a.points += 3;
    } else if (m.winnerId === m.teamBId) {
      b.wins++;
      a.losses++;
      b.points += 3;
    } else {
      // Draw (редко в CS2, но всё же)
      a.draws++;
      b.draws++;
      a.points += 1;
      b.points += 1;
    }
  }

  for (const row of tab.values()) {
    row.diff = row.roundsFor - row.roundsAgainst;
  }

  return Array.from(tab.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.roundsFor !== a.roundsFor) return b.roundsFor - a.roundsFor;
    return a.teamId.localeCompare(b.teamId);
  });
}
