import { BadRequestException } from '@nestjs/common';
import {
  DATE_PATTERN,
  SCHEDULE_DEFAULTS,
  SPORTS_MESSAGES,
} from './sports.constants.js';
import type { LeagueDataProvider, SportProvider } from './sports.types.js';

/** Narrows a provider to the optional schedule/strength/availability capability. */
export const providesLeagueData = (
  provider: SportProvider,
): provider is LeagueDataProvider => 'getSchedule' in provider;

const DAY_MS = 24 * 60 * 60 * 1000;

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number) =>
  toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));

export const daysBetween = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS,
  );

const parseDate = (value: string) => {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(SPORTS_MESSAGES.badDate(value));
  }
  return value;
};

/**
 * Validates a date window and caps its length — an uncapped range would pull
 * hundreds of games into the model's context.
 */
export const resolveDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  days: number = SCHEDULE_DEFAULTS.days,
) => {
  const start = parseDate(startDate ?? toIsoDate(new Date()));
  const end = parseDate(endDate ?? addDays(start, days - 1));
  const span = daysBetween(start, end);

  if (span < 0) throw new BadRequestException(SPORTS_MESSAGES.endBeforeStart);
  if (span >= SCHEDULE_DEFAULTS.maxDays) {
    throw new BadRequestException(
      SPORTS_MESSAGES.rangeTooLong(SCHEDULE_DEFAULTS.maxDays),
    );
  }
  return { startDate: start, endDate: end };
};
