import type {
  DataKind,
  GameLog,
  PointsSummary,
  ScoredGameLogEntry,
  ScoredStatLine,
  SportCatalog,
  StatValues,
} from '../sports.types.js';

export type SportCatalogResponseDto = SportCatalog;

export class StatsResponseDto {
  sport!: SportCatalog['key'];
  season!: string;
  week!: number | null;
  group!: string;
  kind!: DataKind;
  scoring!: string;
  total!: number;
  rows!: ScoredStatLine[];
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
