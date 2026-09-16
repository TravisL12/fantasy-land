import type {
  AVAILABILITY,
  START_CONFIDENCE,
  DATA_KINDS,
  FORM_TRENDS,
  MATCHUP_GRADES,
  MATCHUP_SIDES,
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

export type Availability = ValueOf<typeof AVAILABILITY>;
export type MatchupSide = ValueOf<typeof MATCHUP_SIDES>;
export type MatchupGrade = ValueOf<typeof MATCHUP_GRADES>;
export type FormTrend = ValueOf<typeof FORM_TRENDS>;

export interface ProbableStarter {
  playerId: string;
  name: string;
  team: string;
  opponent: string;
  isHome: boolean;
}

export interface ScheduledGame {
  gameId: string;
  date: string;
  /** Upstream wording, e.g. "Scheduled", "In Progress", "Final". */
  status: string;
  home: string;
  away: string;
  probables: { home: ProbableStarter | null; away: ProbableStarter | null };
}

export interface ScheduleQuery {
  season: string;
  startDate: string;
  endDate: string;
}

/** Season-to-date team production, the input to matchup ratings. */
export interface TeamStrength {
  team: string;
  gamesPlayed: number;
  hitting: StatValues;
  pitching: StatValues;
}

/**
 * One input to a matchup rating. `value` reads the opposing team's line, and
 * `betterWhenHigh` says whether a high value is good *for the opponent*, so the
 * engine can invert it into a difficulty score for the player we care about.
 */
export interface MatchupMetric {
  key: string;
  label: string;
  betterWhenHigh: boolean;
  value(team: TeamStrength): number | undefined;
}

export interface MatchupRating {
  /** 0-100, where 100 is the easiest matchup in the league for this side. */
  score: number;
  grade: MatchupGrade;
  metrics: { key: string; label: string; value: number; rank: number }[];
}

export type StartConfidence = ValueOf<typeof START_CONFIDENCE>;

export interface ProjectedStart {
  date: string;
  opponent: string;
  isHome: boolean;
  confidence: StartConfidence;
  matchup?: MatchupRating;
}

/** A pitcher's starts across a date window, confirmed and projected together. */
export interface StartsReport {
  player: PlayerRef;
  starts: ProjectedStart[];
  confirmedStarts: number;
  /** Mean matchup score across the window, so two-start weeks can be compared. */
  matchupScore: number | null;
}

export interface PlayerStatus {
  playerId: string;
  name: string;
  team: string | null;
  position: string | null;
  /** Upstream wording, e.g. "Injured 10-Day". */
  status: string;
  availability: Availability;
}

/**
 * Optional provider capability: fixtures, team strength and roster availability.
 * A sport whose upstream has none of this simply doesn't implement it, and
 * SportsService reports that rather than pretending the data exists.
 */
export interface LeagueDataProvider extends SportProvider {
  readonly matchupMetrics: Record<MatchupSide, MatchupMetric[]>;
  getSchedule(query: ScheduleQuery): Promise<ScheduledGame[]>;
  getTeamStrength(season: string): Promise<TeamStrength[]>;
  getPlayerStatuses(season: string): Promise<PlayerStatus[]>;
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

/** Recent split measured against the season as a whole. */
export interface FormReport {
  window: number;
  recent: PointsSummary;
  season: PointsSummary;
  /** Recent points per game minus season points per game. */
  delta: number;
  trend: FormTrend;
  recentTotals: StatValues;
}
