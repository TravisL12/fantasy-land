import { BadRequestException } from '@nestjs/common';
import { clamp } from '../../common/math/number.js';
import { SPORT_KEYS } from '../sports/sports.constants.js';
import type {
  MatchupRating,
  SportKey,
  StatGroup,
} from '../sports/sports.types.js';
import { matchKey, resolveStatKey } from '../sports/sports.utils.js';
import { ROW_LEVEL_FIELDS, TOOL_MESSAGES } from './tools.constants.js';
import type { ToolLimit } from './tools.types.js';

export { clamp };

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

/** Same coercion as asStringArray, dropping anything that is not a number. */
export const asNumberArray = (value: unknown): number[] | undefined => {
  const values = asStringArray(value)
    .map(asNumber)
    .filter((entry): entry is number => entry !== undefined);
  return values.length ? values : undefined;
};

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

/** `fallback` is the sport a tool is shaped for — baseball tools default to mlb. */
export const asSport = (
  value: unknown,
  fallback: SportKey = SPORT_KEYS.nfl,
): SportKey => {
  const sport = asString(value)?.toLowerCase() ?? fallback;
  if (!(sport in SPORT_KEYS)) {
    throw new BadRequestException(
      `Unknown sport "${sport}" — expected one of ${Object.values(SPORT_KEYS).join(', ')}`,
    );
  }
  return sport as SportKey;
};

/**
 * A tool's row cap, from its `*_LIMIT` constant. Every tool clamps the same
 * way, and the maximum is what tools.limits.spec.ts checks against
 * MAX_TOOL_RESULT_CHARS — a limit the model may ask for has to fit.
 */
export const asLimit = (
  value: unknown,
  { default: fallback, max }: ToolLimit,
  min = 1,
) => clamp(asNumber(value) ?? fallback, min, max);

/** "true"/"1"/"yes" as well as a real boolean — small models send all three. */
export const asFlag = (value: unknown): boolean =>
  value === true || ['true', '1', 'yes'].includes(String(value).toLowerCase());

/**
 * Which stat keys a result should carry.
 *
 * A stat group defines twenty-odd stats and every row repeats all of them, so
 * an unfiltered leaderboard spends most of its characters on stats nobody
 * asked about. The group's own `defaultStats` is the curated subset, so that is
 * what a chat turn gets; `stats` overrides it with exactly the keys requested,
 * and a dashboard (`full`) gets everything unless it asks for less.
 *
 * `extra` is for keys the answer would be wrong without — the leaderboard's
 * sort key above all, since a ranking whose column is missing reads as
 * arbitrary. Returns undefined when nothing should be filtered out.
 *
 * Requested keys go through `resolveStatKey`, so a model that writes
 * "strikeouts" for `strikeOuts` gets the column rather than an error it has to
 * spend a round recovering from.
 */
export const resolveStatKeys = (
  group: StatGroup | undefined,
  requested: unknown,
  { full = false, extra = [] }: { full?: boolean; extra?: (string | undefined)[] } = {},
): Set<string> | undefined => {
  const asked = asStringArray(requested);

  if (asked.length) {
    if (!group) return new Set([...asked, ...keep(extra)]);

    const resolved = asked.map((key) => resolveStatKey(group, key));
    // A row-level field is not a stat, but it is already in the answer, so
    // asking for it is a request we can grant rather than an error.
    const unknown = asked.filter(
      (key, index) => !resolved[index] && !matchKey(ROW_LEVEL_FIELDS, key),
    );
    if (unknown.length) {
      const defined = group.stats.map(({ key }) => key);
      throw new BadRequestException(
        TOOL_MESSAGES.unknownStats(unknown, group.key, defined),
      );
    }
    return new Set([...keep(resolved), ...keep(extra)]);
  }

  if (full || !group) return undefined;
  return new Set([...group.defaultStats, ...keep(extra)]);
};

const keep = (values: (string | undefined)[]) =>
  values.filter((value): value is string => Boolean(value));

/** Narrows a stats object to the chosen keys, dropping the rest wholesale. */
export const pickStats = <T>(
  stats: Record<string, T> | undefined,
  keys: Set<string> | undefined,
): Record<string, T> => {
  if (!stats) return {};
  if (!keys) return stats;
  return Object.fromEntries(
    Object.entries(stats).filter(([key]) => keys.has(key)),
  );
};

/**
 * A matchup as a chat turn needs it: the score and the grade it is compared
 * on. The per-metric breakdown is dropped — it is three labelled objects per
 * start, repeated for every pitcher in the window, and get_matchup_ratings
 * exists to answer "why" when the question actually asks.
 */
export const compactMatchup = (
  matchup: MatchupRating | null | undefined,
  full = false,
) => {
  if (!matchup || full) return matchup ?? null;
  const { score, grade } = matchup;
  return { score, grade };
};
