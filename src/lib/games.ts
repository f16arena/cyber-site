import type { Game } from "@prisma/client";

/** Размер основного состава по игре */
export const ROSTER_SIZE: Record<Game, number> = {
  CS2: 5,
  DOTA2: 5,
  PUBG: 4,
};

/** Максимум запасных */
export const MAX_SUBS = 2;

/** Полный максимум команды (основной + запасные) */
export function maxRoster(game: Game): number {
  return ROSTER_SIZE[game] + MAX_SUBS;
}

/** Сколько уже занято среди основного состава (без запасных) */
export function activeRosterCount(
  members: Array<{ role: string }>,
  _game: Game
): number {
  return members.filter((m) => m.role !== "SUBSTITUTE").length;
}

/** Какая роль должна быть у нового игрока при вступлении */
export function nextMemberRole(
  members: Array<{ role: string }>,
  game: Game
): "PLAYER" | "SUBSTITUTE" | null {
  const total = members.length;
  const active = activeRosterCount(members, game);
  if (total >= maxRoster(game)) return null; // нет места вообще
  if (active >= ROSTER_SIZE[game]) return "SUBSTITUTE";
  return "PLAYER";
}

export const GAME_LABEL: Record<Game, string> = {
  CS2: "Counter-Strike 2",
  DOTA2: "Dota 2",
  PUBG: "PUBG",
};
