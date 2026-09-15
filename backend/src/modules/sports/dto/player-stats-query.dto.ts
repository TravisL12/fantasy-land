import { IsOptional, IsString, Matches } from 'class-validator';
import { SEASON_PATTERN } from '../sports.constants.js';

export class PlayerStatsQueryDto {
  @IsOptional()
  @Matches(SEASON_PATTERN)
  season?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  scoring?: string;
}
