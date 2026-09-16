import { useMemo } from 'react';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { formatCell, getPath } from '../../DashboardView.utils';
import { MetricGrid, type MetricEntity } from '../MetricGrid';
import type { ComparePanelProps } from './ComparePanel.types';

/**
 * The ticked rows of a table, side by side. The table's leading column — the
 * player's name in practice — heads each column, and the rest become the rows.
 */
export const ComparePanel = ({ widget, table, rows }: ComparePanelProps) => {
  const metrics = widget.metrics ?? table.columns;
  const [first, ...rest] = metrics;

  const entities = useMemo<MetricEntity[]>(
    () =>
      rows.map((row) => ({
        key: row.key,
        label: first
          ? formatCell(getPath(row.data, first.path), first.format)
          : row.key,
        data: row.data,
      })),
    [first, rows],
  );

  return (
    <MetricGrid
      caption={widget.title}
      entities={entities}
      metrics={rest}
      emptyMessage={DASHBOARD_VIEW_COPY.comparePrompt}
    />
  );
};
