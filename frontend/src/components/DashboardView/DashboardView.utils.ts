import {
  BETTER_DIRECTIONS,
  DEFAULT_ROWS_PATH,
  DEFAULT_ROW_KEY,
  WIDGET_TYPES,
  type BetterDirection,
  type CellFormat,
  type ChartWidget,
  type DashboardRun,
  type DashboardWidget,
  type DashboardSpec,
  type TableWidget,
} from '@/api/dashboards';
import type { ChartPoint } from '@/components/Chart';
import type { StatFormat } from '@/api/sports';
import { EMPTY_STAT, formatStat } from '@/utils';
import {
  DEFAULT_STATUS_TONE,
  STATUS_TONES,
  TEXT_FORMAT,
} from './DashboardView.constants';
import type { DashboardRow, StatusTone, TableRows } from './DashboardView.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads "stats.hr" out of a row. Widgets address data by path, never by index. */
export const getPath = (source: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        isRecord(value) ? value[key] : Array.isArray(value) ? value[Number(key)] : undefined,
      source,
    );

export const formatCell = (value: unknown, format?: CellFormat): string => {
  if (value === undefined || value === null || value === '') return EMPTY_STAT;
  if (!format || format === TEXT_FORMAT) {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }

  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? formatStat(numeric, format as StatFormat)
    : String(value);
};

/**
 * Tool results are mostly `{ rows: [...] }`, but a per-player tool answers with
 * a single object — showing that as a one-row table beats showing nothing.
 */
export const resolveRows = (
  data: unknown,
  rowsPath = DEFAULT_ROWS_PATH,
): Record<string, unknown>[] => {
  const found = getPath(data, rowsPath) ?? data;
  if (Array.isArray(found)) return found.filter(isRecord);
  return isRecord(found) ? [found] : [];
};

/** A widget's own row cap; an uncapped widget keeps everything the source returned. */
export const limitRows = <TRow,>(rows: TRow[], limit?: number): TRow[] =>
  limit ? rows.slice(0, limit) : rows;

export const toRows = (
  raw: Record<string, unknown>[],
  widget: TableWidget,
): DashboardRow[] => {
  const rows = raw.map((data, index) => ({
    key: String(getPath(data, widget.rowKey ?? DEFAULT_ROW_KEY) ?? index),
    data,
  }));
  return limitRows(rows, widget.limit);
};

export const tableWidgets = (spec: DashboardSpec): TableWidget[] =>
  spec.widgets.filter(
    (widget): widget is TableWidget => widget.type === WIDGET_TYPES.table,
  );

export const resolveTableRows = (
  spec: DashboardSpec,
  run?: DashboardRun,
): TableRows =>
  Object.fromEntries(
    tableWidgets(spec).map((widget) => [
      widget.id,
      toRows(
        resolveRows(run?.results[widget.source]?.data, widget.rowsPath),
        widget,
      ),
    ]),
  );

/** Values sort numerically when they are numbers, and alphabetically otherwise. */
export const compareValues = (a: unknown, b: unknown): number => {
  const [left, right] = [Number(a), Number(b)];
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  return String(a ?? '').localeCompare(String(b ?? ''));
};

/**
 * A number, or nothing. Number(null) and Number('') are both 0, so a missing
 * stat would otherwise be plotted as a real zero — a game the player didn't
 * play reading as a game they scored nothing in.
 */
export const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

/** The raw rows behind any sourced widget, before a widget's own shaping. */
export const widgetRows = (
  run: DashboardRun | undefined,
  source: string,
  rowsPath?: string,
): Record<string, unknown>[] =>
  resolveRows(run?.results[source]?.data, rowsPath);

/**
 * A chart's points, in the long shape Plot wants. Each series may read its own
 * source, which is how two players' game logs end up on one pair of axes.
 */
export const chartPoints = (
  widget: ChartWidget,
  run?: DashboardRun,
): ChartPoint[] =>
  widget.series.flatMap((series) => {
    const rows = widgetRows(
      run,
      series.source ?? widget.source,
      series.rowsPath ?? widget.rowsPath,
    );
    // A trend keeps its most recent games; a ranking keeps its top rows.
    const limited = widget.limit
      ? widget.type === WIDGET_TYPES.line
        ? rows.slice(-widget.limit)
        : rows.slice(0, widget.limit)
      : rows;

    return limited.flatMap((row) => {
      const y = toNumber(getPath(row, series.path));
      if (y === undefined) return [];
      const x = getPath(row, widget.x.path);
      return [
        {
          x: typeof x === 'number' ? x : String(x ?? ''),
          y,
          series: series.label,
        } satisfies ChartPoint,
      ];
    });
  });

/**
 * Every source a widget reads. A chart may span several, and a compare widget
 * reads none of its own — it lives off the table it points at.
 */
export const widgetSources = (widget: DashboardWidget): string[] => {
  if (widget.type === WIDGET_TYPES.compare) return [];
  if (widget.type === WIDGET_TYPES.line || widget.type === WIDGET_TYPES.bar) {
    return [
      ...new Set([
        widget.source,
        ...widget.series.map((series) => series.source ?? widget.source),
      ]),
    ];
  }
  return [widget.source];
};

/**
 * Which of the compared values wins a metric. Returns the winning value, or
 * nothing when the metric is text or every entity ties — a tie highlighted as a
 * win reads as a result that isn't there.
 */
export const bestValue = (
  values: (number | undefined)[],
  better: BetterDirection = BETTER_DIRECTIONS.higher,
): number | undefined => {
  const numbers = values.filter((value): value is number => value !== undefined);
  if (numbers.length < 2) return undefined;

  const best =
    better === BETTER_DIRECTIONS.lower
      ? Math.min(...numbers)
      : Math.max(...numbers);
  return numbers.every((value) => value === best) ? undefined : best;
};

/**
 * Maps a league's own wording onto our reserved status colors. An unrecognised
 * status stays neutral — a guessed severity is worse than no severity.
 */
export const statusTone = (status: string): StatusTone => {
  const text = status.toLowerCase();
  const match = Object.entries(STATUS_TONES).find(([, words]) =>
    words.some((word) => text.includes(word)),
  );
  return (match?.[0] as StatusTone) ?? DEFAULT_STATUS_TONE;
};
