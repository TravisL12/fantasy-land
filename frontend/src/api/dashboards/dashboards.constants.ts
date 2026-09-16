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
export const DEFAULT_ROW_KEY = 'id';
export const DEFAULT_LABEL_PATH = 'name';
export const DEFAULT_VERSUS_ROWS_PATH = 'players';
export const DEFAULT_METER_MAX = 100;
