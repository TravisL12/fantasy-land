import {
  SPORT_KEYS,
  WINDOW_DEFAULTS,
} from '../../sports/sports.constants.js';

export const SPORT_PARAM = {
  type: 'string',
  enum: Object.values(SPORT_KEYS),
  description: 'Which sport. Defaults to nfl.',
} as const;

export const SEASON_PARAM = {
  type: 'string',
  description:
    'Four-digit season, e.g. "2025". Defaults to the current season.',
} as const;

export const SCORING_PARAM = {
  type: 'string',
  description:
    'Scoring preset key, e.g. "ppr", "half_ppr" or "std" for NFL. Defaults to the sport\'s first preset.',
} as const;

export const PLAYER_ID_PARAM = {
  type: 'string',
  description:
    'The player id from find_player. For NFL these are Sleeper ids, so ids from the Sleeper tools work here too.',
} as const;

/**
 * A window over a season. Dates suit sports whose logs carry them and weeks
 * suit the NFL, so both are offered rather than one leaky "interval" argument.
 */
export const WINDOW_PARAMS = {
  startDate: {
    type: 'string',
    description:
      'Only games on or after this date, as YYYY-MM-DD. Leave out for the whole season.',
  },
  endDate: {
    type: 'string',
    description: 'Only games on or before this date, as YYYY-MM-DD.',
  },
  weeks: {
    type: 'array',
    items: { type: 'integer' },
    description:
      'Only these weeks, for sports that have them (NFL). Ignored for MLB.',
  },
  lastN: {
    type: 'integer',
    description: `Only the most recent N games, applied after the date and week filters (max ${WINDOW_DEFAULTS.maxLastN}).`,
  },
} as const;

export const FIND_PLAYER_LIMIT = { default: 5, max: 20 } as const;
export const LEADERBOARD_LIMIT = { default: 15, max: 50 } as const;
export const GAME_LOG_LIMIT = { default: 0, max: 25 } as const;
export const COMPARE_MAX_PLAYERS = 4;

export const SPORTS_TOOL_MESSAGES = {
  noMatches: (query: string) => `No players matched "${query}"`,
  tooManyPlayers: `Compare at most ${COMPARE_MAX_PLAYERS} players at once`,
  needTwoPlayers: 'Give at least two player ids to compare',
  unknownSort: (sort: string, group: string, keys: string[]) =>
    `Cannot sort by "${sort}" — the "${group}" group has no such stat. Sort by one of: ${keys.join(', ')}.`,
} as const;
