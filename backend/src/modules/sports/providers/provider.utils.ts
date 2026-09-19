import { CACHE_TTL } from '../../data-cache/data-cache.constants.js';
import { SPORTS_CACHE_VERSION, STAT_FORMATS } from '../sports.constants.js';
import type {
  SportKey,
  StatDefinition,
  StatFormat,
  StatGroup,
  StatValues,
} from '../sports.types.js';

/**
 * Every cached payload is keyed `<version>:<sport>:<...>`, so bumping
 * SPORTS_CACHE_VERSION after a mapper change invalidates a whole sport at
 * once. Undefined parts drop out rather than becoming the string "undefined" —
 * an omitted week and a week named "undefined" are not the same key.
 */
export const cacheKeyFor =
  (sport: SportKey) =>
  (...parts: (string | number | undefined)[]) =>
    [
      SPORTS_CACHE_VERSION,
      sport,
      ...parts.filter((part) => part !== undefined),
    ].join(':');

/**
 * The season's TTL. A finished season's stats cannot change, so only our own
 * mapping can invalidate them and the version prefix is what does it; the
 * current season is re-pulled on the live interval.
 */
export const seasonTtl = (season: string, currentSeason: string) =>
  season === currentSeason ? CACHE_TTL.live : CACHE_TTL.archived;

export const defineStat = (
  key: string,
  label: string,
  abbr: string,
  format: StatFormat = STAT_FORMATS.int,
  options: {
    summable?: boolean;
    lowerIsBetter?: boolean;
    aliases?: readonly string[];
  } = {},
): StatDefinition => ({
  key,
  label,
  abbr,
  format,
  summable: options.summable ?? format === STAT_FORMATS.int,
  ...(options.lowerIsBetter && { lowerIsBetter: true }),
  ...(options.aliases && { aliases: options.aliases }),
});

/** Newest first, e.g. seasonRange(2024, 2026) → ['2026', '2025', '2024']. */
export const seasonRange = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, i) => String(last - i));

/** Coerces upstream values ("184.2", ".238", 12) to numbers; unparseable → undefined. */
export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Keeps only the numeric values for the given stat keys. */
export const pickStats = (
  source: Record<string, unknown>,
  keys: readonly string[],
): StatValues => {
  const stats: StatValues = {};
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== undefined) stats[key] = value;
  }
  return stats;
};

/** Providers receive group keys already validated by SportsService. */
export const findGroup = (groups: StatGroup[], key: string) => {
  const group = groups.find((g) => g.key === key);
  if (!group) throw new Error(`Unknown stat group: ${key}`);
  return group;
};
