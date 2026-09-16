import { BadRequestException } from '@nestjs/common';
import { asString, isPlaceholder } from '../tools.utils.js';

const USERNAME_KEYS = [
  'username_or_id',
  'username',
  'user_id',
  'user',
  'name',
] as const;

/**
 * Small models pick whichever key reads best — `username` when the user typed a
 * username, `user_id` when they were told to use an id — so accept them all
 * rather than rejecting a call that carries the answer under another name.
 */
export const requireUsername = (args: Record<string, unknown>): string => {
  for (const key of USERNAME_KEYS) {
    const value = asString(args[key])?.trim();
    if (!value) continue;
    // A literal "undefined" would otherwise be looked up as a real username.
    if (isPlaceholder(value)) break;
    return value;
  }
  throw new BadRequestException(
    'No Sleeper username was given. Ask the user for their Sleeper username and pass it as "username_or_id" — never a placeholder.',
  );
};

/** The current season, then the season before it, as strings. */
export const seasonCandidates = (season: string, lookback: number): string[] => {
  const current = Number(season);
  if (!Number.isFinite(current)) return [season];
  return Array.from({ length: lookback + 1 }, (_, index) =>
    String(current - index),
  );
};
