import { Transform, Type } from 'class-transformer';
import {
  IsArray,
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
  AVAILABILITY,
  DATE_PATTERN,
  DIRECTORY_QUERY_DEFAULTS,
  EXPECTED_SORT_KEYS,
  MATCHUP_SIDES,
  MAX_WEEK,
  SCHEDULE_DEFAULTS,
  SEARCH_MAX_LENGTH,
  SEASON_PATTERN,
  SORT_ORDERS,
  STATS_QUERY_DEFAULTS,
} from '../sports.constants.js';
import type { MatchupSide, SortOrder } from '../sports.types.js';

/** A repeated query param arrives as a string when it appears only once. */
const toArray = ({ value }: { value: unknown }): string[] =>
  Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

class SeasonQueryDto {
  @IsOptional()
  @Matches(SEASON_PATTERN)
  season?: string;
}

export class ExpectedPointsQueryDto extends SeasonQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WEEK)
  week?: number;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  scoring?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsIn(Object.values(EXPECTED_SORT_KEYS))
  sort?: string;

  @IsOptional()
  @IsIn(Object.values(SORT_ORDERS))
  order: SortOrder = SORT_ORDERS.desc;

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

export class PlayerDirectoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(Object.values(AVAILABILITY), { each: true })
  availability?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DIRECTORY_QUERY_DEFAULTS.maxLimit)
  limit: number = DIRECTORY_QUERY_DEFAULTS.limit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

/** Shared by the schedule and the projected-starts views. */
export class DateWindowQueryDto extends SeasonQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN)
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SCHEDULE_DEFAULTS.maxDays)
  days?: number;
}

export class MatchupsQueryDto extends SeasonQueryDto {
  @IsOptional()
  @IsIn(Object.values(MATCHUP_SIDES))
  side: MatchupSide = MATCHUP_SIDES.pitching;
}

export class AvailabilityQueryDto extends SeasonQueryDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(Object.values(AVAILABILITY), { each: true })
  availability?: string[];

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;
}
