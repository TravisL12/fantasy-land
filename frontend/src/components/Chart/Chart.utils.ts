import { CHART_SPEC } from './Chart.constants';
import type { ChartPoint } from './Chart.types';

/** One tooltip row per x, listing every series at that x. */
export interface TipRow {
  x: ChartPoint['x'];
  y: number;
  text: string;
}

export const isNumericAxis = (points: ChartPoint[]): boolean =>
  points.length > 0 &&
  points.every(({ x }) => typeof x === 'number' && Number.isFinite(x));

/** Lines must be drawn in x order, whatever order the rows arrived in. */
export const sortByX = (points: ChartPoint[]): ChartPoint[] =>
  isNumericAxis(points)
    ? [...points].sort((a, b) => Number(a.x) - Number(b.x))
    : points;

export const categories = (points: ChartPoint[]): ChartPoint['x'][] => [
  ...new Set(points.map(({ x }) => x)),
];

/**
 * The reader never has to land on a line: every series at the hovered x goes
 * into one tip, value first, series name second.
 */
export const toTipRows = (
  points: ChartPoint[],
  format: (value: number) => string,
): TipRow[] =>
  categories(points).map((x) => {
    const here = points.filter((point) => point.x === x);
    return {
      x,
      y: Math.max(...here.map(({ y }) => y)),
      text: [
        String(x),
        ...here.map(({ series, y }) => `${format(y)}  ${series}`),
      ].join('\n'),
    };
  });

/**
 * Bars are capped at the spec's thickness rather than filling their band, so a
 * chart of three teams doesn't render three slabs. The band scale has already
 * taken its own padding out, so the inset is measured against what is left —
 * insetting the whole band would leave a hairline.
 */
export const barInset = (span: number, bands: number): number => {
  if (bands <= 0) return 0;
  const band = (span / bands) * (1 - CHART_SPEC.bandPadding);
  return Math.max(0, (band - CHART_SPEC.maxBarWidth) / 2);
};

/** Colors follow the series' position in the spec, never its rank in the data. */
export const seriesColors = (series: string[], palette: readonly string[]): string[] =>
  series.map((_, index) => palette[index % palette.length]);
