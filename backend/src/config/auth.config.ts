import { registerAs } from '@nestjs/config';
import {
  AUTH_CONFIG_KEY,
  DEFAULT_SESSION_TTL_DAYS,
  MS_PER_DAY,
} from './config.constants.js';

export interface AuthConfig {
  sessionTtlMs: number;
  secureCookies: boolean;
}

export const authConfig = registerAs(
  AUTH_CONFIG_KEY,
  (): AuthConfig => ({
    sessionTtlMs:
      Number(process.env.SESSION_TTL_DAYS ?? DEFAULT_SESSION_TTL_DAYS) *
      MS_PER_DAY,
    secureCookies: process.env.NODE_ENV === 'production',
  }),
);
