// CS2 map pool для F16 HUB. Порядок в массиве задаёт порядок отображения в UI.
// id — то, что хранится в БД (HubVetoAction.map, HubLobby.selectedMap, HubMatch.map).
// csName — id для движка CS2 / MatchZy maplist.

export type HubMapId =
  | "mirage"
  | "inferno"
  | "nuke"
  | "ancient"
  | "anubis"
  | "vertigo"
  | "dust2";

export type HubMapInfo = {
  id: HubMapId;
  displayName: string;
  csName: string;
  /** CSS-градиент для fallback-карточки (когда нет JPG). */
  gradient: string;
  /** Цвет акцента для подсветки/обводки. */
  accent: string;
  /** Краткая тематическая подпись. */
  tagline: string;
};

export const HUB_MAP_POOL: ReadonlyArray<HubMapInfo> = [
  {
    id: "mirage",
    displayName: "Mirage",
    csName: "de_mirage",
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde68a 100%)",
    accent: "#f59e0b",
    tagline: "Marrakesh · Desert",
  },
  {
    id: "inferno",
    displayName: "Inferno",
    csName: "de_inferno",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #f97316 100%)",
    accent: "#dc2626",
    tagline: "Italy · Apartments",
  },
  {
    id: "nuke",
    displayName: "Nuke",
    csName: "de_nuke",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)",
    accent: "#0ea5e9",
    tagline: "Industrial · Reactor",
  },
  {
    id: "ancient",
    displayName: "Ancient",
    csName: "de_ancient",
    gradient: "linear-gradient(135deg, #14532d 0%, #16a34a 50%, #86efac 100%)",
    accent: "#16a34a",
    tagline: "Jungle · Ruins",
  },
  {
    id: "anubis",
    displayName: "Anubis",
    csName: "de_anubis",
    gradient: "linear-gradient(135deg, #92400e 0%, #ca8a04 50%, #facc15 100%)",
    accent: "#ca8a04",
    tagline: "Egypt · Temple",
  },
  {
    id: "vertigo",
    displayName: "Vertigo",
    csName: "de_vertigo",
    gradient: "linear-gradient(135deg, #1e293b 0%, #475569 50%, #cbd5e1 100%)",
    accent: "#64748b",
    tagline: "Skyscraper · Heights",
  },
  {
    id: "dust2",
    displayName: "Dust 2",
    csName: "de_dust2",
    gradient: "linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #fed7aa 100%)",
    accent: "#ea580c",
    tagline: "Middle East · Classic",
  },
];

export const HUB_MAP_BY_ID = new Map<string, HubMapInfo>(
  HUB_MAP_POOL.map((m) => [m.id, m])
);

export function isHubMapId(value: string): value is HubMapId {
  return HUB_MAP_BY_ID.has(value);
}

export function csNameFor(mapId: string): string | null {
  return HUB_MAP_BY_ID.get(mapId)?.csName ?? null;
}

export function displayNameFor(mapId: string): string {
  return HUB_MAP_BY_ID.get(mapId)?.displayName ?? mapId;
}
