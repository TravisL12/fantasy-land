import { BadRequestException } from '@nestjs/common';
import { asNumber, asString } from '../tools/tools.utils.js';
import {
  BETTER_DIRECTIONS,
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  DASHBOARD_MESSAGES,
  SORT_ORDERS,
  SPEC_LIMITS,
  WIDGET_TYPES,
  WIDGET_WIDTHS,
} from './dashboards.constants.js';
import type {
  BadgesWidget,
  BetterDirection,
  CellAlign,
  CellFormat,
  ChartSeries,
  ChartWidget,
  CompareWidget,
  DashboardColumn,
  DashboardSource,
  DashboardSpec,
  DashboardWidget,
  MeterWidget,
  SortOrder,
  StatsWidget,
  TableWidget,
  VersusWidget,
  WidgetType,
  WidgetWidth,
} from './dashboards.types.js';

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown, what: string): Record<string, unknown> => {
  // Small models hand back a whole object as a JSON string.
  const parsed = typeof value === 'string' ? tryParse(value) : value;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(`${what} must be an object.`);
  }
  return parsed as Record<string, unknown>;
};

const asArray = (value: unknown, what: string): unknown[] => {
  const parsed = typeof value === 'string' ? tryParse(value) : value;
  if (!Array.isArray(parsed)) fail(`${what} must be an array.`);
  return parsed as unknown[];
};

const tryParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const requiredText = (value: unknown, what: string, max: number): string => {
  const text = asString(value)?.trim();
  if (!text) fail(`${what} is required.`);
  return text!.slice(0, max);
};

const optionalText = (value: unknown): string | undefined =>
  asString(value)?.trim() || undefined;

const oneOf = <T extends string>(
  value: unknown,
  allowed: Record<string, T>,
  what: string,
): T | undefined => {
  const text = asString(value)?.trim();
  if (!text) return undefined;
  if (!(text in allowed)) {
    fail(`${what} must be one of: ${Object.values(allowed).join(', ')}.`);
  }
  return allowed[text];
};

const unique = (ids: string[], what: string) => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(`Duplicate ${what} "${id}" — ids must be unique.`);
    seen.add(id);
  }
};

const toColumn = (raw: unknown, where: string): DashboardColumn => {
  const column = asRecord(raw, `Each column in ${where}`);
  const key = requiredText(column.key, `"key" in ${where}`, SPEC_LIMITS.title);
  return {
    key,
    header: requiredText(
      column.header ?? key,
      `"header" in ${where}`,
      SPEC_LIMITS.title,
    ),
    // A column with no path reads the row field named after its key.
    path: optionalText(column.path) ?? key,
    format: oneOf<CellFormat>(column.format, CELL_FORMATS, '"format"'),
    align: oneOf<CellAlign>(column.align, CELL_ALIGNMENTS, '"align"'),
    sortable: column.sortable === undefined ? true : Boolean(column.sortable),
    highlight: Boolean(column.highlight),
    better: oneOf<BetterDirection>(column.better, BETTER_DIRECTIONS, '"better"'),
  };
};

const toColumns = (
  raw: unknown,
  where: string,
  field = 'columns',
  limit: number = SPEC_LIMITS.columns,
): DashboardColumn[] => {
  const columns = asArray(raw, `"${field}" in ${where}`).map((column) =>
    toColumn(column, where),
  );
  if (columns.length === 0) fail(`${where} needs at least one ${field} entry.`);
  unique(
    columns.map(({ key }) => key),
    'column key',
  );
  return columns.slice(0, limit);
};

const toSource = (raw: unknown, knownTools: string[]): DashboardSource => {
  const source = asRecord(raw, 'Each source');
  const tool = requiredText(source.tool, '"tool" on a source', SPEC_LIMITS.title);
  if (!knownTools.includes(tool)) {
    fail(DASHBOARD_MESSAGES.unknownTool(tool, knownTools));
  }
  return {
    id: requiredText(source.id, '"id" on a source', SPEC_LIMITS.title),
    tool,
    args: source.args === undefined ? {} : asRecord(source.args, '"args"'),
  };
};

/** What every widget parser needs: the ids it may point at, and the tables so far. */
interface ParseContext {
  sourceIds: string[];
  tables: TableWidget[];
}

const widgetId = (widget: Record<string, unknown>): string =>
  requiredText(widget.id, '"id" on a widget', SPEC_LIMITS.title);

const widgetBase = (widget: Record<string, unknown>) => {
  const id = widgetId(widget);
  return {
    id,
    title: requiredText(widget.title ?? id, '"title"', SPEC_LIMITS.title),
    width: oneOf<WidgetWidth>(widget.width, WIDGET_WIDTHS, '"width"'),
  };
};

/** Resolves a widget's "source" against the spec's sources, or says what exists. */
/**
 * The source id a widget names, however it named it. A small model drops the
 * field, spells it sourceId, or hands back the whole source object — and,
 * having been told only that "source" is required, sends the identical widget
 * again until the round budget is gone. Where the spec defines a single source
 * there is nothing to disambiguate, so an omission is filled in rather than
 * bounced back.
 */
