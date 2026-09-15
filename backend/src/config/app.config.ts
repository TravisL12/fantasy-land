import { registerAs } from '@nestjs/config';
import {
  APP_CONFIG_KEY,
  DEFAULT_CORS_ORIGIN,
  DEFAULT_PORT,
} from './config.constants.js';

export interface AppConfig {
  port: number;
  corsOrigin: string;
}

export const appConfig = registerAs(
  APP_CONFIG_KEY,
  (): AppConfig => ({
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    corsOrigin: process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
  }),
);
