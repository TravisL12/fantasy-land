import { registerAs } from '@nestjs/config';
import {
  DEFAULT_SPORTS_WARMUP_DELAY_MS,
  DEFAULT_SPORTS_WARMUP_MODE,
  DEFAULT_SPORTS_WARMUP_SEASONS,
  SPORTS_CONFIG_KEY,
  SPORTS_WARMUP_MODES,
} from './config.constants.js';

export type SportsWarmupMode =
  (typeof SPORTS_WARMUP_MODES)[keyof typeof SPORTS_WARMUP_MODES];

export interface SportsConfig {
  /** Whether to pull finished seasons into the cache at startup. */
  warmup: SportsWarmupMode;
  /** How many seasons back to warm, newest first. */
  warmupSeasons: number;
  /** Pause between season/group fetches, so a cold cache is not one burst. */
  warmupDelayMs: number;
}

/** An unrecognised value falls back rather than failing boot over a typo. */
const warmupMode = (value: string | undefined): SportsWarmupMode =>
  value && value in SPORTS_WARMUP_MODES
    ? SPORTS_WARMUP_MODES[value as SportsWarmupMode]
    : DEFAULT_SPORTS_WARMUP_MODE;

export const sportsConfig = registerAs(
  SPORTS_CONFIG_KEY,
  (): SportsConfig => ({
    warmup: warmupMode(process.env.SPORTS_WARMUP),
    warmupSeasons: Number(
      process.env.SPORTS_WARMUP_SEASONS ?? DEFAULT_SPORTS_WARMUP_SEASONS,
    ),
    warmupDelayMs: Number(
      process.env.SPORTS_WARMUP_DELAY_MS ?? DEFAULT_SPORTS_WARMUP_DELAY_MS,
    ),
  }),
);
