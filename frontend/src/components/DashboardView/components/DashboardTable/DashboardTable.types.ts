import type { TableWidget } from '@/api/dashboards';
import type { DashboardRow } from '../../DashboardView.types';

export interface DashboardTableProps {
  widget: TableWidget;
  rows: DashboardRow[];
  /** Row keys ticked in this table. Undefined when the table is not selectable. */
  selected?: string[];
  onToggle?: (key: string) => void;
  onClear?: () => void;
  isFetching?: boolean;
}
