import type { HubGameMode } from "@prisma/client";

export const MODE_PLAYER_COUNTS: Record<HubGameMode, number> = {
  SOLO: 2,  // 1v1
  DUO: 4,   // 2v2
  FIVE: 10, // 5v5
};

export const MODE_TEAM_SIZE: Record<HubGameMode, number> = {
  SOLO: 1,
  DUO: 2,
  FIVE: 5,
};

export const MODE_LABEL: Record<HubGameMode, string> = {
  SOLO: "1 vs 1",
  DUO: "2 vs 2",
  FIVE: "5 vs 5",
};

export const MODE_DESCRIPTION: Record<HubGameMode, string> = {
  SOLO: "Дуэль один-на-один",
  DUO: "Маленькие команды",
  FIVE: "Классический MM",
};

export const MODE_ORDER: HubGameMode[] = ["SOLO", "DUO", "FIVE"];

export function isValidGameMode(value: string): value is HubGameMode {
  return value === "SOLO" || value === "DUO" || value === "FIVE";
}

/** SOLO / DUO пропускают фазу пика — балансируем команды автоматически. */
export function modeHasPickPhase(mode: HubGameMode): boolean {
  return mode === "FIVE";
}

/** Максимальный размер party допустимый для режима (нельзя играть 5-party в 1v1). */
export function maxPartySizeFor(mode: HubGameMode): number {
  return MODE_TEAM_SIZE[mode];
}
