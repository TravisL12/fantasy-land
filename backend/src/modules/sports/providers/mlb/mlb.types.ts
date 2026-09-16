// Raw MLB Stats API shapes (only the fields we read).

export interface MlbRef {
  id: number;
  name?: string;
}

export interface MlbPosition {
  abbreviation: string;
  type: string;
}

export interface MlbSeasonsResponse {
  seasons: { seasonId: string; regularSeasonStartDate: string }[];
}

export interface MlbTeamsResponse {
  teams: { id: number; abbreviation: string }[];
}

export type MlbRawStats = Record<string, number | string>;

export interface MlbSeasonSplit {
  stat: MlbRawStats;
  team?: MlbRef;
  player: { id: number; fullName: string };
  position?: MlbPosition;
}

export interface MlbGameLogSplit {
  stat: MlbRawStats;
  team?: MlbRef;
  opponent?: MlbRef;
  date: string;
  isHome: boolean;
}

export interface MlbStatsResponse<TSplit> {
  stats: { group: { displayName: string }; splits: TSplit[] }[];
}

export interface MlbPerson {
  id: number;
  fullName: string;
  primaryPosition?: MlbPosition;
  currentTeam?: MlbRef;
  stats?: MlbStatsResponse<MlbGameLogSplit>['stats'];
}

export interface MlbPeopleResponse {
  people: MlbPerson[];
}

export interface MlbProbablePitcher {
  id: number;
  fullName: string;
}

export interface MlbScheduleTeam {
  team: MlbRef;
  probablePitcher?: MlbProbablePitcher;
  /** Absent until the game has been played. */
  score?: number;
}

export interface MlbScheduleGame {
  gamePk: number;
  officialDate: string;
  status: { detailedState: string; abstractGameState?: string };
  teams: { home: MlbScheduleTeam; away: MlbScheduleTeam };
}

export interface MlbScheduleResponse {
  dates: { date: string; games: MlbScheduleGame[] }[];
}

export interface MlbTeamStatSplit {
  team: MlbRef;
  stat: MlbRawStats;
}

export interface MlbRosterEntry {
  person: { id: number; fullName: string };
  position?: MlbPosition;
  status: { code: string; description: string };
}

export interface MlbRosterResponse {
  roster: MlbRosterEntry[];
}
