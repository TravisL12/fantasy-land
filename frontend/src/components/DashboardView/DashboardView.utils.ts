import {
  DEFAULT_ROWS_PATH,
  DEFAULT_ROW_KEY,
  WIDGET_TYPES,
  type CellFormat,
  type DashboardRun,
  type DashboardSpec,
  type TableWidget,
} from '@/api/dashboards';
import type { StatFormat } from '@/api/sports';
import { EMPTY_STAT, formatStat } from '@/utils';
import { TEXT_FORMAT } from './DashboardView.constants';
import type { DashboardRow, TableRows } from './DashboardView.types';

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

export const toRows = (
  raw: Record<string, unknown>[],
  widget: TableWidget,
): DashboardRow[] => {
  const rows = raw.map((data, index) => ({
    key: String(getPath(data, widget.rowKey ?? DEFAULT_ROW_KEY) ?? index),
    data,
  }));
  return widget.limit ? rows.slice(0, widget.limit) : rows;
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
