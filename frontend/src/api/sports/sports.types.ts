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
