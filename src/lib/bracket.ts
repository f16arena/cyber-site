/**
 * Генератор сетки Double Elimination (для CS2).
 *
 * Стандартная схема для 4/8/16 команд:
 *   - Upper Bracket: log2(N) раундов
 *   - Lower Bracket: 2*log2(N) - 1 раундов (чередующиеся UB/LB feeders)
 *   - Grand Final: победитель UB vs победитель LB
 *
 * Для не-степени-двойки команд — добавляются BYE (автоматический проход).
 */

export type BracketMatchSeed = {
  side: "UPPER" | "LOWER" | "GRAND_FINAL";
  round: number;        // 1, 2, 3...
  position: number;     // позиция в раунде (для отрисовки сверху-вниз)
  teamAId: string | null;
  teamBId: string | null;
  parentMatchAKey?: string;  // ссылка на ключ родительского матча (откуда пришла A)
  parentMatchBKey?: string;
  key: string;          // уникальный ключ матча для линковки (UB1-1, UB2-1, LB1-1...)
};

function isPowerOfTwo(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Перетасовка для seeding'а: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5 (8 команд).
 * Если нужен random — пользователь сам передаёт уже перемешанный массив.
 */
function pairsForBracket(teamIds: (string | null)[]): Array<[string | null, string | null]> {
  const n = teamIds.length;
  const pairs: Array<[string | null, string | null]> = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([teamIds[i], teamIds[n - 1 - i]]);
  }
  return pairs;
}

/**
 * Генерирует список матчей для double elimination.
 * teamIds должно быть длины 4, 8 или 16. Иначе дополняется null (BYE).
 */
export function generateDoubleElimination(
  teamIdsRaw: string[]
): BracketMatchSeed[] {
  if (teamIdsRaw.length < 2) return [];

  // Дополняем до ближайшей степени двойки
  let size = 1;
  while (size < teamIdsRaw.length) size *= 2;
  const teamIds: (string | null)[] = [...teamIdsRaw];
  while (teamIds.length < size) teamIds.push(null);

  const totalRounds = Math.log2(size); // например, 8 команд → 3 раунда UB
  const matches: BracketMatchSeed[] = [];

  // ─── Upper Bracket ─────────────────────────────────────
  // UB Round 1 — матчи из посеянных пар
  const ubPairs = pairsForBracket(teamIds);
  ubPairs.forEach((pair, i) => {
    matches.push({
      side: "UPPER",
      round: 1,
      position: i + 1,
      teamAId: pair[0],
      teamBId: pair[1],
      key: `UB1-${i + 1}`,
    });
  });

  // UB Round 2..N — генерируются от победителей предыдущего раунда
  let prevRoundCount = ubPairs.length;
  for (let round = 2; round <= totalRounds; round++) {
    const thisCount = prevRoundCount / 2;
    for (let pos = 1; pos <= thisCount; pos++) {
      const parentA = `UB${round - 1}-${pos * 2 - 1}`;
      const parentB = `UB${round - 1}-${pos * 2}`;
      matches.push({
        side: "UPPER",
        round,
        position: pos,
        teamAId: null,
        teamBId: null,
        parentMatchAKey: parentA,
        parentMatchBKey: parentB,
        key: `UB${round}-${pos}`,
      });
    }
    prevRoundCount = thisCount;
  }

  // ─── Lower Bracket ─────────────────────────────────────
  // LB имеет 2*totalRounds - 1 раундов
  // Чередуются "minor" (только LB-выжившие) и "major" (LB-выживший vs UB-loser)
  const lbRounds = totalRounds * 2 - 1;
  let lbCurrentTeams = ubPairs.length / 2; // в LB1 — половина команд (loser'ы UB1)

  for (let lbRound = 1; lbRound <= lbRounds; lbRound++) {
    const isMajor = lbRound % 2 === 0; // на чётных приходят UB-loser'ы

    if (lbRound === 1) {
      // LB1 — собираются loser'ы UB1
      for (let pos = 1; pos <= lbCurrentTeams; pos++) {
        const ubLoserA = `UB1-${pos * 2 - 1}`;
        const ubLoserB = `UB1-${pos * 2}`;
        matches.push({
          side: "LOWER",
          round: 1,
          position: pos,
          teamAId: null,
          teamBId: null,
          parentMatchAKey: ubLoserA,
          parentMatchBKey: ubLoserB,
          key: `LB1-${pos}`,
        });
      }
    } else if (isMajor) {
      // Major round: победитель LB(prev) vs loser UB(round/2 + 1)
      const ubRoundForLosers = lbRound / 2 + 1;
      for (let pos = 1; pos <= lbCurrentTeams; pos++) {
        matches.push({
          side: "LOWER",
          round: lbRound,
          position: pos,
          teamAId: null,
          teamBId: null,
          parentMatchAKey: `LB${lbRound - 1}-${pos}`,
          parentMatchBKey: `UB${ubRoundForLosers}-${pos}`,
          key: `LB${lbRound}-${pos}`,
        });
      }
    } else {
      // Minor round: только LB-победители друг с другом
      const newCount = lbCurrentTeams / 2;
      for (let pos = 1; pos <= newCount; pos++) {
        matches.push({
          side: "LOWER",
          round: lbRound,
          position: pos,
          teamAId: null,
          teamBId: null,
          parentMatchAKey: `LB${lbRound - 1}-${pos * 2 - 1}`,
          parentMatchBKey: `LB${lbRound - 1}-${pos * 2}`,
          key: `LB${lbRound}-${pos}`,
        });
      }
      lbCurrentTeams = newCount;
    }
  }

  // ─── Grand Final ───────────────────────────────────────
  matches.push({
    side: "GRAND_FINAL",
    round: 1,
    position: 1,
    teamAId: null,
    teamBId: null,
    parentMatchAKey: `UB${totalRounds}-1`,
    parentMatchBKey: `LB${lbRounds}-1`,
    key: "GF-1",
  });

  return matches;
}

/** Простой Fisher-Yates shuffle для random seeding */
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
