import { BadRequestException } from '@nestjs/common';
import { asNumber, asString } from '../tools/tools.utils.js';
import {
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  DASHBOARD_MESSAGES,
  SORT_ORDERS,
  SPEC_LIMITS,
  WIDGET_TYPES,
} from './dashboards.constants.js';
import type {
  CellAlign,
  CellFormat,
  CompareWidget,
  DashboardColumn,
  DashboardSource,
  DashboardSpec,
  DashboardWidget,
  SortOrder,
  TableWidget,
} from './dashboards.types.js';

const fail = (message: string): never => {
  throw new BadRequestException(message);
};

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
    path: asString(column.path)?.trim() || key,
    format: oneOf<CellFormat>(column.format, CELL_FORMATS, '"format"'),
    align: oneOf<CellAlign>(column.align, CELL_ALIGNMENTS, '"align"'),
    sortable: column.sortable === undefined ? true : Boolean(column.sortable),
    highlight: Boolean(column.highlight),
  };
};

const toColumns = (raw: unknown, where: string): DashboardColumn[] => {
  const columns = asArray(raw, `"columns" in ${where}`).map((column) =>
    toColumn(column, where),
  );
  if (columns.length === 0) fail(`${where} needs at least one column.`);
  unique(
    columns.map(({ key }) => key),
    'column key',
  );
  return columns.slice(0, SPEC_LIMITS.columns);
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

const toTable = (
  widget: Record<string, unknown>,
  sourceIds: string[],
): TableWidget => {
  const id = requiredText(widget.id, '"id" on a widget', SPEC_LIMITS.title);
  const source = requiredText(
    widget.source,
    `"source" on table "${id}"`,
    SPEC_LIMITS.title,
  );
  if (!sourceIds.includes(source)) {
    fail(
      `Table "${id}" points at source "${source}", which is not defined. Sources: ${sourceIds.join(', ') || 'none'}.`,
    );
  }

  const columns = toColumns(widget.columns, `table "${id}"`);
  const sort = widget.sort ? asRecord(widget.sort, '"sort"') : undefined;
  const sortKey = asString(sort?.key)?.trim();
  if (sortKey && !columns.some((column) => column.key === sortKey)) {
    fail(
      `Table "${id}" sorts by "${sortKey}", which is not one of its columns: ${columns.map((c) => c.key).join(', ')}.`,
    );
  }

  return {
    type: WIDGET_TYPES.table,
    id,
    title: requiredText(widget.title ?? id, '"title"', SPEC_LIMITS.title),
    source,
    rowsPath: asString(widget.rowsPath)?.trim() || undefined,
    rowKey: asString(widget.rowKey)?.trim() || undefined,
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
  tables: TableWidget[],
): CompareWidget => {
  const id = requiredText(widget.id, '"id" on a widget', SPEC_LIMITS.title);
  const from = requiredText(
    widget.from,
    `"from" on compare "${id}"`,
    SPEC_LIMITS.title,
  );
  if (!tables.some((table) => table.id === from)) {
    fail(
      `Compare "${id}" reads its selection from "${from}", which is not a table in this dashboard. Tables: ${tables.map((t) => t.id).join(', ') || 'none'}.`,
    );
  }

  return {
    type: WIDGET_TYPES.compare,
    id,
    title: requiredText(widget.title ?? id, '"title"', SPEC_LIMITS.title),
    from,
    metrics: widget.metrics
      ? toColumns(widget.metrics, `compare "${id}"`)
      : undefined,
  };
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

  const sourceIds = sources.map(({ id }) => id);
  const raws = asArray(spec.widgets, '"widgets"')
    .slice(0, SPEC_LIMITS.widgets)
    .map((widget) => asRecord(widget, 'Each widget'));
  if (raws.length === 0) fail('A dashboard needs at least one widget.');

  // Tables are read first so a compare widget can be checked against them.
  const tables = raws
    .filter((widget) => asString(widget.type) === WIDGET_TYPES.table)
    .map((widget) => toTable(widget, sourceIds));

  let table = 0;
  const widgets: DashboardWidget[] = raws.map((widget) => {
    const type = oneOf(widget.type, WIDGET_TYPES, '"type"');
    if (type === WIDGET_TYPES.compare) return toCompare(widget, tables);
    if (type === WIDGET_TYPES.table) return tables[table++];
    return fail(`"type" is required on every widget.`) as never;
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
