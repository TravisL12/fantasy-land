export const SPORTS_ROUTE = 'sports';
export const SPORTS_ROUTES = {
  catalog: ':sport',
  stats: ':sport/stats',
  playerStats: ':sport/players/:playerId/stats',
} as const;

export const SPORT_KEYS = { mlb: 'mlb', nfl: 'nfl' } as const;
export const DATA_KINDS = {
  stats: 'stats',
  projections: 'projections',
} as const;
export const STAT_FORMATS = {
  int: 'int',
  decimal: 'decimal',
  rate: 'rate',
  percent: 'percent',
  /** Baseball innings stored as true thirds, displayed as 184.2. */
  innings: 'innings',
} as const;
export const SORT_ORDERS = { asc: 'asc', desc: 'desc' } as const;

export const SPORT_PROVIDERS = Symbol('SPORT_PROVIDERS');

/** Sort keys that aren't raw stats. */
export const COMPUTED_SORT_KEYS = {
  fantasyPoints: 'fantasyPoints',
  fantasyPointsPerGame: 'fantasyPointsPerGame',
  gamesPlayed: 'gamesPlayed',
  name: 'name',
} as const;

export const STATS_QUERY_DEFAULTS = {
  limit: 50,
  maxLimit: 200,
  offset: 0,
  minGames: 0,
} as const;

export const SEASON_PATTERN = /^\d{4}$/;
export const SORT_KEY_PATTERN = /^[A-Za-z0-9_]+$/;
export const MAX_WEEK = 22;
export const SEARCH_MAX_LENGTH = 50;

/** Bump to invalidate every cached, normalized payload after a mapper change. */
export const SPORTS_CACHE_VERSION = 'v5';

export const SPORTS_MESSAGES = {
  unknownGroup: (group: string) => `Unknown stat group "${group}"`,
  unknownScoring: (scoring: string) => `Unknown scoring preset "${scoring}"`,
  unsupportedKind: (kind: string) => `This sport does not support "${kind}"`,
  weeksUnsupported: 'This sport does not support weekly stats',
  playerNotFound: 'Player not found',
} as const;
