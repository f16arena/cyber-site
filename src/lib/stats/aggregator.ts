/**
 * Агрегаторы поверх MatchPlayerStat.
 *
 * Используются на турнирной странице stats, в профиле игрока, в
 * лидербордах. Все функции синхронные — данные приходят из БД одним
 * запросом и сворачиваются на сервере.
 */

import type { Game } from "@prisma/client";

export type StatRow = {
  userId: string;
  game: Game;
  kills: number;
  deaths: number;
  assists: number;
  mvpRounds: number;
  rating: number | null;
  isMvp: boolean;
  /** JSON с CS2/Dota/PUBG специфичными полями — adr, hsPct, kast, ... */
  extra: Record<string, unknown> | null;
};

export type AggregatedPlayer = {
  userId: string;
  matches: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  kda: number;
  avgRating: number;
  mvps: number;
  adr: number; // среднее
  hsPct: number; // среднее
  kast: number; // среднее
};

function extraNum(extra: Record<string, unknown> | null, key: string): number {
  if (!extra) return 0;
  const v = extra[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function aggregateByPlayer(rows: StatRow[]): AggregatedPlayer[] {
  const byUser = new Map<string, StatRow[]>();
  for (const r of rows) {
    const arr = byUser.get(r.userId) ?? [];
    arr.push(r);
    byUser.set(r.userId, arr);
  }

  const result: AggregatedPlayer[] = [];
  for (const [userId, group] of byUser) {
    const matches = group.length;
    const kills = group.reduce((s, x) => s + x.kills, 0);
    const deaths = group.reduce((s, x) => s + x.deaths, 0);
    const assists = group.reduce((s, x) => s + x.assists, 0);
    const mvps = group.reduce((s, x) => s + (x.isMvp ? 1 : 0), 0);
    const ratingSum = group.reduce((s, x) => s + (x.rating ?? 0), 0);

    let adrSum = 0,
      hsSum = 0,
      kastSum = 0,
      extraCount = 0;
    for (const r of group) {
      const adr = extraNum(r.extra, "adr");
      const hs = extraNum(r.extra, "hsPct");
      const kast = extraNum(r.extra, "kast");
      if (adr || hs || kast) {
        adrSum += adr;
        hsSum += hs;
        kastSum += kast;
        extraCount++;
      }
    }

    result.push({
      userId,
      matches,
      kills,
      deaths,
      assists,
      kd: deaths > 0 ? kills / deaths : kills,
      kda: deaths > 0 ? (kills + assists) / deaths : kills + assists,
      avgRating: matches > 0 ? ratingSum / matches : 0,
      mvps,
      adr: extraCount > 0 ? adrSum / extraCount : 0,
      hsPct: extraCount > 0 ? hsSum / extraCount : 0,
      kast: extraCount > 0 ? kastSum / extraCount : 0,
    });
  }

  return result;
}

export type LeaderboardKind =
  | "rating"
  | "kd"
  | "kills"
  | "adr"
  | "hsPct"
  | "kast"
  | "mvps";

export function leaderboard(
  agg: AggregatedPlayer[],
  kind: LeaderboardKind,
  minMatches = 1
): AggregatedPlayer[] {
  const filtered = agg.filter((a) => a.matches >= minMatches);
  return filtered.sort((a, b) => {
    switch (kind) {
      case "rating":
        return b.avgRating - a.avgRating;
      case "kd":
        return b.kd - a.kd;
      case "kills":
        return b.kills - a.kills;
      case "adr":
        return b.adr - a.adr;
      case "hsPct":
        return b.hsPct - a.hsPct;
      case "kast":
        return b.kast - a.kast;
      case "mvps":
        return b.mvps - a.mvps;
    }
  });
}
