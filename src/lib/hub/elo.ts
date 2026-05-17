/**
 * Командный ELO с симметричной дельтой (FIDE-like K=32).
 *
 * Алгоритм:
 *  Ra = avg(elo команды A)
 *  Rb = avg(elo команды B)
 *  Ea = 1 / (1 + 10^((Rb-Ra)/400))
 *  delta = round(K * (S_a - Ea))     // S_a = 1 если A победила, 0 если проиграла
 *
 * Каждый игрок выигравшей команды получает +delta, каждый из проигравшей − delta.
 * Простая модель для MVP; позже подключим персональные модификаторы за K/D/ADR.
 */

const K_FACTOR = 32;

export type EloOutcome = {
  /** Дельта для каждого игрока команды A (с учётом знака). */
  deltaA: number;
  /** Дельта для каждого игрока команды B (с учётом знака). */
  deltaB: number;
  expectedA: number;
  expectedB: number;
};

export function computeTeamElo(
  teamARatings: number[],
  teamBRatings: number[],
  winner: "A" | "B"
): EloOutcome {
  const ra = average(teamARatings);
  const rb = average(teamBRatings);

  const expectedA = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  const expectedB = 1 - expectedA;

  const sA = winner === "A" ? 1 : 0;
  const sB = winner === "B" ? 1 : 0;

  const deltaA = Math.round(K_FACTOR * (sA - expectedA));
  const deltaB = Math.round(K_FACTOR * (sB - expectedB));

  return { deltaA, deltaB, expectedA, expectedB };
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
