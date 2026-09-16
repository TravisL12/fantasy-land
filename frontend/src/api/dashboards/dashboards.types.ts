// Mirrors backend/src/modules/dashboards/dashboards.types.ts.
import type { ChatStreamEvent } from '@/api/chat';
import type { SortOrder, StatFormat } from '@/api/sports';
import type {
  BETTER_DIRECTIONS,
  DASHBOARD_EVENTS,
  WIDGET_TYPES,
  WIDGET_WIDTHS,
} from './dashboards.constants';

export type WidgetType = (typeof WIDGET_TYPES)[keyof typeof WIDGET_TYPES];
export type WidgetWidth = (typeof WIDGET_WIDTHS)[keyof typeof WIDGET_WIDTHS];
export type BetterDirection =
  (typeof BETTER_DIRECTIONS)[keyof typeof BETTER_DIRECTIONS];
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
  /** Which way wins when this metric is compared. Defaults to "higher". */
  better?: BetterDirection;
}

interface WidgetBase {
  id: string;
  title: string;
  width?: WidgetWidth;
}

interface SourcedWidget extends WidgetBase {
  source: string;
  rowsPath?: string;
}

export interface TableWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.table;
  rowKey?: string;
  columns: DashboardColumn[];
  selectable?: boolean;
  sort?: { key: string; order: SortOrder };
  limit?: number;
}

export interface CompareWidget extends WidgetBase {
  type: typeof WIDGET_TYPES.compare;
  /** Id of the table widget whose selection drives this panel. */
  from: string;
  metrics?: DashboardColumn[];
}

export interface VersusWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.versus;
  labelPath?: string;
  metrics: DashboardColumn[];
}

export interface ChartSeries {
  key: string;
  label: string;
  path: string;
  format?: CellFormat;
  /** Defaults to the widget's own source, so one chart can span two sources. */
  source?: string;
  rowsPath?: string;
}

export interface ChartAxis {
  path: string;
  label?: string;
  format?: CellFormat;
}

export interface ChartWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.line | typeof WIDGET_TYPES.bar;
  x: ChartAxis;
  series: ChartSeries[];
  stacked?: boolean;
  horizontal?: boolean;
  limit?: number;
}

export interface StatsWidget extends WidgetBase {
  type: typeof WIDGET_TYPES.stats;
  source: string;
  /** Dot path to the object holding the values. Defaults to the whole result. */
  path?: string;
  tiles: DashboardColumn[];
}

export interface MeterWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.meter;
  labelPath?: string;
  valuePath: string;
  gradePath?: string;
  max?: number;
  limit?: number;
}

export interface BadgesWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.badges;
  labelPath?: string;
  statusPath: string;
  notePath?: string;
  limit?: number;
}

export type DashboardWidget =
  | TableWidget
  | CompareWidget
  | VersusWidget
  | ChartWidget
  | StatsWidget
  | MeterWidget
  | BadgesWidget;

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
