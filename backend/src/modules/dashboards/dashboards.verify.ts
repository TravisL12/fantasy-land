import {
  DASHBOARD_MESSAGES,
  ROW_ARRAY_KEYS,
  SPEC_LIMITS,
  WIDGET_TYPES,
} from './dashboards.constants.js';
import type {
  CompareWidget,
  DashboardRun,
  DashboardSpec,
  DashboardWidget,
  SpecReview,
  StatsWidget,
} from './dashboards.types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getPath = (source: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) => (isRecord(value) ? value[key] : undefined),
      source,
    );

/**
 * A field that is present but null reads as missing, because that is how it
 * renders: MLB game rows carry `week: null`, and a chart with week on its x
 * axis plots every game at the same empty category. Checking for undefined
 * alone passed exactly the dashboard this is meant to catch.
 */
const absent = (value: unknown) => value === undefined || value === null;

/**
 * What a stat tile reads: its object first, then the result itself. The numbers
 * a KPI row asks for straddle the two — points and points per game sit at the
 * top of a player result while floor and ceiling sit inside `consistency` — and
 * a widget that could only read one of them sent the model round the loop
 * rewriting a dashboard that was never expressible.
 */
const tileValue = (widget: StatsWidget, data: unknown, path: string): unknown => {
  const scoped = widget.path ? getPath(data, widget.path) : data;
  const value = getPath(scoped, path);
  return absent(value) ? getPath(data, path) : value;
};

const asRows = (value: unknown): Record<string, unknown>[] | undefined => {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : undefined;
};

/**
 * Which key holds the row array. Tools name theirs for what it holds — "rows",
 * "players", "games", "teams", "pitchers" — so a spec that omits rowsPath, or
 * names the wrong one, is pointed at the key that actually works.
 */
export const findRowsKey = (data: unknown): string | undefined => {
  if (!isRecord(data)) return undefined;

  const named = ROW_ARRAY_KEYS.find((key) => Array.isArray(data[key]));
  if (named) return named;

  const arrays = Object.entries(data).filter(
    ([, value]) => Array.isArray(value) && value.some(isRecord),
  );
  return arrays.length === 1 ? arrays[0][0] : undefined;
};

/**
 * The names a row answers to, one level deep: "name", "fantasyPoints",
 * "stats.homeRuns". This is what turns a wrong path into a one-round fix — the
 * model is told what it should have written, not just that it was wrong.
 */
const rowFields = (row: Record<string, unknown>): string[] =>
  Object.entries(row)
    .flatMap(([key, value]) =>
      isRecord(value)
        ? Object.keys(value).map((nested) => `${key}.${nested}`)
        : [key],
    )
    .slice(0, SPEC_LIMITS.reportedFields);

/** One value a widget reads: the field that named it, its path, and from where. */
interface ReadPath {
  key: string;
  path: string;
  /** A chart series may read a source of its own; everything else reads the widget's. */
  source?: string;
  rowsPath?: string;
}

const widgetPaths = (widget: DashboardWidget): ReadPath[] => {
  const columns = (entries: { key: string; path: string }[]) =>
    entries.map(({ key, path }) => ({ key, path }));

  switch (widget.type) {
    case WIDGET_TYPES.table:
      return columns(widget.columns);
    case WIDGET_TYPES.versus:
      return columns(widget.metrics);
    case WIDGET_TYPES.stats:
      return columns(widget.tiles);
    case WIDGET_TYPES.line:
    case WIDGET_TYPES.bar:
      return [
        { key: 'x', path: widget.x.path },
        ...widget.series.map(({ key, path, source, rowsPath }) => ({
          key,
          path,
          source,
          rowsPath,
        })),
      ];
    case WIDGET_TYPES.meter:
      return [{ key: 'valuePath', path: widget.valuePath }];
    case WIDGET_TYPES.badges:
      return [{ key: 'statusPath', path: widget.statusPath }];
    default:
      return [];
  }
};

/** The sources a widget reads: a chart's series may each name their own. */
const sourcesOf = (widget: Exclude<DashboardWidget, CompareWidget>): string[] =>
  widget.type === WIDGET_TYPES.line || widget.type === WIDGET_TYPES.bar
    ? [...new Set(widget.series.map((series) => series.source ?? widget.source))]
    : [widget.source];

