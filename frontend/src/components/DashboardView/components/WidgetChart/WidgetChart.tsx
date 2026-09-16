import { Suspense, lazy, useCallback, useMemo } from 'react';
import { DEFAULT_CHART_FORMAT } from '../../DashboardView.constants';
import { chartPoints, formatCell } from '../../DashboardView.utils';
import { Placeholder } from './WidgetChart.styles';
import type { WidgetChartProps } from './WidgetChart.types';

/**
 * Plot pulls in d3, which is most of a megabyte before compression — far too
 * much to spend on every page load for a feature only a dashboard with a chart
 * in it uses.
 */
const Chart = lazy(() =>
  import('@/components/Chart').then(({ Chart: chart }) => ({ default: chart })),
);

/**
 * Turns a chart widget and the current run into the long points the Chart
 * component draws. Series keep their spec order, so a color follows the player
 * rather than their rank on the day.
 */
export const WidgetChart = ({ widget, run }: WidgetChartProps) => {
  const points = useMemo(() => chartPoints(widget, run), [run, widget]);
  const series = useMemo(
    () => widget.series.map(({ label }) => label),
    [widget.series],
  );

  // Every series on one axis shares a format; the first series names it.
  const format = widget.series[0]?.format ?? DEFAULT_CHART_FORMAT;
  const formatValue = useCallback(
    (value: number) => formatCell(value, format),
    [format],
  );

  return (
    <Suspense fallback={<Placeholder />}>
      {/* The widget kinds and the chart kinds are the same two words. */}
      <Chart
        kind={widget.type}
        title={widget.title}
        points={points}
        series={series}
        xLabel={widget.x.label}
        yLabel={widget.series[0]?.label}
        stacked={widget.stacked}
        horizontal={widget.horizontal}
        formatValue={formatValue}
      />
    </Suspense>
  );
};
