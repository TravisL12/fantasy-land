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
  PREVIEW_DEFAULTS,
  SCHEDULE_DEFAULTS,
  SEARCH_MAX_LENGTH,
  SORT_ORDERS,
  STATS_QUERY_DEFAULTS,
} from '../sports.constants.js';
import type { MatchupSide, SortOrder } from '../sports.types.js';
import {
  ScoredSeasonQueryDto,
  SeasonQueryDto,
} from './sport-query.dto.js';

/** A repeated query param arrives as a string when it appears only once. */
const toArray = ({ value }: { value: unknown }): string[] =>
  Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

/**
 * The same, for a list of numbers. Everything in a query string is a string,
 * and `@Type(() => Number)` does not reach inside an array — so without this
 * `?weeks=3` failed `@IsInt({ each: true })` and the whole request was
 * rejected, which is what took the schedule's week filter down.
 */
const toNumberArray = ({ value }: { value: unknown }): number[] =>
  toArray({ value }).map(Number);

export class ExpectedPointsQueryDto extends ScoredSeasonQueryDto {
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

/** The schedule view, which may also be asked for weeks where a sport has them. */
export class ScheduleQueryDto extends DateWindowQueryDto {
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_WEEK, { each: true })
  weeks?: number[];
}

export class GamePreviewQueryDto extends ScoredSeasonQueryDto {
  @IsString()
  teamA!: string;

  @IsString()
  teamB!: string;

  /** Previews a specific meeting instead of the next one. */
  @IsOptional()
  @IsString()
  gameId?: string;

  /**
   * The interval the two teams are measured over. Both are needed to narrow
   * team production; one alone only narrows the fixtures. The ValidationPipe
   * whitelists, so a field missing here is dropped in silence rather than
   * rejected — which is how the route came to ignore an interval the service
   * and the tool both honour.
   */
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
  @Max(PREVIEW_DEFAULTS.maxLeaders)
  leaders?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PREVIEW_DEFAULTS.maxRecentGames)
  recentGames?: number;
}

/** The table, optionally narrowed to one division or conference. */
export class StandingsQueryDto extends SeasonQueryDto {
  @IsOptional()
  @IsString()
  group?: string;
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
