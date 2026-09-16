import { useMemo } from 'react';
import { DEFAULT_LABEL_PATH } from '@/api/dashboards';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { formatCell, getPath } from '../../DashboardView.utils';
import { MetricGrid, type MetricEntity } from '../MetricGrid';
import type { VersusPanelProps } from './VersusPanel.types';

/**
 * A direct head-to-head: the entities come straight from the source, which is
 * what compare_players and compare_teams already return, so nothing has to be
 * ticked first. The better value on each metric is marked.
 */
export const VersusPanel = ({ widget, rows }: VersusPanelProps) => {
  const entities = useMemo<MetricEntity[]>(
    () =>
      rows.map((data, index) => ({
        key: String(
          getPath(data, widget.labelPath ?? DEFAULT_LABEL_PATH) ?? index,
        ),
        label: formatCell(
          getPath(data, widget.labelPath ?? DEFAULT_LABEL_PATH) ?? index + 1,
        ),
        data,
      })),
    [rows, widget.labelPath],
  );

  return (
    <MetricGrid
      caption={widget.title}
      entities={entities}
      metrics={widget.metrics}
      emptyMessage={DASHBOARD_VIEW_COPY.versusEmpty}
      highlightWinner
    />
  );
};
