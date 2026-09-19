import {
  AVAILABILITY,
  MATCHUP_SIDES,
  SCHEDULE_DEFAULTS,
  SPORT_KEYS,
} from '../../sports/sports.constants.js';

/** These tools are baseball-shaped, so they default to MLB rather than NFL. */
export const BASEBALL_SPORT_PARAM = {
  type: 'string',
  enum: Object.values(SPORT_KEYS),
  description: 'Which sport. Defaults to mlb.',
} as const;

export const START_DATE_PARAM = {
  type: 'string',
  description: 'First day to cover, as YYYY-MM-DD. Defaults to today.',
} as const;

export const END_DATE_PARAM = {
  type: 'string',
  description: `Last day to cover, as YYYY-MM-DD. Defaults to ${SCHEDULE_DEFAULTS.days} days from the start; ${SCHEDULE_DEFAULTS.maxDays} is the most allowed.`,
} as const;

export const TEAM_PARAM = {
  type: 'string',
  description: 'Filter to one team abbreviation, e.g. "NYY".',
} as const;

export const MATCHUP_SIDE_PARAM = {
  type: 'string',
  enum: Object.values(MATCHUP_SIDES),
  description:
    'Which side to rate for: "pitching" when the player facing them is a pitcher, "hitting" when they are a batter.',
} as const;

export const AVAILABILITY_PARAM = {
  type: 'array',
  items: { type: 'string', enum: Object.values(AVAILABILITY) },
  description: `Which to include. Defaults to ${AVAILABILITY.injured} and ${AVAILABILITY.inactive} — players who cannot play right now.`,
} as const;

/**
 * Maxima are bounded by MAX_TOOL_RESULT_CHARS, not by taste: a row that does
 * not fit would only truncate itself. tools.limits.spec.ts checks them against
 * rows built from the real stat definitions.
 */
export const MATCHUP_LIMIT = { default: 30, max: 30 } as const;
export const STARTS_LIMIT = { default: 20, max: 25 } as const;
export const STATUS_LIMIT = { default: 25, max: 100 } as const;

export const BASEBALL_TOOL_MESSAGES = {
  noProbables:
    'No probable starters are published for that window yet — MLB announces them about four days ahead.',
  noStatuses: 'No players matched those filters',
} as const;
