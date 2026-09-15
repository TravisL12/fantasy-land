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
