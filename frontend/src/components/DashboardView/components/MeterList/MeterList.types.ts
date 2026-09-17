import type { MeterWidget } from '@/api/dashboards';
import type { METER_TONES } from '../../DashboardView.constants';

/** How full a meter is, as a severity band. */
export type MeterTone = keyof typeof METER_TONES;

export interface MeterListProps {
  widget: MeterWidget;
  rows: Record<string, unknown>[];
}

export interface MeterFillProps {
  $percent: number;
  $tone: MeterTone;
}
