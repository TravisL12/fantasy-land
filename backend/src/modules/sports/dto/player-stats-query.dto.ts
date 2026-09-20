import { IsArray, IsOptional, Matches } from 'class-validator';
import { SEASON_PATTERN } from '../sports.constants.js';
import { ScoredSeasonQueryDto } from './sport-query.dto.js';

/** Season, group and scoring are the whole of a game-log request. */
export class PlayerStatsQueryDto extends ScoredSeasonQueryDto {}

/** The same request over several seasons, for a year-by-year view. */
export class PlayerSeasonsQueryDto extends ScoredSeasonQueryDto {
  @IsOptional()
  @IsArray()
  @Matches(SEASON_PATTERN, { each: true })
  seasons: string[] = [];
}
