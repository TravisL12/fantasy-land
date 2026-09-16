import * as Plot from '@observablehq/plot';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';
import { Button } from '@/components/Button';
import { ALIGN, DataTable, type DataTableColumn } from '@/components/DataTable';
import { CHART_COPY, CHART_KINDS, CHART_SPEC } from './Chart.constants';
import { useElementWidth } from './Chart.hooks';
import { Canvas, Empty, Figure, Legend, LegendItem, LegendKey } from './Chart.styles';
import type { ChartPoint, ChartProps } from './Chart.types';
import {
  barInset,
  categories,
  isNumericAxis,
  seriesColors,
  sortByX,
  toTipRows,
} from './Chart.utils';

const DEFAULT_WIDTH = 640;

/**
 * Line and bar charts drawn with Observable Plot. The two kinds share one data
 * shape — long points plus a series order — so a widget only has to say which
 * mark it wants. Color is assigned by the series' position, never by its rank,
 * and identity is always carried by the legend and direct labels as well as by
 * hue, so the chart survives colorblindness and grayscale.
 */
export const Chart = ({
  kind,
  title,
  points,
  series,
  xLabel,
  yLabel,
  stacked,
  horizontal,
  formatValue = String,
}: ChartProps) => {
  const theme = useTheme();
  const { ref, width } = useElementWidth(DEFAULT_WIDTH);
  const [showData, setShowData] = useState(false);

  const isLine = kind === CHART_KINDS.line;
  const ordered = useMemo(() => (isLine ? sortByX(points) : points), [isLine, points]);
  const colors = useMemo(
    () => seriesColors(series, theme.colors.series),
    [series, theme.colors.series],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || ordered.length === 0) return;

    const { colors: palette, fonts } = theme;
    const tips = toTipRows(ordered, formatValue);
    const grouped = !isLine && !stacked && series.length > 1;
    // Direct labels ride the end of each line, so the plot needs room for them.
    const marginRight =
      CHART_SPEC.margin.right + (isLine ? CHART_SPEC.labelRoom : 0);
    const inset = barInset(
      (horizontal ? CHART_SPEC.height : width) - CHART_SPEC.margin.left - marginRight,
      categories(ordered).length * (grouped ? series.length : 1),
    );

    const color = {
      domain: series,
      range: colors,
      legend: false,
    };

    const valueAxis = { label: yLabel ?? null, tickFormat: formatValue, grid: true };
    // A numeric game log gets a real number line; a categorical line chart gets
    // point positions, and bars need bands to sit in.
    const categoryType = isLine
      ? isNumericAxis(ordered)
        ? undefined
        : ('point' as const)
      : ('band' as const);
    const categoryAxis = { label: xLabel ?? null, type: categoryType };

    // Grouped bars facet by category and sit side by side inside each facet;
    // stacked and single-series bars sit on the category itself.
    const bars = horizontal
      ? Plot.barX(ordered, {
          y: grouped ? 'series' : 'x',
          x: 'y',
          fy: grouped ? 'x' : undefined,
          fill: 'series',
          rx2: CHART_SPEC.cornerRadius,
          insetRight: stacked ? CHART_SPEC.gap : 0,
          insetTop: inset,
          insetBottom: inset,
          tip: true,
        })
      : Plot.barY(ordered, {
          x: grouped ? 'series' : 'x',
          y: 'y',
          fx: grouped ? 'x' : undefined,
          fill: 'series',
          ry2: CHART_SPEC.cornerRadius,
          insetTop: stacked ? CHART_SPEC.gap : 0,
          insetLeft: inset,
          insetRight: inset,
          tip: true,
        });

    const marks = isLine
      ? [
          Plot.line(ordered, {
            x: 'x',
            y: 'y',
            stroke: 'series',
            strokeWidth: CHART_SPEC.strokeWidth,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
          }),
          // The end dot carries a surface ring so it stays legible where lines cross.
          Plot.dot(
            ordered,
            Plot.selectLast({
              x: 'x',
              y: 'y',
              z: 'series',
              fill: 'series',
              r: CHART_SPEC.endDotRadius,
              stroke: palette.surface,
              strokeWidth: CHART_SPEC.gap,
            }),
          ),
          Plot.text(
            ordered,
            Plot.selectLast({
              x: 'x',
              y: 'y',
              z: 'series',
              text: 'series',
              // Text wears an ink token; the colored dot beside it carries identity.
              fill: palette.textMuted,
              textAnchor: 'start',
              dx: 10,
            }),
          ),
          // The crosshair finds the x, and one tip lists every series there.
          Plot.ruleX(tips, Plot.pointerX({ x: 'x', stroke: palette.textMuted })),
          Plot.tip(
            tips,
            Plot.pointerX({ x: 'x', y: 'y', title: 'text', anchor: 'bottom' }),
          ),
        ]
      : [Plot.ruleY([0], { stroke: palette.grid }), bars];

    const plot = Plot.plot({
      width,
      height: CHART_SPEC.height,
      marginTop: CHART_SPEC.margin.top,
      marginRight,
      marginBottom: CHART_SPEC.margin.bottom,
      marginLeft: CHART_SPEC.margin.left,
      style: {
        background: 'transparent',
        color: palette.textMuted,
        fontFamily: fonts.body,
        fontSize: '12px',
      },
      color,
      x: horizontal ? valueAxis : categoryAxis,
      y: horizontal ? categoryAxis : valueAxis,
      fx: { label: null },
      fy: { label: null },
      marks,
    });

    // Gridlines are chrome: recessive, hairline, solid — but Plot's default
    // grid is drawn at a tenth opacity, which on this surface is nothing at all.
    plot.querySelectorAll<SVGLineElement>('[aria-label*="grid"] line').forEach((line) => {
      line.setAttribute('stroke', palette.grid);
      line.setAttribute('stroke-opacity', '1');
    });

    element.replaceChildren(plot);
    return () => plot.remove();
  }, [
    colors,
    formatValue,
    horizontal,
    isLine,
    ordered,
    ref,
    series,
    stacked,
    theme,
    width,
    xLabel,
    yLabel,
  ]);

  const dataColumns = useMemo<DataTableColumn<ChartPoint>[]>(
    () => [
      {
        key: 'x',
        header: xLabel ?? CHART_COPY.category,
        align: ALIGN.left,
        render: (point) => String(point.x),
      },
      {
        key: 'series',
        header: CHART_COPY.category,
        align: ALIGN.left,
        render: (point) => point.series,
      },
      {
        key: 'y',
        header: yLabel ?? '',
        align: ALIGN.right,
        render: (point) => formatValue(point.y),
      },
    ],
    [formatValue, xLabel, yLabel],
  );

  if (points.length === 0) return <Empty>{CHART_COPY.empty}</Empty>;

  return (
    <Figure>
      <Canvas ref={ref} role="img" aria-label={title} />

      {/* A legend is the dependable identity channel — never color alone. */}
      {series.length > 1 && (
        <Legend>
          {series.map((label, index) => (
            <LegendItem key={label}>
              <LegendKey $color={colors[index]} $line={isLine} aria-hidden />
              {label}
            </LegendItem>
          ))}
        </Legend>
      )}

      <div>
        <Button onClick={() => setShowData((shown) => !shown)}>
          {showData ? CHART_COPY.hideData : CHART_COPY.showData}
        </Button>
      </div>

      {/* Every value the chart encodes stays reachable without hovering. */}
      {showData && (
        <DataTable
          caption={CHART_COPY.dataCaption(title)}
          columns={dataColumns}
          rows={ordered}
          getRowKey={(point, index) => `${point.series}-${point.x}-${index}`}
          emptyMessage={CHART_COPY.empty}
        />
      )}
    </Figure>
  );
};
