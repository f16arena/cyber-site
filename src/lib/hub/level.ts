/**
 * Faceit-подобные уровни 1-10 по hub ELO.
 *
 * Стартовый ELO у всех игроков = 1000 → это уровень 4.
 * Границы подобраны так, чтобы средний игрок «висел» в lvl 3-5,
 * сильные были 6-8, профессиональные — 9-10.
 */

export type HubLevel = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  label: string;
  minElo: number;
  /** null = верхний уровень без потолка */
  maxElo: number | null;
  /** Tailwind-классы для подсветки бейджа. */
  bgClass: string;
  textClass: string;
  borderClass: string;
};

const LEVELS: ReadonlyArray<HubLevel> = [
  {
    level: 1,
    label: "1",
    minElo: 0,
    maxElo: 500,
    bgClass: "bg-zinc-700/40",
    textClass: "text-zinc-300",
    borderClass: "border-zinc-600",
  },
  {
    level: 2,
    label: "2",
    minElo: 501,
    maxElo: 750,
    bgClass: "bg-zinc-700/30",
    textClass: "text-zinc-200",
    borderClass: "border-zinc-500",
  },
  {
    level: 3,
    label: "3",
    minElo: 751,
    maxElo: 900,
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-300",
    borderClass: "border-sky-500/40",
  },
  {
    level: 4,
    label: "4",
    minElo: 901,
    maxElo: 1050,
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-300",
    borderClass: "border-cyan-500/40",
  },
  {
    level: 5,
    label: "5",
    minElo: 1051,
    maxElo: 1200,
    bgClass: "bg-teal-500/15",
    textClass: "text-teal-300",
    borderClass: "border-teal-500/40",
  },
  {
    level: 6,
    label: "6",
    minElo: 1201,
    maxElo: 1400,
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-300",
    borderClass: "border-emerald-500/40",
  },
  {
    level: 7,
    label: "7",
    minElo: 1401,
    maxElo: 1600,
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-300",
    borderClass: "border-amber-500/40",
  },
  {
    level: 8,
    label: "8",
    minElo: 1601,
    maxElo: 1800,
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-300",
    borderClass: "border-orange-500/50",
  },
  {
    level: 9,
    label: "9",
    minElo: 1801,
    maxElo: 2000,
    bgClass: "bg-rose-500/20",
    textClass: "text-rose-300",
    borderClass: "border-rose-500/50",
  },
  {
    level: 10,
    label: "10",
    minElo: 2001,
    maxElo: null,
    bgClass:
      "bg-gradient-to-br from-orange-500/30 via-rose-500/30 to-violet-500/30",
    textClass: "text-amber-200",
    borderClass: "border-amber-400/60",
  },
];

export function levelFor(elo: number): HubLevel {
  for (const lvl of LEVELS) {
    if (lvl.maxElo === null) {
      if (elo >= lvl.minElo) return lvl;
    } else if (elo >= lvl.minElo && elo <= lvl.maxElo) {
      return lvl;
    }
  }
  return LEVELS[0];
}

export function allLevels(): ReadonlyArray<HubLevel> {
  return LEVELS;
}

/** Прогресс внутри уровня: [0..1] и сколько ELO до следующего. */
export function levelProgress(elo: number): {
  progress: number;
  toNext: number | null;
} {
  const cur = levelFor(elo);
  if (cur.maxElo === null) {
    return { progress: 1, toNext: null };
  }
  const total = cur.maxElo - cur.minElo + 1;
  const inLevel = elo - cur.minElo;
  return {
    progress: Math.max(0, Math.min(1, inLevel / total)),
    toNext: cur.maxElo - elo + 1,
  };
}
