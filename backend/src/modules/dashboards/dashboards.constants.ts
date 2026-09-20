import type { DashboardSpec } from './dashboards.types.js';

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
  line: 'line',
  bar: 'bar',
  versus: 'versus',
  stats: 'stats',
  meter: 'meter',
  badges: 'badges',
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

/** Which direction wins when two entities are compared on a metric. */
export const BETTER_DIRECTIONS = { higher: 'higher', lower: 'lower' } as const;

/** How wide a widget sits in the dashboard grid. */
export const WIDGET_WIDTHS = { full: 'full', half: 'half' } as const;

/** The builder's own stream event, alongside the chat events. */
export const DASHBOARD_EVENTS = { spec: 'dashboard_spec' } as const;

export const BUILD_DASHBOARD_TOOL = 'build_dashboard';

/**
 * The builder gets a longer loop than a chat turn. Designing a dashboard costs
 * rounds before the first one is even attempted — a name lookup, the catalog,
 * the data tool itself — and a build that runs out mid-way leaves the person
 * with nothing at all, where a chat turn that runs out has still said something.
 */
export const BUILDER_MAX_TOOL_ROUNDS = 30;

/** Sent once when a pass ends with data fetched but no dashboard built. */
export const BUILD_NUDGE =
  'You did not call build_dashboard, so nothing was rendered. Design the dashboard now and call build_dashboard with sources and widgets. Do not answer in prose.';

export const DEFAULT_ROWS_PATH = 'rows';

/**
 * Where a tool's row array actually lives, in the order we look. Every tool
 * names its array for what it holds — get_leaderboard says "rows", but
 * compare_players says "players", a game log says "games", get_matchup_ratings
 * says "teams" and get_pitcher_starts says "pitchers". Mirrored in the
 * frontend's dashboards.constants.ts, which resolves rows the same way.
 */
export const ROW_ARRAY_KEYS = [
  DEFAULT_ROWS_PATH,
  'players',
  'games',
  'teams',
  'pitchers',
] as const;
export const DEFAULT_ROW_KEY = 'id';
export const DEFAULT_LABEL_PATH = 'name';
/** compare_players and get_game_preview answer with a "players"/"teams" array. */
export const DEFAULT_VERSUS_ROWS_PATH = 'players';
export const DEFAULT_METER_MAX = 100;

export const SPEC_LIMITS = {
  title: 80,
  description: 240,
  sources: 6,
  widgets: 8,
  columns: 24,
  rows: 200,
  /** Past four lines on one chart no palette keeps the series apart. */
  series: 4,
  /** Field names listed back to the model when a path misses. */
  reportedFields: 40,
  tiles: 6,
  meters: 12,
  badges: 16,
} as const;

export const DASHBOARD_LIMITS = {
  perUser: 50,
  /** The saved prompt grows by one line per refinement, so it needs a ceiling. */
  prompt: 2000,
} as const;

export const DASHBOARD_MESSAGES = {
  notFound: 'Dashboard not found',
  tooMany: `You can save up to ${DASHBOARD_LIMITS.perUser} dashboards. Delete one first.`,
  noSpec:
    'The model finished without calling build_dashboard, so there is nothing to render yet. Ask it again, more specifically.',
  unknownTool: (name: string, known: string[]) =>
    `Unknown data tool "${name}". Use one of: ${known.join(', ')}.`,
  unknownSource: (widget: string, source: string, known: string[]) =>
    `Widget "${widget}" points at source "${source}", which is not defined. Sources: ${known.join(', ') || 'none'}.`,
  needSeries: (widget: string) =>
    `Chart "${widget}" needs at least one entry in "series", each with a "path" to a number in a row.`,
  tooManySeries: (widget: string) =>
    `Chart "${widget}" has more than ${SPEC_LIMITS.series} series. Split it into two charts — past ${SPEC_LIMITS.series} lines no palette keeps them apart.`,
  needMetrics: (widget: string) =>
    `Versus "${widget}" needs "metrics": the numbers the two entities are compared on.`,

  // Checking the spec against the data it will render. These come back to the
  // model as a tool error, so each one names the fix rather than the fault.
  specMismatch: (problems: string[]) =>
    [
      'The dashboard was not rendered: some widgets address data that is not in the tool result.',
      ...problems.map((problem) => `- ${problem}`),
      'Fix the paths listed above and call build_dashboard again with the whole spec.',
    ].join('\n'),
  badPaths: (widget: string, paths: string[], fields: string[]) =>
    `Widget "${widget}": ${paths.join(', ')} — no row has these. The rows carry: ${fields.join(', ')}.`,
  badStatsPath: (widget: string, path: string, keys: string[]) =>
    `Stats widget "${widget}" reads "${path}", which is not an object in the result. The result has: ${keys.join(', ')}.`,
  noRows: (widget: string, source: string, keys: string[]) =>
    `Widget "${widget}" found no rows in source "${source}". The result has: ${keys.join(', ') || 'no fields'}.`,
  rowsPathFixed: (widget: string, from: string, to: string) =>
    `Widget "${widget}": rowsPath "${from}" does not exist; reading "${to}" instead.`,
  sourceFailed: (source: string, error: string) =>
    `Source "${source}" failed: ${error}`,
  emptySource: (source: string) => `Source "${source}" returned no rows.`,
} as const;

/**
 * Appended to the builder prompt when a dashboard already exists. The chat
 * history carries only the text turns, so without this the model cannot see
 * what it built last round and re-invents the dashboard from scratch.
 */
