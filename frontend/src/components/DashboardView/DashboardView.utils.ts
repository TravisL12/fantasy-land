import {
  BETTER_DIRECTIONS,
  DEFAULT_ROW_KEY,
  ROW_ARRAY_KEYS,
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

/**
 * A value that is present but null counts as missing: MLB game rows carry
 * `week: null`, and treating that as a real value plots every game at the same
 * empty category.
 */
const absent = (value: unknown) => value === undefined || value === null;

/** A stat tile reads its own object first, then the result it came from. */
export const tileValue = (
  data: unknown,
  result: unknown,
  path: string,
): unknown => {
  const value = getPath(data, path);
  return absent(value) ? getPath(result, path) : value;
};

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

const asRows = (value: unknown): Record<string, unknown>[] | undefined => {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : undefined;
};

/**
 * The row array in a result, when the spec did not name one. Tools name their
 * array for what it holds, so a widget that omitted rowsPath used to resolve
 * nothing and fall back to rendering the envelope object as a single empty row.
 * The conventional names are tried first, then any lone array of objects.
 */
export const findRows = (
  data: unknown,
): Record<string, unknown>[] | undefined => {
  if (!isRecord(data)) return asRows(data);

  const named = ROW_ARRAY_KEYS.map((key) => data[key]).find(Array.isArray);
  if (named) return asRows(named);

  const arrays = Object.values(data).filter(
    (value): value is unknown[] => Array.isArray(value) && value.some(isRecord),
  );
  return arrays.length === 1 ? asRows(arrays[0]) : undefined;
};

/**
 * Tool results are mostly `{ rows: [...] }`, but a per-player tool answers with
 * a single object — showing that as a one-row table beats showing nothing.
 *
 * A rowsPath that resolves to nothing falls back to the same search rather than
 * to the whole result: a spec naming the wrong key should still show the data
 * it was pointed at, not one row of dashes.
 */
export const resolveRows = (
  data: unknown,
  rowsPath?: string,
): Record<string, unknown>[] => {
  const named = rowsPath ? asRows(getPath(data, rowsPath)) : undefined;
  return named ?? findRows(data) ?? asRows(data) ?? [];
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

/** Every path a widget reads out of one row, with the field that asked for it. */
export const widgetPaths = (widget: DashboardWidget): [string, string][] => {
  const columns =
    widget.type === WIDGET_TYPES.table
      ? widget.columns
      : widget.type === WIDGET_TYPES.versus
        ? widget.metrics
        : widget.type === WIDGET_TYPES.stats
          ? widget.tiles
          : (widget.type === WIDGET_TYPES.compare && widget.metrics) || [];

  const paths: [string, string][] = columns.map(({ key, path }) => [key, path]);

  if (widget.type === WIDGET_TYPES.line || widget.type === WIDGET_TYPES.bar) {
    paths.push(...widget.series.map(({ key, path }): [string, string] => [key, path]));
  }
  if (widget.type === WIDGET_TYPES.meter) paths.push(['value', widget.valuePath]);
  if (widget.type === WIDGET_TYPES.badges) paths.push(['status', widget.statusPath]);

  return paths;
};

/**
 * Why a widget that has rows still renders nothing: every path it addresses is
 * missing from every row. A grid of dashes looks like a broken feature, so the
 * widget says which fields it looked for and what the rows actually carry — the
 * same reasoning as the chatty spec validation, pointed at the person instead.
 */
export const blankReason = (
  widget: DashboardWidget,
  rows: Record<string, unknown>[],
): { paths: string[]; fields: string[] } | undefined => {
  const paths = widgetPaths(widget);
  if (rows.length === 0 || paths.length === 0) return undefined;

  const missing = paths.filter(([, path]) =>
    rows.every((row) => absent(getPath(row, path))),
  );
  if (missing.length < paths.length) return undefined;

  return {
    paths: missing.map(([, path]) => path),
    fields: Object.keys(rows[0] ?? {}),
  };
};

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
