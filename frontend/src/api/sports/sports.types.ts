// Mirrors backend/src/modules/sports/sports.types.ts and dto/stats-response.dto.ts.

export type SportKey = 'mlb' | 'nfl';
export type DataKind = 'stats' | 'projections';
export type StatFormat = 'int' | 'decimal' | 'rate' | 'percent' | 'innings';
export type SortOrder = 'asc' | 'desc';

export interface StatDefinition {
  key: string;
  label: string;
  abbr: string;
  format: StatFormat;
  summable: boolean;
  lowerIsBetter?: boolean;
}

export interface StatGroup {
  key: string;
  label: string;
  positions: string[];
  stats: StatDefinition[];
  defaultStats: string[];
}

export interface ScoringPreset {
  key: string;
  label: string;
  rules: Record<string, Record<string, number>>;
}

/** Which optional datasets a sport's provider supports. */
export interface SportCapabilities {
  schedule: boolean;
  standings: boolean;
  leagueData: boolean;
  expectedPoints: boolean;
  playerDirectory: boolean;
}

export interface SportCatalog {
  key: SportKey;
  name: string;
  league: string;
  dataSource: { name: string; url: string };
  seasons: string[];
  defaultSeason: string;
  weeks: number[] | null;
  currentWeek: number | null;
  dataKinds: DataKind[];
  groups: StatGroup[];
  scoringPresets: ScoringPreset[];
  capabilities: SportCapabilities;
}

export type StatValues = Record<string, number>;

export interface PlayerRef {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
}

export interface StatLeaderRow {
  player: PlayerRef;
  gamesPlayed: number;
  stats: StatValues;
  fantasyPoints: number;
  fantasyPointsPerGame: number;
}

export interface StatsQuery {
  sport: SportKey;
  season?: string;
  week?: number;
  group?: string;
  position?: string;
  kind?: DataKind;
  scoring?: string;
  sort?: string;
  order?: SortOrder;
  search?: string;
  minGames?: number;
  limit?: number;
  offset?: number;
}

export interface StatsResponse {
  sport: SportKey;
  season: string;
  week: number | null;
  group: string;
  kind: DataKind;
  scoring: string;
  total: number;
  rows: StatLeaderRow[];
}

export interface GameLogEntry {
  date: string | null;
  week: number | null;
  opponent: string | null;
  isHome: boolean | null;
  stats: StatValues;
  fantasyPoints: number;
}

export interface PointsSummary {
  games: number;
  total: number;
  average: number;
  median: number;
  stdDev: number;
  floor: number;
  ceiling: number;
}

export interface PlayerStatsQuery {
  sport: SportKey;
  playerId: string;
  season?: string;
  group?: string;
  scoring?: string;
}

export interface PlayerStatsResponse {
  sport: SportKey;
  season: string;
  group: string;
  scoring: string;
  player: PlayerRef;
  entries: GameLogEntry[];
  totals: StatValues;
  summary: PointsSummary;
}

export type Availability = 'active' | 'injured' | 'minors' | 'inactive';
export type MatchupSide = 'hitting' | 'pitching';
export type MatchupGrade = 'great' | 'good' | 'neutral' | 'tough' | 'brutal';
export type StartConfidence = 'confirmed' | 'projected';

export interface ExpectedPointsModel {
  position: string;
  observations: number;
  rSquared: number;
  weights: StatValues;
}

export interface ExpectedPointsRow {
  player: PlayerRef;
  gamesPlayed: number;
  fantasyPoints: number;
  pointsPerGame: number;
  expectedPoints: number;
  expectedPointsPerGame: number;
  delta: number;
  deltaPerGame: number;
  efficiency: number | null;
  model: string;
  opportunities: StatValues;
}

export interface ExpectedPointsQuery {
  sport: SportKey;
  season?: string;
  week?: number;
  group?: string;
  scoring?: string;
  position?: string;
  sort?: string;
  order?: SortOrder;
  minGames?: number;
  limit?: number;
  offset?: number;
}

export interface ExpectedPointsResponse {
  sport: SportKey;
  season: string;
  week: number | null;
  group: string;
  scoring: string;
  models: ExpectedPointsModel[];
  total: number;
  rows: ExpectedPointsRow[];
}

export interface DirectoryPlayer extends PlayerRef {
  group: string;
  status: string | null;
  availability: Availability;
  rank: number | null;
}

export interface PlayerDirectoryQuery {
  sport: SportKey;
  search?: string;
  position?: string;
  team?: string;
  availability?: Availability[];
  limit?: number;
  offset?: number;
}

export interface PlayerDirectoryResponse {
  sport: SportKey;
  total: number;
  players: DirectoryPlayer[];
}

export interface MatchupRating {
  score: number;
  grade: MatchupGrade;
  metrics: { key: string; label: string; value: number; rank: number }[];
}

export interface MatchupsQuery {
  sport: SportKey;
  season?: string;
  side?: MatchupSide;
}

export interface MatchupsResponse {
  sport: SportKey;
  season: string;
  side: MatchupSide;
  teams: ({ team: string } & MatchupRating)[];
}

export interface DateWindowQuery {
  sport: SportKey;
  season?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

/**
 * Note this is not a PlayerRef: the schedule identifies a starter by
 * `playerId` and carries no position. The rating is how tough the opponent is
 * to face, attached by the service rather than by the provider.
 */
export interface ProbableStarter {
  playerId: string;
  name: string;
  team: string;
  opponent: string;
  isHome: boolean;
  matchup: MatchupRating | null;
}

export interface ScheduledGame {
  gameId: string;
  date: string;
  week: number | null;
  status: string;
  home: string;
  away: string;
  probables: {
    home: ProbableStarter | null;
    away: ProbableStarter | null;
  };
  score: { home: number; away: number } | null;
}

/** The window the schedule resolved to: dates, or weeks where a sport has them. */
export interface ScheduleResponse {
  sport: SportKey;
  season: string;
  startDate?: string;
  endDate?: string;
  weeks?: number[];
  games: ScheduledGame[];
}

/** A schedule is asked for by week where the sport has them, by date otherwise. */
export interface ScheduleQuery extends DateWindowQuery {
  weeks?: number[];
}

export interface ProjectedStart {
  date: string;
  opponent: string;
  isHome: boolean;
  confidence: StartConfidence;
  matchup?: MatchupRating;
}

export interface StartsReport {
  player: PlayerRef;
  starts: ProjectedStart[];
  confirmedStarts: number;
  matchupScore: number | null;
}

export interface StartsResponse {
  sport: SportKey;
  season: string;
  startDate: string;
  endDate: string;
  coverage: string;
  coverageNote: string;
  pitchers: StartsReport[];
}

export interface PlayerStatus {
  playerId: string;
  name: string;
  team: string | null;
  position: string | null;
  status: string;
  availability: Availability;
}

export interface AvailabilityQuery {
  sport: SportKey;
  season?: string;
  availability?: Availability[];
  team?: string;
  search?: string;
}

export interface AvailabilityResponse {
  sport: SportKey;
  season: string;
  players: PlayerStatus[];
}
