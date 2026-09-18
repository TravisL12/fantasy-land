import { BadRequestException } from '@nestjs/common';
import { LOCAL_TOOL_SOURCE } from '../tools/tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools/tools.types.js';
import {
  BETTER_DIRECTIONS,
  BUILD_DASHBOARD_TOOL,
  DASHBOARD_MESSAGES,
  CELL_ALIGNMENTS,
  CELL_FORMATS,
  SORT_ORDERS,
  SPEC_LIMITS,
  WIDGET_TYPES,
  WIDGET_WIDTHS,
} from './dashboards.constants.js';
import type { DashboardRun, DashboardSpec } from './dashboards.types.js';
import { parseSpec } from './dashboards.utils.js';
import { reviewSpec } from './dashboards.verify.js';

const COLUMN_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'Unique id for this column.' },
    header: { type: 'string', description: 'Heading shown to the user.' },
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
    better: {
      type: 'string',
      enum: Object.values(BETTER_DIRECTIONS),
      description: 'versus metrics: which way wins. Defaults to higher.',
    },
  },
  required: ['key', 'header', 'path'],
} as const;

const SERIES_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string', description: 'Shown in the legend and at the line end.' },
    path: { type: 'string', description: 'Dot path to the number in one row.' },
    format: { type: 'string', enum: Object.values(CELL_FORMATS) },
    source: {
      type: 'string',
      description: "Source id, if this line reads a different source to the widget's.",
    },
    rowsPath: { type: 'string' },
  },
  required: ['key', 'label', 'path'],
} as const;

/**
 * The one tool in the builder's list that fetches nothing of its own: it
 * validates what the model designed and hands it back through `onSpec`.
 *
 * Validation runs twice over. `parseSpec` checks the shape — ids, references,
 * limits — and then the spec is run against the real tool results, because a
 * structurally perfect spec can still address fields that do not exist, and
 * that is exactly the failure a person sees as "it fetched, but it's empty".
 * Both kinds of failure return as a normal tool error, which is how the model
 * gets a chance to fix a bad path instead of saving a dashboard of dashes.
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
              width: {
                type: 'string',
                enum: Object.values(WIDGET_WIDTHS),
                description: 'Half-width widgets sit two per row. Defaults to full.',
              },
              source: {
                type: 'string',
                description: 'The source id to render. Not used by compare.',
              },
              rowsPath: {
                type: 'string',
                description:
                  'Dot path to the row array: "rows" for most tools, "games" for a game log, "players" for compare_players.',
              },
              columns: {
                type: 'array',
                items: COLUMN_SCHEMA,
                description: 'table only.',
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
                description: 'table only.',
              },
              from: {
                type: 'string',
                description: 'compare only: the table id whose selection it reads.',
              },
              metrics: {
                type: 'array',
                items: COLUMN_SCHEMA,
                description: 'compare and versus: the numbers put side by side.',
              },
              labelPath: {
                type: 'string',
                description:
                  'versus, meter, badges: dot path to each row\'s name. Defaults to "name".',
              },
              x: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'e.g. "week" or "date".' },
                  label: { type: 'string' },
                  format: { type: 'string', enum: Object.values(CELL_FORMATS) },
                },
                required: ['path'],
                description: 'line and bar only: the category or time axis.',
              },
              series: {
                type: 'array',
                items: SERIES_SCHEMA,
                description: `line and bar only: up to ${SPEC_LIMITS.series} lines.`,
              },
              stacked: { type: 'boolean', description: 'bar only.' },
              horizontal: {
                type: 'boolean',
                description: 'bar only: bars run left to right, for long names.',
              },
              path: {
                type: 'string',
                description:
                  'stats only: dot path to the object the tiles read, e.g. "consistency".',
              },
              tiles: {
                type: 'array',
                items: COLUMN_SCHEMA,
                description: 'stats only: the headline numbers.',
              },
              valuePath: {
                type: 'string',
                description: 'meter only: dot path to the 0-100 rating.',
              },
              gradePath: {
                type: 'string',
                description: 'meter only: dot path to the letter grade or label.',
              },
              max: { type: 'number', description: 'meter only. Defaults to 100.' },
              statusPath: {
                type: 'string',
                description: 'badges only: dot path to the status word.',
              },
              notePath: {
                type: 'string',
                description: 'badges only: dot path to a line of detail.',
              },
              limit: { type: 'integer', description: 'Cap the rows rendered.' },
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
    private readonly runSpec: (spec: DashboardSpec) => Promise<DashboardRun>,
  ) {}

  async execute(args: Record<string, unknown>) {
    const parsed = parseSpec(args, this.knownTools);
    // The sources are the calls the model just made, so this is served from the
    // data cache rather than fetched again.
    const { spec, problems, notes } = reviewSpec(parsed, await this.runSpec(parsed));

    if (problems.length) {
      throw new BadRequestException(DASHBOARD_MESSAGES.specMismatch(problems));
    }

    this.onSpec(spec);
    return {
      ok: true,
      rendered: spec.widgets.map(({ id, type }) => ({ id, type })),
      ...(notes.length ? { notes } : {}),
      note: 'The dashboard is on screen. Reply with one short sentence describing it.',
    };
  }
}
