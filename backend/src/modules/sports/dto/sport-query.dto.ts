import { IsOptional, IsString, Matches } from 'class-validator';
import { SEASON_PATTERN } from '../sports.constants.js';

/** Every sport view is asked about one season, defaulting to the current one. */
export class SeasonQueryDto {
  @IsOptional()
  @Matches(SEASON_PATTERN)
  season?: string;
}

/**
 * A season measured through one stat group on one scoring preset. Both are
 * resolved loosely by the service, so they are strings here rather than an
 * enum the catalog would have to be flattened into.
 */
export class ScoredSeasonQueryDto extends SeasonQueryDto {
  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  scoring?: string;
}
