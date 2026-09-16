import type { StatsWidget } from '@/api/dashboards';

export interface StatTilesProps {
  widget: StatsWidget;
  /** The object the tiles read — a season summary, a consistency block. */
  data: unknown;
}
