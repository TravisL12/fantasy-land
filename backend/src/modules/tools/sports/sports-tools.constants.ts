import {
  FORM_DEFAULTS,
  PREVIEW_DEFAULTS,
  SCHEDULE_DEFAULTS,
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
  description: 'Four-digit season, e.g. "2025". Defaults to the current season.',
} as const;

export const SCORING_PARAM = {
  type: 'string',
  description:
    'Scoring preset key, e.g. "ppr" or "std". Defaults to the sport\'s first preset.',
} as const;

export const PLAYER_ID_PARAM = {
  type: 'string',
  description: 'Player id from find_player (NFL ids are Sleeper ids).',
} as const;

export const GROUP_PARAM = {
  type: 'string',
  description:
    'Stat group key — "hitting"/"pitching" for MLB, "offense"/"kicking"/"defense" for NFL.',
} as const;

/**
 * The stat filter every stats-returning tool shares. Without it a row carries
 * all twenty-odd stats in its group, most of which the question never touches.
 */
export const STATS_PARAM = {
  type: 'array',
  items: { type: 'string' },
  description:
    'Only these stat keys, e.g. ["homeRuns","rbi"]. Defaults to the group\'s headline stats — name the keys you need to keep the result small, or to see one outside that set.',
} as const;

/**
 * A window over a season. Dates suit sports whose logs carry them and weeks
 * suit the NFL, so both are offered rather than one leaky "interval" argument.
 */
export const WINDOW_PARAMS = {
  startDate: {
    type: 'string',
    description: 'Only games on or after this date (YYYY-MM-DD).',
  },
  endDate: {
    type: 'string',
    description: 'Only games on or before this date (YYYY-MM-DD).',
  },
  weeks: {
    type: 'array',
    items: { type: 'integer' },
    description: 'Only these NFL weeks. Ignored for MLB.',
  },
  lastN: {
    type: 'integer',
    description: `Only the most recent N games, applied after the date and week filters (max ${WINDOW_DEFAULTS.maxLastN}).`,
  },
} as const;

/** What get_player_stats returns. Season totals alone answer most questions. */
export const PLAYER_STATS_SECTIONS = {
  totals: 'totals',
  games: 'games',
  form: 'form',
} as const;

export const DEFAULT_PLAYER_STATS_SECTIONS = [PLAYER_STATS_SECTIONS.totals];

export const FIND_PLAYER_LIMIT = { default: 5, max: 20 } as const;
export const LEADERBOARD_LIMIT = { default: 15, max: 50 } as const;
/**
 * A game log is per-game stats repeated N times, so it is the easiest result
 * to blow the context on. Ten recent games answers a trend question; the model
 * can ask for more up to the cap.
 */
export const GAME_LOG_LIMIT = { default: 10, max: 25 } as const;
export const FORM_WINDOW_LIMIT = {
  default: FORM_DEFAULTS.window,
  max: FORM_DEFAULTS.maxWindow,
} as const;
export const COMPARE_MAX_PLAYERS = 4;

export const SPORTS_TOOL_MESSAGES = {
  noMatches: (query: string) => `No players matched "${query}"`,
  tooManyPlayers: `Compare at most ${COMPARE_MAX_PLAYERS} players at once`,
  needTwoPlayers: 'Give at least two player ids to compare',
  unknownSort: (sort: string, group: string, keys: string[]) =>
    `Cannot sort by "${sort}" — the "${group}" group has no such stat. Sort by one of: ${keys.join(', ')}.`,
  unknownSection: (section: string, valid: string[]) =>
    `Unknown "include" value "${section}". Valid values: ${valid.join(', ')}.`,
} as const;

/**
 * A fixture window. Weeks and dates filter each other, so the service takes
 * one or the other — saying so here saves the round spent on the rejection.
 */
export const SCHEDULE_WINDOW_PARAMS = {
  startDate: {
    type: 'string',
    description: `First day to cover (YYYY-MM-DD). Defaults to today. Do not combine with weeks.`,
  },
  endDate: {
    type: 'string',
    description: `Last day to cover (YYYY-MM-DD). Defaults to ${SCHEDULE_DEFAULTS.days} days after the start; ${SCHEDULE_DEFAULTS.maxDays} is the most allowed.`,
  },
  weeks: {
    type: 'array',
    items: { type: 'integer' },
    description:
      'NFL weeks to cover, e.g. [3] or [3,4]. Use this instead of dates for football, and never both at once. MLB has no weeks.',
  },
} as const;

export const TEAM_SIDE_PARAMS = {
  teamA: {
    type: 'string',
    description: 'First team abbreviation, e.g. "KC" or "NYY".',
  },
  teamB: {
    type: 'string',
    description: 'The team to set against it, e.g. "BUF" or "BOS".',
  },
} as const;

/** Rows and results per side, both capped so one preview stays readable. */
export const SCHEDULE_LIMIT = { default: 40, max: 60 } as const;
export const PREVIEW_LEADERS = {
  default: PREVIEW_DEFAULTS.leaders,
  max: PREVIEW_DEFAULTS.maxLeaders,
} as const;
export const PREVIEW_RECENT_GAMES = {
  default: PREVIEW_DEFAULTS.recentGames,
  max: PREVIEW_DEFAULTS.maxRecentGames,
} as const;
