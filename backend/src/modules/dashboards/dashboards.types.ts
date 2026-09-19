import type { ChatStreamEvent } from '../chat/chat.types.js';
import type {
  BETTER_DIRECTIONS,
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  DASHBOARD_EVENTS,
  SORT_ORDERS,
  WIDGET_TYPES,
  WIDGET_WIDTHS,
} from './dashboards.constants.js';
import type { dashboards } from './dashboards.schema.js';

type ValueOf<T> = T[keyof T];

export type WidgetType = ValueOf<typeof WIDGET_TYPES>;
export type CellFormat = ValueOf<typeof CELL_FORMATS>;
export type CellAlign = ValueOf<typeof CELL_ALIGNMENTS>;
export type SortOrder = ValueOf<typeof SORT_ORDERS>;
export type BetterDirection = ValueOf<typeof BETTER_DIRECTIONS>;
export type WidgetWidth = ValueOf<typeof WIDGET_WIDTHS>;

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
  /** Which way wins when this metric is compared. Defaults to "higher". */
  better?: BetterDirection;
}

/** What every widget carries: identity, a heading and its slot in the grid. */
interface WidgetBase {
  id: string;
  title: string;
  width?: WidgetWidth;
}

/** A widget that renders one source's rows directly. */
interface SourcedWidget extends WidgetBase {
  source: string;
  /** Dot path to the array inside the tool's result. */
  rowsPath?: string;
}

export interface TableWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.table;
  /** Dot path to a stable row id. Defaults to "id". */
  rowKey?: string;
  columns: DashboardColumn[];
  /** Let the user tick rows, feeding any compare widget pointed at this table. */
  selectable?: boolean;
  sort?: { key: string; order: SortOrder };
  limit?: number;
}

/** Puts the rows selected in a table side by side, one column per selection. */
export interface CompareWidget extends WidgetBase {
  type: typeof WIDGET_TYPES.compare;
  /** Id of the table widget whose selection drives this panel. */
  from: string;
  /** Metrics to compare. Defaults to the table's own columns. */
  metrics?: DashboardColumn[];
}

/**
 * The same panel without the ticking: the entities come straight from a source,
 * which is what compare_players and get_game_preview already return.
 */
export interface VersusWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.versus;
  /** Dot path to each entity's display name. Defaults to "name". */
  labelPath?: string;
  metrics: DashboardColumn[];
}

/** One line on a chart. It may read its own source, so two logs can share an axis. */
export interface ChartSeries {
  key: string;
  label: string;
  path: string;
  format?: CellFormat;
  /** Defaults to the widget's own source. */
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
  /** bar only: stack the series instead of grouping them. */
  stacked?: boolean;
  /** bar only: run the bars along the x axis, for long category names. */
  horizontal?: boolean;
  limit?: number;
}

/** A row of headline numbers read out of one object in the result. */
export interface StatsWidget extends WidgetBase {
  type: typeof WIDGET_TYPES.stats;
  source: string;
  /** Dot path to the object holding the values. Defaults to the whole result. */
  path?: string;
  tiles: DashboardColumn[];
}

/** A 0-100 rating with its grade, one per row — built for get_matchup_ratings. */
export interface MeterWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.meter;
  labelPath?: string;
  valuePath: string;
  /** Dot path to a short qualitative label shown beside the value. */
  gradePath?: string;
  max?: number;
  limit?: number;
}

/** Short status chips per row: availability, hot/cold form, confirmed/projected. */
export interface BadgesWidget extends SourcedWidget {
  type: typeof WIDGET_TYPES.badges;
  labelPath?: string;
  statusPath: string;
  /** Dot path to a line of detail under the chip. */
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

/** What one source returned on this run — either data or the reason it failed. */
export interface SourceResult {
  data?: unknown;
  error?: string;
}

export interface DashboardRun {
  ranAt: string;
  results: Record<string, SourceResult>;
}

/**
 * The result of checking a spec against real data: the spec with what could be
 * repaired repaired, the problems only the model can fix, and what was adjusted
 * or could not be checked.
 */
export interface SpecReview {
  spec: DashboardSpec;
  problems: string[];
  notes: string[];
}

/** What a save carries: the spec, plus the words that asked for it. */
export interface DashboardInput {
  spec: DashboardSpec;
  prompt?: string;
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
  /** The request it was built from, shown on the dashboard itself. */
  prompt: string | null;
  spec: DashboardSpec;
  createdAt: Date;
  updatedAt: Date;
}
