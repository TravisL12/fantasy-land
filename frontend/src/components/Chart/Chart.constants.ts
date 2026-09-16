export const CHART_KINDS = { line: 'line', bar: 'bar' } as const;

export const CHART_COPY = {
  empty: 'No numbers came back for this chart.',
  showData: 'Show data',
  hideData: 'Hide data',
  dataCaption: (title: string) => `${title} — data`,
  category: 'Category',
} as const;

/** Mark specs from the house data-viz rules, in px. */
export const CHART_SPEC = {
  height: 280,
  /** Bars are capped rather than filling their band — the leftover is air. */
  maxBarWidth: 24,
  /** Plot's own band padding, which the bar inset has to allow for. */
  bandPadding: 0.1,
  /** The surface gap that separates touching marks. */
  gap: 2,
  strokeWidth: 2,
  endDotRadius: 4,
  cornerRadius: 4,
  /** Room for the direct labels that ride the end of each line. */
  labelRoom: 64,
  margin: { top: 16, right: 16, bottom: 36, left: 48 },
} as const;
