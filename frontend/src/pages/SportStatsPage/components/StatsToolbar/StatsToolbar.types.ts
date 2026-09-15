import type { SportCatalog } from '@/api/sports';
import type {
  StatsFilterChanges,
  StatsFilters,
} from '../../SportStatsPage.types';

export interface StatsToolbarProps {
  catalog: SportCatalog;
  filters: StatsFilters;
  onChange: (changes: StatsFilterChanges) => void;
  onGroupChange: (group: string) => void;
}
