import type {
  DataKind,
  GameLog,
  PointsSummary,
  ScoredGameLogEntry,
  ScoredStatLine,
  SportCatalog,
  StatValues,
  StatWindow,
} from '../sports.types.js';

export type SportCatalogResponseDto = SportCatalog;

export class StatsResponseDto {
  sport!: SportCatalog['key'];
  season!: string;
  week!: number | null;
  /** The part of the season measured, or null for the whole of it. */
  window!: StatWindow | null;
  group!: string;
  kind!: DataKind;
  scoring!: string;
  total!: number;
  rows!: ScoredStatLine[];
  /** Set when the field was narrowed, e.g. to qualified hitters. */
  note?: string;
}

/** One season's line in a multi-season view. */
export class PlayerSeasonLineDto {
  season!: string;
  gamesPlayed!: number;
  fantasyPoints!: number;
  pointsPerGame!: number;
  totals!: StatValues;
  summary!: PointsSummary;
}

export class PlayerSeasonsResponseDto {
  sport!: SportCatalog['key'];
  group!: GameLog['group'];
  scoring!: string;
  player!: GameLog['player'];
  /** Newest first — a trajectory is read backwards from where the player is now. */
  seasons!: PlayerSeasonLineDto[];
  /** Seasons asked for that this player has no record in. */
  missing!: string[];
}

export class PlayerStatsResponseDto {
  sport!: SportCatalog['key'];
  season!: string;
  group!: GameLog['group'];
  scoring!: string;
  player!: GameLog['player'];
  entries!: ScoredGameLogEntry[];
  totals!: StatValues;
  summary!: PointsSummary;
}
