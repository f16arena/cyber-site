/**
 * Veto-пресеты (pick/ban схемы) для CS2-турниров.
 *
 * FACEIT_BO1: 6 банов поочерёдно, последняя карта = decider (играется).
 * PGL_BO3:    ban-ban-pick-pick-ban-ban → последняя оставшаяся = decider.
 *             Играются 3 карты: pick A, pick B, decider.
 * PGL_BO5:    ban-ban-pick-pick-pick-pick → последняя = decider.
 *             Играются 5 карт: 4 пика + decider.
 */

export type VetoTeam = "A" | "B";
export type VetoActionKind = "BAN" | "PICK";
export type VetoPresetId = "FACEIT_BO1" | "PGL_BO3" | "PGL_BO5";

export type VetoStep = {
  team: VetoTeam;
  action: VetoActionKind;
};

const FACEIT_BO1: VetoStep[] = [
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
];

const PGL_BO3: VetoStep[] = [
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
  { team: "A", action: "PICK" },
  { team: "B", action: "PICK" },
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
];

const PGL_BO5: VetoStep[] = [
  { team: "A", action: "BAN" },
  { team: "B", action: "BAN" },
  { team: "A", action: "PICK" },
  { team: "B", action: "PICK" },
  { team: "A", action: "PICK" },
  { team: "B", action: "PICK" },
];

const PRESETS: Record<VetoPresetId, VetoStep[]> = {
  FACEIT_BO1,
  PGL_BO3,
  PGL_BO5,
};

export function getPresetSteps(id: VetoPresetId): VetoStep[] {
  return PRESETS[id];
}

/**
 * Автоматический выбор пресета на основе BO и общего настроения турнира.
 * Если у турнира явно указан vetoPreset (не AUTO) — используем его.
 */
export function resolveVetoPresetId(
  tournamentPreset: string,
  bestOf: number
): VetoPresetId {
  if (
    tournamentPreset === "FACEIT_BO1" ||
    tournamentPreset === "PGL_BO3" ||
    tournamentPreset === "PGL_BO5"
  ) {
    return tournamentPreset;
  }
  // AUTO
  if (bestOf >= 5) return "PGL_BO5";
  if (bestOf >= 3) return "PGL_BO3";
  return "FACEIT_BO1";
}
