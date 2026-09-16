import { LOCAL_TOOL_SOURCE } from '../tools/tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools/tools.types.js';
import {
  BUILD_DASHBOARD_TOOL,
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  SORT_ORDERS,
  WIDGET_TYPES,
} from './dashboards.constants.js';
import type { DashboardSpec } from './dashboards.types.js';
import { parseSpec } from './dashboards.utils.js';

const COLUMN_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'Unique id for this column.' },
    header: { type: 'string', description: 'Column heading shown to the user.' },
    path: {
      type: 'string',
      description: 'Dot path to the value inside one row, e.g. "stats.hr".',
    },
    format: { type: 'string', enum: Object.values(CELL_FORMATS) },
    align: { type: 'string', enum: Object.values(CELL_ALIGNMENTS) },
    highlight: {
      type: 'boolean',
      description: 'Emphasize this column, e.g. fantasy points.',
    },
  },
  required: ['key', 'header', 'path'],
} as const;

/**
 * The one tool in the builder's list that fetches nothing: it validates what the
 * model designed and hands it back through `onSpec`. Validation failures return
 * as a normal tool error, which is how the model gets a chance to fix a bad path
 * or a dangling widget reference instead of the turn dying.
 */
export class BuildDashboardTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: BUILD_DASHBOARD_TOOL,
    source: LOCAL_TOOL_SOURCE,
    description:
      'Render a dashboard for the user from data tools you have already called. Call this once you know the real field names in the tool result.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short dashboard title.' },
        description: { type: 'string', description: 'One line on what it shows.' },
        sources: {
          type: 'array',
          description: 'Tool calls re-run each time the dashboard is opened.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Referenced by a widget.' },
              tool: { type: 'string', description: 'Name of the data tool to call.' },
              args: { type: 'object', description: "The tool's arguments." },
            },
            required: ['id', 'tool', 'args'],
          },
        },
        widgets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: Object.values(WIDGET_TYPES) },
              id: { type: 'string' },
              title: { type: 'string' },
              source: {
                type: 'string',
                description: 'table only: the source id to render.',
              },
              rowsPath: {
                type: 'string',
                description: 'table only: dot path to the row array, usually "rows".',
              },
              selectable: {
                type: 'boolean',
                description: 'table only: let the user tick rows to compare.',
              },
              sort: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  order: { type: 'string', enum: Object.values(SORT_ORDERS) },
                },
              },
              columns: { type: 'array', items: COLUMN_SCHEMA },
              from: {
                type: 'string',
                description: 'compare only: the table id whose selection it reads.',
              },
            },
            required: ['type', 'id', 'title'],
          },
        },
      },
      required: ['title', 'sources', 'widgets'],
    },
  };

  constructor(
    private readonly knownTools: string[],
    private readonly onSpec: (spec: DashboardSpec) => void,
  ) {}

  execute(args: Record<string, unknown>) {
    const spec = parseSpec(args, this.knownTools);
    this.onSpec(spec);
    return Promise.resolve({
      ok: true,
      rendered: spec.widgets.map(({ id, type }) => ({ id, type })),
      note: 'The dashboard is on screen. Reply with one short sentence describing it.',
    });
  }
}
