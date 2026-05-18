/**
 * HLTV-style Rating 2.0 (упрощённая, без раундов).
 *
 * Полная формула HLTV:
 *   rating = 0.0073 * KAST + 0.3591 * KPR - 0.5329 * DPR
 *          + 0.2372 * impact + 0.0032 * ADR + 0.1587
 *
 * где KPR — kills per round, DPR — deaths per round, impact — отдельная
 * метрика про "влияние" (мульти-киллы, opening duels, clutches). На нашем
 * MVP при ручном вводе раунды часто не указаны — поэтому даём упрощённое
 * приближение через KDA + ADR + KAST.
 */

export type RatingInput = {
  kills: number;
  deaths: number;
  assists: number;
  roundsPlayed?: number; // если есть — используем настоящие KPR/DPR
  adr?: number; // average damage per round (0-150 типично)
  kast?: number; // 0-100
  openingKills?: number; // для impact
  multiKills?: { k2?: number; k3?: number; k4?: number; k5?: number };
};

/**
 * Полная HLTV-формула если есть roundsPlayed. Иначе — fallback.
 */
export function calculateRating2(input: RatingInput): number {
  const { kills, deaths, assists, roundsPlayed, adr, kast } = input;

  // Если есть раунды — настоящая формула.
  if (roundsPlayed && roundsPlayed > 0) {
    const kpr = kills / roundsPlayed;
    const dpr = deaths / roundsPlayed;
    const impact = calculateImpact({
      ...input,
      kills,
      assists,
      roundsPlayed,
    });
    return (
      0.0073 * (kast ?? 70) +
      0.3591 * kpr -
      0.5329 * dpr +
      0.2372 * impact +
      0.0032 * (adr ?? 70) +
      0.1587
    );
  }

  // Fallback: упрощённая (которая уже была в проекте).
  const kdRatio = kills / Math.max(deaths, 1);
  const adrNorm = (adr ?? 70) / 100;
  const kastNorm = (kast ?? 70) / 100;
  return kdRatio * 0.5 + adrNorm * 0.3 + kastNorm * 0.2;
}

/**
 * "Impact" — упрощённая метрика влияния. Учитывает:
 *  - opening kill rate (per round)
 *  - multi-kills (бонус за 3k/4k/5k)
 *  - assists в meaningful actions
 *
 * Полная HLTV-impact считает связку из opening duels и multi-kills.
 * Мы даём rough proxy.
 */
function calculateImpact(input: RatingInput): number {
  const { kills, assists, openingKills, multiKills, roundsPlayed } = input;
  if (!roundsPlayed) return 1;
  const opkr = (openingKills ?? 0) / roundsPlayed;
  const mkBonus =
    ((multiKills?.k3 ?? 0) * 0.6 +
      (multiKills?.k4 ?? 0) * 1.2 +
      (multiKills?.k5 ?? 0) * 2.0) /
    roundsPlayed;
  const kpr = kills / roundsPlayed;
  const apr = assists / roundsPlayed;
  return 0.95 + opkr * 1.5 + mkBonus * 2 + kpr * 0.5 + apr * 0.3;
}

/** Симметричный rating-уровень: <0.85 плохо, 0.85-1.0 OK, 1.0-1.15 хорошо, >1.15 отлично. */
export function ratingTier(rating: number): "poor" | "ok" | "good" | "great" {
  if (rating < 0.85) return "poor";
  if (rating < 1.0) return "ok";
  if (rating < 1.15) return "good";
  return "great";
}
