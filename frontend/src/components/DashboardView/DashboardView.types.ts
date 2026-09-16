import type { DashboardRun, DashboardSpec } from '@/api/dashboards';

export interface DashboardViewProps {
  spec: DashboardSpec;
  /** Extra controls for the toolbar, e.g. the builder's save button. */
  actions?: React.ReactNode;
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
