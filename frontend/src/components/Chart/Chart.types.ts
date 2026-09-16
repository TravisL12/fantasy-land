import type { CHART_KINDS } from './Chart.constants';

export type ChartKind = (typeof CHART_KINDS)[keyof typeof CHART_KINDS];

/** Long format: one point per series per x, which is what Plot's marks want. */
export interface ChartPoint {
  x: string | number;
  y: number;
  series: string;
}

export interface ChartProps {
  kind: ChartKind;
  /** Used as the figure's accessible caption. */
  title: string;
  points: ChartPoint[];
  /** Series labels in palette order — the color of a series never depends on rank. */
  series: string[];
  xLabel?: string;
  yLabel?: string;
  /** bar only: stack the series rather than grouping them. */
  stacked?: boolean;
  /** bar only: run the bars along the x axis, for long category names. */
  horizontal?: boolean;
  formatValue?: (value: number) => string;
}
