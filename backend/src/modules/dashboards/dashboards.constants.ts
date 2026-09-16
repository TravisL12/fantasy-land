export const DASHBOARDS_ROUTE = 'dashboards';
export const DASHBOARDS_ROUTES = {
  build: 'build',
  run: 'run',
  byId: ':id',
} as const;

/** The widget kinds a spec may use. Add a kind here and in the frontend registry. */
export const WIDGET_TYPES = {
  table: 'table',
  compare: 'compare',
} as const;

/** Cell formats a column may ask for — the numeric ones match the stats formatter. */
export const CELL_FORMATS = {
  text: 'text',
  int: 'int',
  decimal: 'decimal',
  rate: 'rate',
  percent: 'percent',
  innings: 'innings',
} as const;

export const CELL_ALIGNMENTS = { left: 'left', right: 'right' } as const;

export const SORT_ORDERS = { asc: 'asc', desc: 'desc' } as const;

/** The builder's own stream event, alongside the chat events. */
export const DASHBOARD_EVENTS = { spec: 'dashboard_spec' } as const;

export const BUILD_DASHBOARD_TOOL = 'build_dashboard';

export const DEFAULT_ROWS_PATH = 'rows';
export const DEFAULT_ROW_KEY = 'id';

export const SPEC_LIMITS = {
  title: 80,
  description: 240,
  sources: 6,
  widgets: 6,
  columns: 24,
  rows: 200,
} as const;

export const DASHBOARD_LIMITS = {
  perUser: 50,
} as const;

export const DASHBOARD_MESSAGES = {
  notFound: 'Dashboard not found',
  tooMany: `You can save up to ${DASHBOARD_LIMITS.perUser} dashboards. Delete one first.`,
  noSpec:
    'The model finished without calling build_dashboard, so there is nothing to render yet. Ask it again, more specifically.',
  unknownTool: (name: string, known: string[]) =>
    `Unknown data tool "${name}". Use one of: ${known.join(', ')}.`,
} as const;

/**
 * The builder gets the full stats tool set so it can look at a real result
 * before designing columns — a small model that designs blind invents field
 * names, and every cell then renders empty.
 */
export const BUILDER_SYSTEM_PROMPT = [
  'You are the dashboard builder for Fantasy Land. The user describes a view of',
  'fantasy data; you design it and call build_dashboard. You do not answer in prose.',
  '',
  'Work in two steps, every time:',
  '1. Call the data tool you intend to use (get_leaderboard, get_player_game_log,',
  '   get_probable_pitchers, ...) with the exact arguments you plan to save, and read',
  '   its result to learn the real field names.',
  '2. Call build_dashboard, where every column "path" is a field you actually saw.',
  '',
  'A dashboard is sources plus widgets.',
  '- A source is a tool call that is re-run every time the dashboard is opened, so',
  '  pick arguments that stay right later: prefer a season over a fixed date range.',
  '- A source\'s "args" are that tool\'s own arguments, so a "sort" there is a stat',
  '  key such as "homeRuns", never a dot path. Sorting the source picks *which*',
  '  players come back, so get it right — the table\'s own "sort" only reorders them.',
  '- A table widget renders one source. "rowsPath" is the dot path to the array in',
  '  the result ("rows" for most tools); each column "path" is a dot path inside one',
  '  row ("name", "fantasyPoints", "stats.hr").',
  '- A compare widget reads the rows the user ticked in a table and puts them side by',
  '  side. Add one whenever the user wants to compare, pick between, or shortlist',
  '  players, and point its "from" at the table id.',
  '',
  'Column "format": "text" for names and teams, "int" for counts, "decimal" for',
  'points and averages, "rate" for batting-average style numbers, "percent", or',
  '"innings". Use "text" alignment defaults — leave "align" out unless you need it.',
  '',
  'Example build_dashboard arguments:',
  JSON.stringify(
    {
      title: 'Top NFL wide receivers',
      description: 'PPR leaders this season, with a compare panel.',
      sources: [
        {
          id: 'wrs',
          tool: 'get_leaderboard',
          args: { sport: 'nfl', season: '2025', position: 'WR', scoring: 'ppr', limit: 40 },
        },
      ],
      widgets: [
        {
          type: 'table',
          id: 'wr_table',
          title: 'WR leaders',
          source: 'wrs',
          rowsPath: 'rows',
          selectable: true,
          sort: { key: 'points', order: 'desc' },
          columns: [
            { key: 'name', header: 'Player', path: 'name', format: 'text' },
            { key: 'team', header: 'Team', path: 'team', format: 'text' },
            { key: 'points', header: 'FPTS', path: 'fantasyPoints', format: 'decimal', highlight: true },
            { key: 'ppg', header: 'PPG', path: 'fantasyPointsPerGame', format: 'decimal' },
            { key: 'rec', header: 'REC', path: 'stats.rec', format: 'int' },
          ],
        },
        { type: 'compare', id: 'wr_compare', title: 'Selected receivers', from: 'wr_table' },
      ],
    },
    null,
    2,
  ),
  '',
  'Ids must be unique and lowercase with underscores. Keep a table under 12 columns.',
  'If build_dashboard comes back with an error, fix exactly what it names and call it',
  'again. Once it succeeds, reply with one short sentence saying what you built.',
].join('\n');
