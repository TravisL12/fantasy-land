import type { DashboardColumn } from '@/api/dashboards';

/** One thing being compared: a player, a team, a ticked row. */
export interface MetricEntity {
  key: string;
  label: string;
  data: Record<string, unknown>;
}

export interface MetricGridProps {
  caption: string;
  entities: MetricEntity[];
  metrics: DashboardColumn[];
  emptyMessage: string;
  /** Mark the winning value on each metric. Off for a plain side-by-side. */
  highlightWinner?: boolean;
}
