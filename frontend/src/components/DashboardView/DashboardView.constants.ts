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
  metric: 'Metric',
} as const;

/** Only used when a column asks for no format at all. */
export const TEXT_FORMAT = 'text';
