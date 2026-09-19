import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DATA_KINDS,
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
