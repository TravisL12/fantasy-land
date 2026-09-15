import type {
  DATA_KINDS,
  SORT_ORDERS,
  SPORT_KEYS,
  STAT_FORMATS,
} from './sports.constants.js';

type ValueOf<T> = T[keyof T];

export type SportKey = ValueOf<typeof SPORT_KEYS>;
export type DataKind = ValueOf<typeof DATA_KINDS>;
export type StatFormat = ValueOf<typeof STAT_FORMATS>;
export type SortOrder = ValueOf<typeof SORT_ORDERS>;

export interface StatDefinition {
  key: string;
  label: string;
  abbr: string;
  format: StatFormat;
  /** Whether per-game values can be added up into a total (false for rates like AVG). */
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

/** Points per unit of each stat, e.g. `{ rec_yd: 0.1, rec_td: 6 }`. */
export type ScoringRules = Record<string, number>;

export interface ScoringPreset {
  key: string;
  label: string;
  rules: Record<string, ScoringRules>;
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

export interface StatLine {
  player: PlayerRef;
  gamesPlayed: number;
  stats: StatValues;
}

export interface GameLogEntry {
  date: string | null;
  week: number | null;
  opponent: string | null;
  isHome: boolean | null;
  stats: StatValues;
}

export interface StatLinesQuery {
  season: string;
  week?: number;
  group: string;
  kind: DataKind;
}

export interface GameLogQuery {
  playerId: string;
  season: string;
  group?: string;
}

export interface GameLog {
  player: PlayerRef;
  group: string;
  entries: GameLogEntry[];
}

/**
 * One implementation per sport. Providers own all knowledge of their upstream
 * API and return normalized data; SportsService handles scoring, filtering and sorting.
 */
export interface SportProvider {
  readonly key: SportKey;
  getCatalog(): Promise<SportCatalog>;
  getStatLines(query: StatLinesQuery): Promise<StatLine[]>;
  /** Resolves null when the player doesn't exist upstream. */
  getGameLog(query: GameLogQuery): Promise<GameLog | null>;
}

export interface ScoredStatLine extends StatLine {
  fantasyPoints: number;
  fantasyPointsPerGame: number;
}

export interface ScoredGameLogEntry extends GameLogEntry {
  fantasyPoints: number;
}

/** Distribution of per-game fantasy points — the raw material for pick analysis. */
export interface PointsSummary {
  games: number;
  total: number;
  average: number;
  median: number;
  stdDev: number;
  floor: number;
  ceiling: number;
}
