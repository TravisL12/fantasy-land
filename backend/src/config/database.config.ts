import { registerAs } from '@nestjs/config';
import {
  DATABASE_CONFIG_KEY,
  DEFAULT_DATABASE_URL,
} from './config.constants.js';

export interface DatabaseConfig {
  url: string;
}

export const databaseConfig = registerAs(
  DATABASE_CONFIG_KEY,
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  }),
);
