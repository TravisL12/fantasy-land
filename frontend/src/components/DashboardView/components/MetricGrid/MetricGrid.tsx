import { useMemo } from 'react';
import { ALIGN, DataTable, type DataTableColumn } from '@/components/DataTable';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { Empty } from '../../DashboardView.styles';
import { bestValue, formatCell, getPath, toNumber } from '../../DashboardView.utils';
import { Winner } from './MetricGrid.styles';
import type { MetricGridProps } from './MetricGrid.types';

interface MetricRow {
  key: string;
  label: string;
  /** Formatted value per entity, plus whether it wins the metric. */
  cells: { text: string; wins: boolean }[];
}

/**
 * The transpose of a table: one row per metric, one column per entity, so two
 * players line up on the same numbers. Both the ticked comparison and the
 * direct head-to-head render through this.
 */
export const MetricGrid = ({
  caption,
  entities,
  metrics,
  emptyMessage,
  highlightWinner,
}: MetricGridProps) => {
  const rows = useMemo<MetricRow[]>(
    () =>
      metrics.map((metric) => {
        const values = entities.map(({ data }) => getPath(data, metric.path));
        const winner = highlightWinner
          ? bestValue(values.map(toNumber), metric.better)
          : undefined;

        return {
          key: metric.key,
          label: metric.header,
          cells: values.map((value) => ({
            text: formatCell(value, metric.format),
            wins: winner !== undefined && toNumber(value) === winner,
          })),
        };
      }),
    [entities, highlightWinner, metrics],
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
      ...entities.map((entity, index) => ({
        key: entity.key,
        header: entity.label,
        align: ALIGN.right,
        render: (row: MetricRow) => {
          const cell = row.cells[index];
          return cell?.wins ? <Winner>{cell.text}</Winner> : cell?.text;
        },
      })),
    ],
    [entities],
  );

  if (entities.length === 0) return <Empty>{emptyMessage}</Empty>;

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.key}
      emptyMessage={DASHBOARD_VIEW_COPY.empty}
    />
  );
};
