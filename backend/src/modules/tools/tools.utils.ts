import { BadRequestException } from '@nestjs/common';
import { SPORT_KEYS } from '../sports/sports.constants.js';
import type { SportKey } from '../sports/sports.types.js';

/** Models sometimes send numbers as strings, or a lone string for an array. */
export const asString = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

export const asNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

export const requireString = (
  args: Record<string, unknown>,
  key: string,
): string => {
  const value = asString(args[key])?.trim();
  if (!value) throw new BadRequestException(`"${key}" is required`);
  return value;
};

export const asSport = (value: unknown): SportKey => {
  const sport = asString(value)?.toLowerCase() ?? SPORT_KEYS.nfl;
  if (!(sport in SPORT_KEYS)) {
    throw new BadRequestException(
      `Unknown sport "${sport}" — expected one of ${Object.values(SPORT_KEYS).join(', ')}`,
    );
  }
  return sport as SportKey;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
