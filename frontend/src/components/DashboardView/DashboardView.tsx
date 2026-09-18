import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_VERSUS_ROWS_PATH,
  WIDGET_TYPES,
  type DashboardWidget,
  type StatsWidget,
  type TableWidget,
} from '@/api/dashboards';
import { Button } from '@/components/Button';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { BadgeList } from './components/BadgeList';
import { ComparePanel } from './components/ComparePanel';
import { DashboardTable } from './components/DashboardTable';
import { MeterList } from './components/MeterList';
import { StatTiles } from './components/StatTiles';
import { VersusPanel } from './components/VersusPanel';
import { WidgetChart } from './components/WidgetChart';
import { DASHBOARD_VIEW_COPY } from './DashboardView.constants';
import { useDashboardRun } from './DashboardView.hooks';
import {
  Description,
  Grid,
  Shell,
  Toolbar,
  Updated,
  Widget,
  WidgetTitle,
} from './DashboardView.styles';
import type { DashboardViewProps, Selection } from './DashboardView.types';
import {
  blankReason,
  getPath,
  resolveTableRows,
  tableWidgets,
  widgetRows,
  widgetSources,
} from './DashboardView.utils';

/**
 * Renders a spec against freshly fetched data. Everything interactive — sorting,
 * ticking rows, comparing — happens here in the browser, so a dashboard only
 * goes back to the API when it is opened or refreshed.
 */
export const DashboardView = ({ spec, actions, sample }: DashboardViewProps) => {
  const { run, isFetching, error, refresh } = useDashboardRun(spec, sample);
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

  /** One failed source is reported in place; the rest of the dashboard still renders. */
  const failure = (widget: DashboardWidget): string | undefined =>
    widgetSources(widget)
      .map((source) => {
        const message = run?.results[source]?.error;
        return message
          ? `${DASHBOARD_VIEW_COPY.sourceFailed(source)}: ${message}`
          : undefined;
      })
      .find(Boolean);

  /**
   * A widget whose data came back but whose every path misses says so. Rendering
   * it anyway would draw a full grid of dashes, which reads as a broken feature
   * rather than as a spec pointed at the wrong fields.
   */
  /** A stats widget's tiles read its object and the result behind it. */
  const statsData = (widget: StatsWidget): Record<string, unknown> => {
    const data = run?.results[widget.source]?.data;
    const scoped = widget.path ? getPath(data, widget.path) : data;
    return {
      ...(data as Record<string, unknown>),
      ...(scoped as Record<string, unknown>),
    };
  };

  const blank = (widget: DashboardWidget): string | undefined => {
    if (widget.type === WIDGET_TYPES.compare) return undefined;
    const rows =
      widget.type === WIDGET_TYPES.table
        ? (rowsByTable[widget.id] ?? []).map(({ data }) => data)
        : widget.type === WIDGET_TYPES.stats
          ? [statsData(widget)]
          : widgetRows(run, widget.source, widget.rowsPath);

    const reason = blankReason(widget, rows as Record<string, unknown>[]);
    return reason && DASHBOARD_VIEW_COPY.noMatch(reason.paths, reason.fields);
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case WIDGET_TYPES.table:
        return (
          <DashboardTable
            widget={widget}
            rows={rowsByTable[widget.id] ?? []}
            selected={widget.selectable ? (selection[widget.id] ?? []) : undefined}
            onToggle={widget.selectable ? (key) => toggle(widget.id, key) : undefined}
            onClear={() => clear(widget.id)}
            isFetching={isFetching}
          />
        );

      case WIDGET_TYPES.compare: {
        const table = tables.find((candidate) => candidate.id === widget.from);
        return table ? (
          <ComparePanel widget={widget} table={table} rows={selectedRows(table)} />
        ) : null;
      }

      case WIDGET_TYPES.versus:
        return (
          <VersusPanel
            widget={widget}
            rows={widgetRows(
              run,
              widget.source,
              widget.rowsPath ?? DEFAULT_VERSUS_ROWS_PATH,
            )}
          />
        );

      case WIDGET_TYPES.line:
      case WIDGET_TYPES.bar:
        return <WidgetChart widget={widget} run={run} />;

      case WIDGET_TYPES.stats: {
        const data = run?.results[widget.source]?.data;
        return (
          <StatTiles
            widget={widget}
            data={widget.path ? getPath(data, widget.path) : data}
            result={data}
          />
        );
      }

      case WIDGET_TYPES.meter:
        return (
          <MeterList
            widget={widget}
            rows={widgetRows(run, widget.source, widget.rowsPath)}
          />
        );

      case WIDGET_TYPES.badges:
        return (
          <BadgeList
            widget={widget}
            rows={widgetRows(run, widget.source, widget.rowsPath)}
          />
        );
    }
  };

  return (
    <Shell>
      {spec.description && <Description>{spec.description}</Description>}

      {/* Sample data has nothing to re-fetch, so it gets no refresh control. */}
      {(!sample || actions) && (
        <Toolbar>
          {!sample && (
            <>
              <Button onClick={refresh} disabled={isFetching}>
                {isFetching
                  ? DASHBOARD_VIEW_COPY.refreshing
                  : DASHBOARD_VIEW_COPY.refresh}
              </Button>
              {run && (
                <Updated>
                  {DASHBOARD_VIEW_COPY.updated(
                    new Date(run.ranAt).toLocaleTimeString(),
                  )}
                </Updated>
              )}
            </>
          )}
          {actions}
        </Toolbar>
      )}

      {error && (
        <StatusMessage variant={STATUS_VARIANTS.error}>{error}</StatusMessage>
      )}

      <Grid>
        {spec.widgets.map((widget) => {
          const failed = failure(widget);
          const empty = failed ? undefined : blank(widget);
          return (
            <Widget key={widget.id} $width={widget.width}>
              <WidgetTitle>{widget.title}</WidgetTitle>
              {failed ? (
                <StatusMessage variant={STATUS_VARIANTS.error}>{failed}</StatusMessage>
              ) : empty ? (
                <StatusMessage>{empty}</StatusMessage>
              ) : (
                renderWidget(widget)
              )}
            </Widget>
          );
        })}
      </Grid>
    </Shell>
  );
};