/**
 * Checks a spec against the data it will actually render, and repairs what can
 * be repaired. Structure is `parseSpec`'s job; this is the other half — a spec
 * can name every id correctly and still address fields that do not exist, which
 * is the one failure the user sees as "it fetched, but the widget is empty".
 *
 * A wrong rowsPath is corrected in place, because the right key is knowable.
 * A wrong column path is not, so it comes back as a problem the model fixes on
 * the next round, with the field names it should have used.
 */
export const reviewSpec = (spec: DashboardSpec, run: DashboardRun): SpecReview => {
  const problems: string[] = [];
  const notes: string[] = [];

  const widgets = spec.widgets.map((widget): DashboardWidget => {
    // A compare widget renders the rows ticked in a table, not a source.
    if (widget.type === WIDGET_TYPES.compare) return widget;

    const failed = sourcesOf(widget).find((id) => run.results[id]?.error);
    if (failed) {
      notes.push(
        DASHBOARD_MESSAGES.sourceFailed(failed, run.results[failed].error!),
      );
      return widget;
    }

    const data = run.results[widget.source]?.data;

    // Stat tiles read one object rather than a row array.
    if (widget.type === WIDGET_TYPES.stats) {
      const object = widget.path ? getPath(data, widget.path) : data;
      // A path that names nothing is only a fault if the tiles needed it: they
      // may all be reading the result root.
      const missingObject = widget.path && !isRecord(object);
      const unreadable = widgetPaths(widget).filter(({ path }) =>
        absent(tileValue(widget, data, path)),
      );
      if (missingObject && unreadable.length > 0) {
        problems.push(
          DASHBOARD_MESSAGES.badStatsPath(
            widget.id,
            widget.path ?? '',
            isRecord(data) ? Object.keys(data) : [],
          ),
        );
        return widget;
      }
      problems.push(
        ...describeMissing(
          widget.id,
          unreadable,
          [isRecord(object) ? object : isRecord(data) ? data : {}],
        ),
      );
      return widget;
    }

    /** Rows as the client will resolve them, repairing the key where it can. */
    const rowsOf = (sourceId: string, named?: string) => {
      const result = run.results[sourceId]?.data;
      const direct = named ? asRows(getPath(result, named)) : undefined;
      if (direct) return { rows: direct, rowsPath: named };

      const key = findRowsKey(result);
      if (!key) return { rows: asRows(result), rowsPath: named };
      if (named) notes.push(DASHBOARD_MESSAGES.rowsPathFixed(widget.id, named, key));
      return { rows: asRows(getPath(result, key)), rowsPath: key };
    };

    const { rows, rowsPath } = rowsOf(widget.source, widget.rowsPath);

    if (!rows) {
      problems.push(
        DASHBOARD_MESSAGES.noRows(
          widget.id,
          widget.source,
          isRecord(data) ? Object.keys(data) : [],
        ),
      );
      return widget;
    }

    // An empty result is the upstream's answer, not a fault in the spec: a date
    // range with no games in it is a real, and saveable, dashboard.
    if (rows.length === 0) {
      notes.push(DASHBOARD_MESSAGES.emptySource(widget.source));
      return { ...widget, rowsPath };
    }

    // A series reading its own source is checked against that source's rows —
    // two game logs on one chart is the pattern, and flagging it would block a
    // dashboard that renders perfectly.
    const missing = widgetPaths(widget).filter((read) => {
      const target = read.source
        ? rowsOf(read.source, read.rowsPath ?? rowsPath).rows
        : rows;
      return (target ?? rows).every((row) => absent(getPath(row, read.path)));
    });

    problems.push(...describeMissing(widget.id, missing, rows));
    return { ...widget, rowsPath };
  });

  return { spec: { ...spec, widgets }, problems, notes };
};

/** One problem per widget, naming every path that missed and what to use. */
const describeMissing = (
  id: string,
  missing: ReadPath[],
  rows: Record<string, unknown>[],
): string[] =>
  missing.length === 0
    ? []
    : [
        DASHBOARD_MESSAGES.badPaths(
          id,
          missing.map(({ key, path }) => `${key} → "${path}"`),
          rowFields(rows[0]),
        ),
      ];
