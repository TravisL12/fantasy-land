// Mirrors backend/src/modules/dashboards/dashboards.types.ts.
import type { ChatStreamEvent } from '@/api/chat';
import type { SortOrder, StatFormat } from '@/api/sports';
import type { DASHBOARD_EVENTS, WIDGET_TYPES } from './dashboards.constants';

export type WidgetType = (typeof WIDGET_TYPES)[keyof typeof WIDGET_TYPES];
export type CellFormat = StatFormat | 'text';
export type CellAlign = 'left' | 'right';

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
  highlight?: boolean;
}

export interface TableWidget {
  type: typeof WIDGET_TYPES.table;
  id: string;
  title: string;
  source: string;
  rowsPath?: string;
  rowKey?: string;
  columns: DashboardColumn[];
  selectable?: boolean;
  sort?: { key: string; order: SortOrder };
  limit?: number;
}

export interface CompareWidget {
  type: typeof WIDGET_TYPES.compare;
  id: string;
  title: string;
  /** Id of the table widget whose selection drives this panel. */
  from: string;
  metrics?: DashboardColumn[];
}

export type DashboardWidget = TableWidget | CompareWidget;

export interface DashboardSpec {
  title: string;
  description?: string;
  sources: DashboardSource[];
  widgets: DashboardWidget[];
}

export interface SourceResult {
  data?: unknown;
  error?: string;
}

export interface DashboardRun {
  ranAt: string;
  results: Record<string, SourceResult>;
}

export interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  spec: DashboardSpec;
  createdAt: string;
  updatedAt: string;
}

export type DashboardStreamEvent =
  | ChatStreamEvent
  | { type: typeof DASHBOARD_EVENTS.spec; spec: DashboardSpec };
