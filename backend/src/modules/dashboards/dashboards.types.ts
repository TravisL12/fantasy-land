import type { ChatStreamEvent } from '../chat/chat.types.js';
import type {
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  DASHBOARD_EVENTS,
  SORT_ORDERS,
  WIDGET_TYPES,
} from './dashboards.constants.js';
import type { dashboards } from './dashboards.schema.js';

type ValueOf<T> = T[keyof T];

export type WidgetType = ValueOf<typeof WIDGET_TYPES>;
export type CellFormat = ValueOf<typeof CELL_FORMATS>;
export type CellAlign = ValueOf<typeof CELL_ALIGNMENTS>;
export type SortOrder = ValueOf<typeof SORT_ORDERS>;

/**
 * One tool call the dashboard re-runs every time it is opened. This is what
 * makes a saved dashboard a live view rather than a snapshot.
 */
export interface DashboardSource {
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface DashboardColumn {
  key: string;
  header: string;
  /** Dot path into a row, e.g. "stats.hr". */
  path: string;
  format?: CellFormat;
  align?: CellAlign;
  sortable?: boolean;
  /** Emphasize the column (e.g. fantasy points). */
  highlight?: boolean;
}

export interface TableWidget {
  type: typeof WIDGET_TYPES.table;
  id: string;
  title: string;
  source: string;
  /** Dot path to the array inside the tool's result. Defaults to "rows". */
  rowsPath?: string;
  /** Dot path to a stable row id. Defaults to "id". */
  rowKey?: string;
  columns: DashboardColumn[];
  /** Let the user tick rows, feeding any compare widget pointed at this table. */
  selectable?: boolean;
  sort?: { key: string; order: SortOrder };
  limit?: number;
}

/** Puts the rows selected in a table side by side, one column per selection. */
export interface CompareWidget {
  type: typeof WIDGET_TYPES.compare;
  id: string;
  title: string;
  /** Id of the table widget whose selection drives this panel. */
  from: string;
  /** Metrics to compare. Defaults to the table's own columns. */
  metrics?: DashboardColumn[];
}

export type DashboardWidget = TableWidget | CompareWidget;

export interface DashboardSpec {
  title: string;
  description?: string;
  sources: DashboardSource[];
  widgets: DashboardWidget[];
}

/** What one source returned on this run — either data or the reason it failed. */
export interface SourceResult {
  data?: unknown;
  error?: string;
}

export interface DashboardRun {
  ranAt: string;
  results: Record<string, SourceResult>;
}

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;

export type DashboardStreamEvent =
  | ChatStreamEvent
  | { type: typeof DASHBOARD_EVENTS.spec; spec: DashboardSpec };

/** A dashboard as sent to the client — the owner's id stays on the server. */
export interface PublicDashboard {
  id: string;
  title: string;
  description: string | null;
  spec: DashboardSpec;
  createdAt: Date;
  updatedAt: Date;
}
