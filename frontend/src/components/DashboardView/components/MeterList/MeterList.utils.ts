import { METER_BANDS, METER_TONES } from '../../DashboardView.constants';

/** Severity by how full the meter is — the fill carries state, the grade names it. */
export const meterTone = (percent: number): keyof typeof METER_TONES => {
  if (percent >= METER_BANDS.good) return 'good';
  if (percent >= METER_BANDS.fair) return 'fair';
  return 'poor';
};
