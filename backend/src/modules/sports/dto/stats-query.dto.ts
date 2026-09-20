import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DATA_KINDS,
  DATE_PATTERN,
  MAX_WEEK,
  SEARCH_MAX_LENGTH,
  SORT_KEY_PATTERN,
  SORT_ORDERS,
  STATS_QUERY_DEFAULTS,
} from '../sports.constants.js';
import type { DataKind, SortOrder } from '../sports.types.js';
import { ScoredSeasonQueryDto } from './sport-query.dto.js';

export class StatsQueryDto extends ScoredSeasonQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WEEK)
  week?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsIn(Object.values(DATA_KINDS))
  kind: DataKind = DATA_KINDS.stats;

  @IsOptional()
  @Matches(SORT_KEY_PATTERN)
  sort?: string;

  @IsOptional()
  @IsIn(Object.values(SORT_ORDERS))
  order: SortOrder = SORT_ORDERS.desc;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minGames: number = STATS_QUERY_DEFAULTS.minGames;

  /** Window: dates for sports measured in dates, weeks for sports with weeks. */
  @IsOptional()
  @Matches(DATE_PATTERN)
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_WEEK, { each: true })
  weeks?: number[];

  /**
   * Rank only players with at least `minStatValue` of this stat. Overrides the
   * stat's own qualifier, so a caller can widen or narrow the field the league
   * standard would set.
   */
  @IsOptional()
  @Matches(SORT_KEY_PATTERN)
  minStat?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStatValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(STATS_QUERY_DEFAULTS.maxLimit)
  limit: number = STATS_QUERY_DEFAULTS.limit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = STATS_QUERY_DEFAULTS.offset;
}
