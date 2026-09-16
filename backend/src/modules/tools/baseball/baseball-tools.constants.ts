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
  description: `Last day to cover, as YYYY-MM-DD. Defaults to ${SCHEDULE_DEFAULTS.days} days from the start, and at most ${SCHEDULE_DEFAULTS.maxDays} days are allowed.`,
} as const;

export const TEAM_PARAM = {
  type: 'string',
  description: 'Filter to one team abbreviation, e.g. "NYY".',
} as const;

export const MATCHUP_SIDE_PARAM = {
  type: 'string',
  enum: Object.values(MATCHUP_SIDES),
  description:
    'Which side to rate the matchup for: "pitching" for pitchers facing that team\'s lineup, "hitting" for hitters facing that team\'s staff.',
} as const;

export const AVAILABILITY_PARAM = {
  type: 'array',
  items: { type: 'string', enum: Object.values(AVAILABILITY) },
  description: `Availability values to include. Defaults to ${AVAILABILITY.injured} and ${AVAILABILITY.inactive}, i.e. players who cannot play right now.`,
} as const;

export const PROBABLES_LIMIT = { default: 20, max: 60 } as const;
export const STARTS_LIMIT = { default: 20, max: 40 } as const;
export const STATUS_LIMIT = { default: 25, max: 100 } as const;

export const BASEBALL_TOOL_MESSAGES = {
  noProbables:
    'No probable starters are published for that window yet — MLB announces them about four days ahead.',
  noStatuses: 'No players matched those filters',
} as const;
