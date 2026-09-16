import type { CompareWidget, TableWidget } from '@/api/dashboards';
import type { DashboardRow } from '../../DashboardView.types';

export interface ComparePanelProps {
  widget: CompareWidget;
  /** The table the selection came from — its columns are the default metrics. */
  table: TableWidget;
  /** Only the rows the user ticked, in the order they appear in the table. */
  rows: DashboardRow[];
}
