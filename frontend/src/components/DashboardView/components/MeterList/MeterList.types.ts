import type { MeterWidget } from '@/api/dashboards';

export interface MeterListProps {
  widget: MeterWidget;
  rows: Record<string, unknown>[];
}
