import { METER_BANDS } from '../../DashboardView.constants';
import type { MeterTone } from './MeterList.types';

/** Severity by how full the meter is — the fill carries state, the grade names it. */
export const meterTone = (percent: number): MeterTone => {
  if (percent >= METER_BANDS.good) return 'good';
  if (percent >= METER_BANDS.fair) return 'fair';
  return 'poor';
};
