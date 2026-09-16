import { useCallback, useMemo, useState } from 'react';
import { WIDGET_TYPES, type TableWidget } from '@/api/dashboards';
import { Button } from '@/components/Button';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { ComparePanel } from './components/ComparePanel';
import { DashboardTable } from './components/DashboardTable';
import { DASHBOARD_VIEW_COPY } from './DashboardView.constants';
import { useDashboardRun } from './DashboardView.hooks';
import {
  Description,
  Shell,
  Toolbar,
  Updated,
  Widget,
  WidgetTitle,
} from './DashboardView.styles';
import type { DashboardViewProps, Selection } from './DashboardView.types';
import { resolveTableRows, tableWidgets } from './DashboardView.utils';

/**
 * Renders a spec against freshly fetched data. Everything interactive — sorting,
 * ticking rows, comparing — happens here in the browser, so a dashboard only
 * goes back to the API when it is opened or refreshed.
 */
export const DashboardView = ({ spec, actions }: DashboardViewProps) => {
  const { run, isFetching, error, refresh } = useDashboardRun(spec);
  const [selection, setSelection] = useState<Selection>({});

  const rowsByTable = useMemo(() => resolveTableRows(spec, run), [spec, run]);
  const tables = useMemo(() => tableWidgets(spec), [spec]);

  const toggle = useCallback((widgetId: string, key: string) => {
    setSelection((previous) => {
      const current = previous[widgetId] ?? [];
      return {
        ...previous,
        [widgetId]: current.includes(key)
          ? current.filter((selected) => selected !== key)
          : [...current, key],
      };
    });
  }, []);

  const clear = useCallback(
    (widgetId: string) =>
      setSelection((previous) => ({ ...previous, [widgetId]: [] })),
    [],
  );

  const selectedRows = (table: TableWidget) => {
    const keys = selection[table.id] ?? [];
    return (rowsByTable[table.id] ?? []).filter((row) => keys.includes(row.key));
  };

  return (
    <Shell>
      {spec.description && <Description>{spec.description}</Description>}

      <Toolbar>
        <Button onClick={refresh} disabled={isFetching}>
          {isFetching ? DASHBOARD_VIEW_COPY.refreshing : DASHBOARD_VIEW_COPY.refresh}
        </Button>
        {run && (
          <Updated>
            {DASHBOARD_VIEW_COPY.updated(
              new Date(run.ranAt).toLocaleTimeString(),
            )}
          </Updated>
        )}
        {actions}
      </Toolbar>

      {error && (
        <StatusMessage variant={STATUS_VARIANTS.error}>{error}</StatusMessage>
      )}

      {spec.widgets.map((widget) => {
        if (widget.type === WIDGET_TYPES.table) {
          const failure = run?.results[widget.source]?.error;
          return (
            <Widget key={widget.id}>
              <WidgetTitle>{widget.title}</WidgetTitle>
              {failure ? (
                <StatusMessage variant={STATUS_VARIANTS.error}>
                  {`${DASHBOARD_VIEW_COPY.sourceFailed(widget.source)}: ${failure}`}
                </StatusMessage>
              ) : (
                <DashboardTable
                  widget={widget}
                  rows={rowsByTable[widget.id] ?? []}
                  selected={widget.selectable ? (selection[widget.id] ?? []) : undefined}
                  onToggle={
                    widget.selectable
                      ? (key) => toggle(widget.id, key)
                      : undefined
                  }
                  onClear={() => clear(widget.id)}
                  isFetching={isFetching}
                />
              )}
            </Widget>
          );
        }

        const table = tables.find((candidate) => candidate.id === widget.from);
        if (!table) return null;

        return (
          <Widget key={widget.id}>
            <WidgetTitle>{widget.title}</WidgetTitle>
            <ComparePanel
              widget={widget}
              table={table}
              rows={selectedRows(table)}
            />
          </Widget>
        );
      })}
    </Shell>
  );
};
