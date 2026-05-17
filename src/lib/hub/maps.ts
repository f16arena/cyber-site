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
};

export const HUB_MAP_POOL: ReadonlyArray<HubMapInfo> = [
  { id: "mirage", displayName: "Mirage", csName: "de_mirage" },
  { id: "inferno", displayName: "Inferno", csName: "de_inferno" },
  { id: "nuke", displayName: "Nuke", csName: "de_nuke" },
  { id: "ancient", displayName: "Ancient", csName: "de_ancient" },
  { id: "anubis", displayName: "Anubis", csName: "de_anubis" },
  { id: "vertigo", displayName: "Vertigo", csName: "de_vertigo" },
  { id: "dust2", displayName: "Dust 2", csName: "de_dust2" },
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
