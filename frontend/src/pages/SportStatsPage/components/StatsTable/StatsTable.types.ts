import type { SportKey, StatDefinition, StatLeaderRow } from '@/api/sports';
import type { StatsFilters } from '../../SportStatsPage.types';

export interface StatsTableProps {
  sport: SportKey;
  filters: StatsFilters;
  statColumns: StatDefinition[];
  rows: StatLeaderRow[];
  offset: number;
  isFetching: boolean;
  onSort: (key: string, stat?: StatDefinition) => void;
}
