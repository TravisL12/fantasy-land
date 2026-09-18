import { BadRequestException } from '@nestjs/common';
import {
  DATE_PATTERN,
  SCHEDULE_DEFAULTS,
  SPORTS_MESSAGES,
} from './sports.constants.js';
import type {
  LeagueDataProvider,
  SportProvider,
  StatDefinition,
  StatGroup,
} from './sports.types.js';

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

/** Validates an optional date, so a bad one is rejected before it is sent upstream. */
export const assertIsoDate = (value: string | undefined) =>
  value === undefined ? undefined : parseDate(value);

/**
 * Validates an open-ended window. Unlike a slate, a head-to-head or a game-log
 * slice is small however long the interval is, so there is no length cap here.
 */
export const assertRange = (
  startDate: string | undefined,
  endDate: string | undefined,
) => {
  const start = assertIsoDate(startDate);
  const end = assertIsoDate(endDate);
  if (start && end && daysBetween(start, end) < 0) {
    throw new BadRequestException(SPORTS_MESSAGES.endBeforeStart);
  }
  return { startDate: start, endDate: end };
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

/**
 * A key as the model wrote it, flattened to just its letters and digits, so
 * "strikeOuts", "strikeouts", "strike_outs" and "Strike Outs" are one token.
 */
export const flattenKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The canonical spelling of `requested`, or undefined if it names nothing. */
export const matchKey = (keys: readonly string[], requested: string) =>
  keys.find((key) => key === requested) ??
  keys.find((key) => flattenKey(key) === flattenKey(requested));

/**
 * Stat keys come from upstream, so they read like `strikeOuts`, `rec_yd` or
 * `pts_allow_35p`. A model asked about strikeouts writes the English word and
 * the lookup fails on capitalisation alone. Every name a stat already carries
 * — key, aliases, abbreviation, label — is indexed flattened, so "strikeouts",
 * "SO" and "K" all land on `strikeOuts`, and "receiving yards" on `rec_yd`.
 *
 * A token two stats in the group would both claim is dropped rather than
 * guessed at: an ambiguous name falls through to the usual "valid keys" error.
 */
export const resolveStatKey = (
  group: StatGroup,
  requested: string,
): string | undefined =>
  group.stats.find(({ key }) => key === requested)?.key ??
  statKeyIndex(group).get(flattenKey(requested)) ??
  undefined;

/** Flattened name → canonical key, or null where the name is ambiguous. */
type StatKeyIndex = Map<string, string | null>;

const statKeyIndexes = new WeakMap<StatGroup, StatKeyIndex>();

/** Weakest name first: a later source overwrites an earlier one, so a stat's
 * own key always beats another stat's label. */
const STAT_NAMES: ((stat: StatDefinition) => readonly (string | undefined)[])[] =
  [
    ({ label }) => [label],
    ({ abbr }) => [abbr],
    ({ aliases }) => aliases ?? [],
    ({ key }) => [key],
  ];

const statKeyIndex = (group: StatGroup) => {
  const cached = statKeyIndexes.get(group);
  if (cached) return cached;

  const index: StatKeyIndex = new Map();
  for (const names of STAT_NAMES) {
    const source: StatKeyIndex = new Map();
    for (const stat of group.stats) {
      for (const name of names(stat)) {
        const token = name && flattenKey(name);
        if (!token) continue;
        const claimed = source.get(token);
        source.set(token, claimed && claimed !== stat.key ? null : stat.key);
      }
    }
    for (const [token, key] of source) index.set(token, key);
  }

  statKeyIndexes.set(group, index);
  return index;
};
