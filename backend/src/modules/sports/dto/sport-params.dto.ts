import { IsIn, Matches } from 'class-validator';
import { SPORT_KEYS } from '../sports.constants.js';
import type { SportKey } from '../sports.types.js';

export class SportParamsDto {
  @IsIn(Object.values(SPORT_KEYS))
  sport!: SportKey;
}

export class PlayerParamsDto extends SportParamsDto {
  @Matches(/^[A-Za-z0-9]+$/)
  playerId!: string;
}
