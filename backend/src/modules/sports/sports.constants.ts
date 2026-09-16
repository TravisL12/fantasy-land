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

/** Normalized roster availability, so tools don't parse league-specific wording. */
export const AVAILABILITY = {
  active: 'active',
  injured: 'injured',
  minors: 'minors',
  inactive: 'inactive',
} as const;

/** Which side of the ball a matchup is rated for. */
export const MATCHUP_SIDES = { hitting: 'hitting', pitching: 'pitching' } as const;

export const MATCHUP_GRADES = {
  great: 'great',
  good: 'good',
  neutral: 'neutral',
  tough: 'tough',
  brutal: 'brutal',
} as const;

/** Score boundaries (0-100, higher = easier matchup) for each grade, best first. */
export const MATCHUP_GRADE_CUTOFFS = [
  { grade: MATCHUP_GRADES.great, min: 80 },
  { grade: MATCHUP_GRADES.good, min: 60 },
  { grade: MATCHUP_GRADES.neutral, min: 40 },
  { grade: MATCHUP_GRADES.tough, min: 20 },
  { grade: MATCHUP_GRADES.brutal, min: 0 },
] as const;

export const FORM_TRENDS = { hot: 'hot', cold: 'cold', steady: 'steady' } as const;

export const FORM_DEFAULTS = {
  window: 15,
  minWindow: 3,
  maxWindow: 60,
  /** Share of season points-per-game a recent split must beat to count as a trend. */
  trendThreshold: 0.15,
} as const;

export const SCHEDULE_DEFAULTS = { days: 7, maxDays: 21 } as const;

/**
 * Upstream only publishes probable starters a few days out, so anything past
 * that is projected from the player's own rest pattern and labelled as such.
 */
export const START_CONFIDENCE = {
  confirmed: 'confirmed',
  projected: 'projected',
} as const;

export const START_PROJECTION = {
  /** Assumed days between starts when the history is too short to measure. */
  restDays: 5,
  minRestDays: 3,
  maxRestDays: 7,
  /** How many recent starts the rest pattern is measured from. */
  sampleStarts: 5,
  /** Days a projected start may slide to land on a real team game. */
  slackDays: 2,
} as const;

/** Game-log stat that marks an appearance as a start. */
export const START_STAT_KEY = 'gamesStarted';

export const STARTS_COVERAGE = {
  requested: 'requested',
  announced: 'announced',
} as const;

/**
 * The league-wide sweep can only see pitchers upstream has already announced,
 * so it under-reports later in a window. Saying so beats a confident half-answer.
 */
export const STARTS_COVERAGE_NOTES = {
  [STARTS_COVERAGE.requested]:
    "Rest patterns were measured from each pitcher's own game log, so projections follow their actual rotation turn.",
  [STARTS_COVERAGE.announced]:
    'Only pitchers with an already-announced start in this window are covered, and projections assume a league-average rotation turn. Pitchers whose next start has not been announced yet are missing entirely — pass playerIds to check specific pitchers.',
} as const;

export const STARTS_DEFAULTS = {
  /** Cap on how many pitchers one starts report covers. */
  maxPlayers: 40,
  /** Cap on explicit ids, since each one costs a game-log fetch. */
  maxRequestedPlayers: 8,
} as const;

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
  noLeagueData: (sport: string) =>
    `No schedule, matchup or availability data for "${sport}" — this is only wired up for mlb so far`,
  badDate: (value: string) => `"${value}" is not a YYYY-MM-DD date`,
  endBeforeStart: 'endDate must not be before startDate',
  rangeTooLong: (max: number) => `Ask for at most ${max} days at a time`,
} as const;

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
