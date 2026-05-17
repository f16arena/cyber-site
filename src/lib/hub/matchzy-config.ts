import { csNameFor } from "@/lib/hub/maps";

/**
 * MatchZy / Get5-совместимый конфиг матча.
 * Структура соответствует ожидаемой `matchzy_loadmatch` команде:
 * https://github.com/shobhit-pathak/MatchZy/blob/main/docs/match-setup.md
 */
export type MatchZyTeam = {
  name: string;
  /** SteamID64 → nickname. */
  players: Record<string, string>;
};

export type MatchZyConfig = {
  matchid: string;
  team1: MatchZyTeam;
  team2: MatchZyTeam;
  num_maps: number;
  maplist: string[];
  /** Мы делаем veto до загрузки — поэтому skip_veto=true. */
  skip_veto: boolean;
  /** Стороны: для одного мапа "knife" (knife-round выбирает сторону). */
  map_sides: string[];
  spectators: { players: Record<string, string> };
  cvars: Record<string, string>;
};

export type BuildConfigInput = {
  matchId: string;
  teamAName?: string;
  teamBName?: string;
  teamA: { steamId: string; username: string }[];
  teamB: { steamId: string; username: string }[];
  mapId: string;
};

export function buildMatchConfig(input: BuildConfigInput): MatchZyConfig {
  const cs = csNameFor(input.mapId);
  if (!cs) {
    throw new Error(`Unknown map id for MatchZy config: ${input.mapId}`);
  }

  return {
    matchid: input.matchId,
    team1: {
      name: input.teamAName ?? "Team A",
      players: Object.fromEntries(
        input.teamA.map((p) => [p.steamId, p.username])
      ),
    },
    team2: {
      name: input.teamBName ?? "Team B",
      players: Object.fromEntries(
        input.teamB.map((p) => [p.steamId, p.username])
      ),
    },
    num_maps: 1,
    maplist: [cs],
    skip_veto: true,
    map_sides: ["knife"],
    spectators: { players: {} },
    cvars: {
      hostname: `F16 HUB | Match #${input.matchId.slice(0, 8)}`,
      mp_friendlyfire: "0",
      mp_autoteambalance: "0",
      mp_limitteams: "0",
    },
  };
}
