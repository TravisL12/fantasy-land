export const DASHBOARD_VIEW_COPY = {
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  updated: (time: string) => `Updated ${time}`,
  empty: 'No rows came back for this widget.',
  sourceFailed: (source: string) => `Source "${source}" failed`,
  missingSource: (source: string) => `Source "${source}" has not been run yet.`,
  selected: (count: number) => `${count} selected`,
  clear: 'Clear',
  selectRow: 'Select row',
  pick: 'Pick',
  comparePrompt: 'Tick rows in the table above to compare them here.',
  versusEmpty: 'This source returned nothing to compare.',
  metric: 'Metric',
} as const;

/** Only used when a column asks for no format at all. */
export const TEXT_FORMAT = 'text';

/** Charts plot numbers, so an unformatted series still reads as one. */
export const DEFAULT_CHART_FORMAT = 'decimal';

/**
 * Matches the Chart's own height. It is repeated rather than imported because
 * importing it would pull the chart bundle back into the initial load.
 */
export const CHART_PLACEHOLDER_HEIGHT = '280px';

/** Where a meter's fill changes severity, as a percentage of its maximum. */
export const METER_BANDS = { good: 66, fair: 33 } as const;

/** Meter bands map onto the reserved status colors, never onto series hues. */
export const METER_TONES = {
  good: 'good',
  fair: 'warning',
  poor: 'critical',
} as const;

/**
 * League wording varies per sport, so statuses are matched on the words that
 * actually come back from the availability and form engines. Anything unknown
 * stays neutral rather than being guessed into a severity.
 */
export const STATUS_TONES = {
  good: ['active', 'available', 'healthy', 'hot', 'confirmed'],
  warning: ['questionable', 'day-to-day', 'projected', 'minors', 'steady'],
  serious: ['doubtful', 'cold', 'limited'],
  critical: ['out', 'injured', 'inactive', 'suspended', 'il'],
} as const;
