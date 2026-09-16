import { useMemo } from 'react';
import { ALIGN, DataTable, type DataTableColumn } from '@/components/DataTable';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { formatCell, getPath } from '../../DashboardView.utils';
import { Empty } from './ComparePanel.styles';
import type { ComparePanelProps } from './ComparePanel.types';

interface MetricRow {
  key: string;
  label: string;
  values: string[];
}

/**
 * The transpose of its table: one row per metric, one column per selected row,
 * so two players line up on the same numbers.
 */
export const ComparePanel = ({ widget, table, rows }: ComparePanelProps) => {
  const metrics = widget.metrics ?? table.columns;
  const [first, ...rest] = metrics;

  const metricRows = useMemo<MetricRow[]>(
    () =>
      rest.map((metric) => ({
        key: metric.key,
        label: metric.header,
        values: rows.map(({ data }) =>
          formatCell(getPath(data, metric.path), metric.format),
        ),
      })),
    [rest, rows],
  );

  const columns = useMemo<DataTableColumn<MetricRow>[]>(
    () => [
      {
        key: 'metric',
        header: DASHBOARD_VIEW_COPY.metric,
        align: ALIGN.left,
        sticky: true,
        render: (row) => row.label,
      },
      // Each selected row becomes a column, headed by its first metric —
      // the table's leading column, which is the player's name in practice.
      ...rows.map((row, index) => ({
        key: row.key,
        header: first
          ? formatCell(getPath(row.data, first.path), first.format)
          : row.key,
        align: ALIGN.right,
        render: (metric: MetricRow) => metric.values[index],
      })),
    ],
    [first, rows],
  );

  if (rows.length === 0) {
    return <Empty>{DASHBOARD_VIEW_COPY.comparePrompt}</Empty>;
  }

  return (
    <DataTable
      caption={widget.title}
      columns={columns}
      rows={metricRows}
      getRowKey={(row) => row.key}
      emptyMessage={DASHBOARD_VIEW_COPY.empty}
    />
  );
};
