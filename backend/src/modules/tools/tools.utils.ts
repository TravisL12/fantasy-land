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

/**
 * Small models fill a required argument with the word for "missing" rather than
 * asking the user — `"undefined"`, `"null"`, or the placeholder straight out of
 * the schema — and that then travels all the way to an upstream API as a real
 * lookup value. Treat these as missing.
 */
const PLACEHOLDERS = new Set([
  'undefined',
  'null',
  'none',
  'n/a',
  'string',
  'unknown',
  'your_username',
  'username',
  'example',
]);

export const isPlaceholder = (value: string): boolean =>
  PLACEHOLDERS.has(value.toLowerCase()) ||
  // "<username>", "{username}", "[your name]" — a schema hint sent verbatim.
  /^[<{[].*[>}\]]$/.test(value);

export const requireString = (
  args: Record<string, unknown>,
  key: string,
): string => {
  const value = asString(args[key])?.trim();
  if (!value) throw new BadRequestException(`"${key}" is required`);
  if (isPlaceholder(value)) {
    throw new BadRequestException(
      `"${value}" is not a real value for "${key}" — ask the user for it instead of guessing.`,
    );
  }
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
