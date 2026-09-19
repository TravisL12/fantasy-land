import {
  type INestApplication,
  ValidationPipe,
  type ValidationPipeOptions,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { API_PREFIX } from './config/config.constants.js';

/**
 * `whitelist` strips any property a DTO does not declare, so a query field
 * missing from a DTO is dropped in silence rather than rejected. Exported so a
 * DTO test can run the real pipe instead of a second copy of these options
 * that could drift from it.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
};

// Shared by main.ts and e2e tests so both run the exact same app config.
export const configureApp = (app: INestApplication) => {
  app.setGlobalPrefix(API_PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.useGlobalFilters(new HttpExceptionFilter());
  return app;
};
