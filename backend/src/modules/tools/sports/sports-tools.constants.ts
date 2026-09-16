import { SPORT_KEYS } from '../../sports/sports.constants.js';

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

export const FIND_PLAYER_LIMIT = { default: 5, max: 20 } as const;
export const LEADERBOARD_LIMIT = { default: 15, max: 50 } as const;
export const GAME_LOG_LIMIT = { default: 0, max: 25 } as const;
export const COMPARE_MAX_PLAYERS = 4;

export const SPORTS_TOOL_MESSAGES = {
  noMatches: (query: string) => `No players matched "${query}"`,
  tooManyPlayers: `Compare at most ${COMPARE_MAX_PLAYERS} players at once`,
  needTwoPlayers: 'Give at least two player ids to compare',
} as const;
