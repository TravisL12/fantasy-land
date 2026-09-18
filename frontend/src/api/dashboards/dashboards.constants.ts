export const DASHBOARDS_URL = '/api/dashboards';
export const DASHBOARD_BUILD_URL = `${DASHBOARDS_URL}/build`;

/** Mirrors the backend's WIDGET_TYPES. */
export const WIDGET_TYPES = {
  table: 'table',
  compare: 'compare',
  line: 'line',
  bar: 'bar',
  versus: 'versus',
  stats: 'stats',
  meter: 'meter',
  badges: 'badges',
} as const;

export const WIDGET_WIDTHS = { full: 'full', half: 'half' } as const;

export const BETTER_DIRECTIONS = { higher: 'higher', lower: 'lower' } as const;

/** Mirrors the backend's DASHBOARD_EVENTS — the chat events plus this one. */
export const DASHBOARD_EVENTS = {
  spec: 'dashboard_spec',
} as const;

export const DEFAULT_ROWS_PATH = 'rows';

/**
 * Where a tool's row array actually lives, in the order we look. Every tool
 * names its array for what it holds — get_leaderboard says "rows", but
 * compare_players says "players", a game log says "games" and
 * get_matchup_ratings says "teams" — so defaulting to "rows" alone left a
 * widget whose spec omitted rowsPath reading an object that has none.
 */
export const ROW_ARRAY_KEYS = [
  DEFAULT_ROWS_PATH,
  'players',
  'games',
  'teams',
  'pitchers',
] as const;
export const DEFAULT_ROW_KEY = 'id';
export const DEFAULT_LABEL_PATH = 'name';
export const DEFAULT_VERSUS_ROWS_PATH = 'players';
export const DEFAULT_METER_MAX = 100;

/** Mirrors the backend's DASHBOARD_LIMITS.prompt. */
export const PROMPT_MAX_LENGTH = 2000;