export const editPreamble = (spec: DashboardSpec): string =>
  [
    '',
    'A dashboard already exists and the user is refining it. Its current spec is:',
    JSON.stringify(spec),
    'Change only what they ask for and call build_dashboard with the complete',
    'updated spec — it replaces the old one, so keep every source and widget you',
    'still want. You may still call a data tool first to check a field name.',
  ].join('\n');

/**
 * The builder gets the full stats tool set so it can look at a real result
 * before designing widgets — a small model that designs blind invents field
 * names, and every cell then renders empty.
 *
 * Kept deliberately terse: it is paid for out of OLLAMA_NUM_CTX on every round,
 * against the tool results the model actually needs to read.
 */
export const BUILDER_SYSTEM_PROMPT = [
  'You are the dashboard builder for Fantasy Land. The user describes a view of',
  'fantasy data; you design it and call build_dashboard. You do not answer in prose.',
  '',
  'Work in two steps, every time:',
  '1. Call the data tool you intend to use (get_leaderboard, get_player_stats,',
  '   compare_players, get_matchup_ratings, ...) with the exact arguments you plan to',
  '   save, and read its result to learn the real field names.',
  '2. Call build_dashboard, where every "path" is a field you actually saw.',
  '',
  'A dashboard is sources plus widgets.',
  '- A source is a tool call re-run every time the dashboard is opened, so pick',
  '  arguments that stay right later: prefer a season over a fixed date range.',
  '- A source\'s "args" are that tool\'s own arguments, so a "sort" there is a stat',
  '  key such as "homeRuns", never a dot path. Sorting the source picks *which*',
  '  players come back; a table\'s own "sort" only reorders them.',
  '- "rowsPath" is the dot path to the array in a result ("rows" for most tools,',
  '  "games" for a game log, "players" for compare_players). Every other "path" is a',
  '  dot path inside one row ("name", "fantasyPoints", "stats.hr").',
  '- A source gets every stat its group defines, so any "stats.<key>" you saw in the',
  '  tool result is a valid column.',
  '- Give each widget "width": "half" to sit two per row, "full" for the whole row.',
  '  Tables and charts want "full"; stat tiles, meters and badges read well at "half".',
  '',
  'Widget kinds:',
  '- table: rows and columns. "selectable" lets the user tick rows.',
  '- compare: transposes the rows ticked in a table ("from": the table id). Use it',
  '  when the user wants to shortlist from a list.',
  '- versus: a direct head-to-head of the 2-4 entities in one source, no ticking.',
  '  Point it at compare_players or get_game_preview and give it "metrics". This is the',
  '  right widget for "player A vs player B".',
  '- line: a trend. "x" is the path to the time axis (a game log\'s "week" or "date");',
  '  each entry in "series" is one line. A series may name its own "source", so two',
  "  players' game logs become two lines on one chart. Max " +
    SPEC_LIMITS.series +
    ' series.',
  '- bar: magnitude across categories. "x" is the category (usually "name"); one',
  '  series is the norm. Set "horizontal": true when the labels are player names.',
  '- stats: a row of headline numbers from one object — "path" points at the object',
  '  (e.g. "consistency"), each tile reads a field inside it.',
  '- meter: a 0-100 rating with its grade, one per row. Made for get_matchup_ratings.',
  '- badges: short status chips per row, e.g. availability or hot/cold form.',
  '',
  'Column and tile "format": "text" for names and teams, "int" for counts, "decimal"',
  'for points and averages, "rate" for batting-average style numbers, "percent",',
  '"innings". On a versus metric, add "better": "lower" where a smaller number wins',
  '(volatility); it defaults to "higher".',
  '',
  'Example build_dashboard arguments:',
  JSON.stringify(
    {
      title: 'Saquon vs Gibbs',
      description: 'PPR season to date, with weekly trend.',
      sources: [
        {
          id: 'head',
          tool: 'compare_players',
          args: { sport: 'nfl', playerIds: ['4866', '9509'], scoring: 'ppr' },
        },
        {
          id: 'log_a',
          tool: 'get_player_stats',
          args: {
            sport: 'nfl',
            playerId: '4866',
            scoring: 'ppr',
            include: ['games'],
          },
        },
        {
          id: 'log_b',
          tool: 'get_player_stats',
          args: {
            sport: 'nfl',
            playerId: '9509',
            scoring: 'ppr',
            include: ['games'],
          },
        },
      ],
      widgets: [
        {
          type: 'versus',
          id: 'vs',
          title: 'Head to head',
          source: 'head',
          rowsPath: 'players',
          labelPath: 'name',
          width: 'full',
          metrics: [
            {
              key: 'ppg',
              header: 'Points per game',
              path: 'pointsPerGame',
              format: 'decimal',
            },
            { key: 'floor', header: 'Floor', path: 'floor', format: 'decimal' },
            {
              key: 'vol',
              header: 'Volatility',
              path: 'volatility',
              format: 'decimal',
              better: 'lower',
            },
          ],
        },
        {
          type: 'line',
          id: 'trend',
          title: 'Weekly points',
          source: 'log_a',
          rowsPath: 'games',
          width: 'full',
          x: { path: 'week', label: 'Week' },
          series: [
            { key: 'saquon', label: 'Barkley', path: 'fantasyPoints' },
            {
              key: 'gibbs',
              label: 'Gibbs',
              path: 'fantasyPoints',
              source: 'log_b',
            },
          ],
        },
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