const namedSource = (
  widget: Record<string, unknown>,
  field: string,
): unknown => {
  const raw = widget[field] ?? widget[`${field}Id`] ?? widget[`${field}_id`];
  return isRecord(raw) ? (raw.id ?? raw.source) : raw;
};

const sourceRef = (
  widget: Record<string, unknown>,
  id: string,
  { sourceIds }: ParseContext,
  field = 'source',
): string => {
  const named = optionalText(namedSource(widget, field));
  if (!named && sourceIds.length === 1) return sourceIds[0];

  const source = requiredText(named, `"${field}" on widget "${id}"`, SPEC_LIMITS.title);
  if (!sourceIds.includes(source)) {
    fail(DASHBOARD_MESSAGES.unknownSource(id, source, sourceIds));
  }
  return source;
};

const toTable = (
  widget: Record<string, unknown>,
  context: ParseContext,
): TableWidget => {
  const base = widgetBase(widget);
  const columns = toColumns(widget.columns, `table "${base.id}"`);
  const sort = widget.sort ? asRecord(widget.sort, '"sort"') : undefined;
  const sortKey = optionalText(sort?.key);
  if (sortKey && !columns.some((column) => column.key === sortKey)) {
    fail(
      `Table "${base.id}" sorts by "${sortKey}", which is not one of its columns: ${columns.map((c) => c.key).join(', ')}.`,
    );
  }

  return {
    ...base,
    type: WIDGET_TYPES.table,
    source: sourceRef(widget, base.id, context),
    rowsPath: optionalText(widget.rowsPath),
    rowKey: optionalText(widget.rowKey),
    columns,
    selectable: widget.selectable === undefined ? true : Boolean(widget.selectable),
    sort: sortKey
      ? {
          key: sortKey,
          order: oneOf<SortOrder>(sort?.order, SORT_ORDERS, '"order"') ?? SORT_ORDERS.desc,
        }
      : undefined,
    limit: asNumber(widget.limit),
  };
};

const toCompare = (
  widget: Record<string, unknown>,
  { tables }: ParseContext,
): CompareWidget => {
  const base = widgetBase(widget);
  const from = requiredText(
    widget.from,
    `"from" on compare "${base.id}"`,
    SPEC_LIMITS.title,
  );
  if (!tables.some((table) => table.id === from)) {
    fail(
      `Compare "${base.id}" reads its selection from "${from}", which is not a table in this dashboard. Tables: ${tables.map((t) => t.id).join(', ') || 'none'}.`,
    );
  }

  return {
    ...base,
    type: WIDGET_TYPES.compare,
    from,
    metrics: widget.metrics
      ? toColumns(widget.metrics, `compare "${base.id}"`, 'metrics')
      : undefined,
  };
};

const toVersus = (
  widget: Record<string, unknown>,
  context: ParseContext,
): VersusWidget => {
  const base = widgetBase(widget);
  if (!widget.metrics) fail(DASHBOARD_MESSAGES.needMetrics(base.id));

  return {
    ...base,
    type: WIDGET_TYPES.versus,
    source: sourceRef(widget, base.id, context),
    rowsPath: optionalText(widget.rowsPath),
    labelPath: optionalText(widget.labelPath),
    metrics: toColumns(widget.metrics, `versus "${base.id}"`, 'metrics'),
  };
};

const toSeries = (
  raw: unknown,
  id: string,
  { sourceIds }: ParseContext,
): ChartSeries[] => {
  const entries = asArray(raw ?? [], `"series" in chart "${id}"`);
  if (entries.length === 0) fail(DASHBOARD_MESSAGES.needSeries(id));
  if (entries.length > SPEC_LIMITS.series) {
    fail(DASHBOARD_MESSAGES.tooManySeries(id));
  }

  const series = entries.map((entry) => {
    const line = asRecord(entry, `Each series in chart "${id}"`);
    const key = requiredText(line.key, `"key" in chart "${id}"`, SPEC_LIMITS.title);
    const source = optionalText(line.source);
    if (source && !sourceIds.includes(source)) {
      fail(DASHBOARD_MESSAGES.unknownSource(id, source, sourceIds));
    }
    return {
      key,
      label: requiredText(line.label ?? key, `"label" in chart "${id}"`, SPEC_LIMITS.title),
      path: requiredText(line.path ?? key, `"path" in chart "${id}"`, SPEC_LIMITS.title),
      format: oneOf<CellFormat>(line.format, CELL_FORMATS, '"format"'),
      source,
      rowsPath: optionalText(line.rowsPath),
    } satisfies ChartSeries;
  });

  unique(
    series.map(({ key }) => key),
    'series key',
  );
  return series;
};

