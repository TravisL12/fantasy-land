import type { DashboardRun, DashboardSpec } from '@/api/dashboards';
import type { theme } from '@/styles';

export interface DashboardViewProps {
  spec: DashboardSpec;
  /** Extra controls for the toolbar, e.g. the builder's save button. */
  actions?: React.ReactNode;
  /**
   * Ready-made results to render instead of fetching. The widget guide passes
   * fixed data so its example dashboard is the real renderer, not a mock-up.
   */
  sample?: DashboardRun;
}

/** A row with the identity a selection is tracked by. */
export interface DashboardRow {
  key: string;
  data: Record<string, unknown>;
}

/** Resolved rows per table widget id. */
export type TableRows = Record<string, DashboardRow[]>;

/** Selected row keys per table widget id. */
export type Selection = Record<string, string[]>;

export interface DashboardRunState {
  run?: DashboardRun;
  isFetching: boolean;
  error?: string;
  refresh: () => void;
}

/** The reserved state colors a chip or meter may wear. */
export type StatusTone = keyof typeof theme.colors.status;
