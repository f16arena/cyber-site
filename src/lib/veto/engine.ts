/**
 * Veto-движок: вычисляет текущий шаг, валидирует действия,
 * определяет завершение veto.
 */

import type { VetoStep, VetoTeam } from "./presets";

export type AppliedAction = {
  team: VetoTeam;
  action: "BAN" | "PICK" | "DECIDER";
  map: string;
  order: number;
};

export type VetoState = {
  preset: VetoStep[];
  applied: AppliedAction[];
  mapPool: string[]; // изначальный пул карт турнира
};

/** Карты которые "израсходованы" (забанены или выбраны для игры). */
export function consumedMaps(applied: AppliedAction[]): Set<string> {
  return new Set(applied.map((a) => a.map));
}

/** Доступные для следующего действия карты. */
export function availableMaps(state: VetoState): string[] {
  const consumed = consumedMaps(state.applied);
  return state.mapPool.filter((m) => !consumed.has(m));
}

/** Текущий шаг (на котором veto остановилось). null = завершено. */
export function currentStep(state: VetoState): VetoStep | null {
  const idx = state.applied.length;
  if (idx >= state.preset.length) return null;
  return state.preset[idx];
}

/**
 * Veto завершено? Это значит — все шаги пресета выполнены.
 * После завершения — оставшаяся 1 карта становится decider'ом.
 */
export function isVetoComplete(state: VetoState): boolean {
  return currentStep(state) === null;
}

/** Финальный список карт для матча в правильном порядке игры. */
export function getMatchMaps(state: VetoState): string[] {
  const picks = state.applied
    .filter((a) => a.action === "PICK")
    .sort((a, b) => a.order - b.order)
    .map((a) => a.map);
  const remaining = availableMaps(state);
  // Decider = единственная оставшаяся карта после всех шагов пресета.
  const decider = remaining[0];
  return [...picks, decider].filter(Boolean);
}

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "veto_complete"
        | "not_your_turn"
        | "wrong_action"
        | "map_not_available";
    };

/** Проверяет что действие валидно в текущем состоянии. */
export function validateAction(
  state: VetoState,
  by: { team: VetoTeam; action: "BAN" | "PICK"; map: string }
): ValidationResult {
  const step = currentStep(state);
  if (!step) return { ok: false, error: "veto_complete" };
  if (step.team !== by.team) return { ok: false, error: "not_your_turn" };
  if (step.action !== by.action) return { ok: false, error: "wrong_action" };
  const avail = new Set(availableMaps(state));
  if (!avail.has(by.map)) return { ok: false, error: "map_not_available" };
  return { ok: true };
}