const toChart =
  (type: ChartWidget['type']) =>
  (widget: Record<string, unknown>, context: ParseContext): ChartWidget => {
    const base = widgetBase(widget);
    const x = asRecord(widget.x, `"x" on chart "${base.id}"`);

    return {
      ...base,
      type,
      source: sourceRef(widget, base.id, context),
      rowsPath: optionalText(widget.rowsPath),
      x: {
        path: requiredText(x.path, `"x.path" on chart "${base.id}"`, SPEC_LIMITS.title),
        label: optionalText(x.label),
        format: oneOf<CellFormat>(x.format, CELL_FORMATS, '"x.format"'),
      },
      series: toSeries(widget.series, base.id, context),
      stacked: Boolean(widget.stacked),
      horizontal: Boolean(widget.horizontal),
      limit: asNumber(widget.limit),
    };
  };

const toStats = (
  widget: Record<string, unknown>,
  context: ParseContext,
): StatsWidget => {
  const base = widgetBase(widget);
  return {
    ...base,
    type: WIDGET_TYPES.stats,
    source: sourceRef(widget, base.id, context),
    path: optionalText(widget.path),
    tiles: toColumns(widget.tiles, `stats "${base.id}"`, 'tiles', SPEC_LIMITS.tiles),
  };
};

const toMeter = (
  widget: Record<string, unknown>,
  context: ParseContext,
): MeterWidget => {
  const base = widgetBase(widget);
  return {
    ...base,
    type: WIDGET_TYPES.meter,
    source: sourceRef(widget, base.id, context),
    rowsPath: optionalText(widget.rowsPath),
    labelPath: optionalText(widget.labelPath),
    valuePath: requiredText(
      widget.valuePath,
      `"valuePath" on meter "${base.id}"`,
      SPEC_LIMITS.title,
    ),
    gradePath: optionalText(widget.gradePath),
    max: asNumber(widget.max),
    limit: asNumber(widget.limit),
  };
};

const toBadges = (
  widget: Record<string, unknown>,
  context: ParseContext,
): BadgesWidget => {
  const base = widgetBase(widget);
  return {
    ...base,
    type: WIDGET_TYPES.badges,
    source: sourceRef(widget, base.id, context),
    rowsPath: optionalText(widget.rowsPath),
    labelPath: optionalText(widget.labelPath),
    statusPath: requiredText(
      widget.statusPath,
      `"statusPath" on badges "${base.id}"`,
      SPEC_LIMITS.title,
    ),
    notePath: optionalText(widget.notePath),
    limit: asNumber(widget.limit),
  };
};

/**
 * One parser per widget kind, so adding a kind is an entry here rather than
 * another branch. Tables are parsed ahead of this map (see parseSpec) because
 * a compare widget has to be checked against them.
 */
const WIDGET_PARSERS: Record<
  WidgetType,
  (widget: Record<string, unknown>, context: ParseContext) => DashboardWidget
> = {
  [WIDGET_TYPES.table]: toTable,
  [WIDGET_TYPES.compare]: toCompare,
  [WIDGET_TYPES.versus]: toVersus,
  [WIDGET_TYPES.line]: toChart(WIDGET_TYPES.line),
  [WIDGET_TYPES.bar]: toChart(WIDGET_TYPES.bar),
  [WIDGET_TYPES.stats]: toStats,
  [WIDGET_TYPES.meter]: toMeter,
  [WIDGET_TYPES.badges]: toBadges,
};

/**
 * Turns whatever the model (or a client) sent into a spec we are willing to run,
 * failing with a message specific enough that the model can fix it and retry —
 * the chat loop hands validation errors straight back as the tool's result.
 */
export const parseSpec = (raw: unknown, knownTools: string[]): DashboardSpec => {
  const spec = asRecord(raw, 'The dashboard');
  const sources = asArray(spec.sources, '"sources"')
    .slice(0, SPEC_LIMITS.sources)
    .map((source) => toSource(source, knownTools));
  if (sources.length === 0) fail('A dashboard needs at least one source.');
  unique(
    sources.map(({ id }) => id),
    'source id',
  );

  const context: ParseContext = {
    sourceIds: sources.map(({ id }) => id),
    tables: [],
  };
  const raws = asArray(spec.widgets, '"widgets"')
    .slice(0, SPEC_LIMITS.widgets)
    .map((widget) => asRecord(widget, 'Each widget'));
  if (raws.length === 0) fail('A dashboard needs at least one widget.');

  // Tables are read first so a compare widget can be checked against them, and
  // kept by position so the second pass reuses them rather than re-parsing.
  const tables = new Map<number, TableWidget>();
  raws.forEach((widget, index) => {
    if (asString(widget.type) === WIDGET_TYPES.table) {
      tables.set(index, toTable(widget, context));
    }
  });
  context.tables = [...tables.values()];

  const widgets = raws.map((widget, index) => {
    const type = oneOf(widget.type, WIDGET_TYPES, '"type"');
    if (!type) return fail('"type" is required on every widget.') as never;
    return tables.get(index) ?? WIDGET_PARSERS[type](widget, context);
  });
  unique(
    widgets.map(({ id }) => id),
    'widget id',
  );

  return {
    title: requiredText(spec.title, '"title"', SPEC_LIMITS.title),
    description:
      asString(spec.description)?.trim().slice(0, SPEC_LIMITS.description) ||
      undefined,
    sources,
    widgets,
  };
};
