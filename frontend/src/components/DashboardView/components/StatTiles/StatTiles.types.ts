import type { StatsWidget } from '@/api/dashboards';

export interface StatTilesProps {
  widget: StatsWidget;
  /** The object the tiles read — a season summary, a consistency block. */
  data: unknown;
  /**
   * The whole source result, read when a tile's path is not inside `data`. A
   * KPI row straddles the two: points sits at the top of a player result while
   * floor and ceiling sit inside "consistency".
   */
  result?: unknown;
}
