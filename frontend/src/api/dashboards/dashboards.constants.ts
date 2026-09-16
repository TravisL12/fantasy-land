export const DASHBOARDS_URL = '/api/dashboards';
export const DASHBOARD_BUILD_URL = `${DASHBOARDS_URL}/build`;

/** Mirrors the backend's WIDGET_TYPES. */
export const WIDGET_TYPES = {
  table: 'table',
  compare: 'compare',
} as const;

/** Mirrors the backend's DASHBOARD_EVENTS — the chat events plus this one. */
export const DASHBOARD_EVENTS = {
  spec: 'dashboard_spec',
} as const;

export const DEFAULT_ROWS_PATH = 'rows';
export const DEFAULT_ROW_KEY = 'id';
