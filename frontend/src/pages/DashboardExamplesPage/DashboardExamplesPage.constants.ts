import {
  WIDGET_TYPES,
  WIDGET_WIDTHS,
  type DashboardRun,
  type DashboardSpec,
} from '@/api/dashboards';
import { ROUTES } from '@/router/routes.constants';
import type { FormatGuideEntry, WidgetGuideEntry } from './DashboardExamplesPage.types';

export const EXAMPLES_COPY = {
  heading: 'What a dashboard can show',
  subheading:
    'Eight widget kinds, and the words that get you each one. You never write a spec yourself — you describe the view and the builder picks the widgets.',
  back: 'Dashboards',
  widgetsHeading: 'The widgets',
  formatsHeading: 'Value formats',
  formatsIntro:
    'Every number is printed to the format its column asks for, so counts, rates and points all read the way you expect.',
  exampleHeading: 'A dashboard using all eight',
  exampleIntro:
    'This is the real renderer — sort a column, tick two rows in the table to fill the compare panel. The players and numbers are invented so the page always looks the same; a dashboard you save re-fetches live data every time you open it.',
  specSummary: 'The spec behind this example',
  specIntro:
    'A dashboard stores only this: the tool calls to re-run, and the widgets to draw the answers with. The builder writes it for you.',
  create: 'Build one',
  createTo: ROUTES.dashboardCreate,
  needs: 'Reads',
  ask: 'Ask for it like',
} as const;

export const CARD_MIN_WIDTH = '320px';

export const WIDGET_GUIDE: WidgetGuideEntry[] = [
  {
    type: WIDGET_TYPES.table,
    title: 'Table',
    summary:
      'Rows and columns, sortable by any column. The workhorse: any ranking or list of players starts here. It can also let you tick rows, which is what feeds a compare panel.',
    needs: 'a list of rows — a leaderboard, a game log, a roster',
    ask: 'Top 25 MLB hitters this season with HR, AVG, OPS and points.',
  },
  {
    type: WIDGET_TYPES.compare,
    title: 'Compare',
    summary:
      'The transpose of a table: the rows you ticked, side by side, one column each. Use it to shortlist from a long list and then look at the few that matter.',
    needs: 'a table above it, with ticking turned on',
    ask: '…and let me tick players to compare them.',
  },
  {
    type: WIDGET_TYPES.versus,
    title: 'Versus',
    summary:
      'The same side-by-side grid without the ticking — the two or three players are the point of the dashboard. The better value in each row is marked, and volatility counts backwards, where lower wins.',
    needs: 'a direct comparison of named players or teams',
    ask: 'Ohtani vs Judge this season: points per game, floor, ceiling, volatility.',
  },
  {
    type: WIDGET_TYPES.line,
    title: 'Line chart',
    summary:
      'A trend over time — game by game or week by week. Up to four lines share one pair of axes, so two players can be traced against each other.',
    needs: 'a game log, with a date or week on the x axis',
    ask: "Chart Okafor's and Salcedo's fantasy points game by game.",
  },
  {
    type: WIDGET_TYPES.bar,
    title: 'Bar chart',
    summary:
      'Magnitude across categories, usually one bar per player. Horizontal bars when the labels are names. Every chart carries a legend and a Show data button, so nothing is hidden behind hover.',
    needs: 'one number per row, and a label to put it against',
    ask: 'Bar chart of home runs for the top 10 hitters.',
  },
  {
    type: WIDGET_TYPES.stats,
    title: 'Stat tiles',
    summary:
      'A row of headline numbers read out of one result — season points, points per game, floor, ceiling. The honest form for a handful of figures that are not a chart.',
    needs: 'one player or team, not a list',
    ask: "Show Okafor's season totals and consistency as headline numbers.",
  },
  {
    type: WIDGET_TYPES.meter,
    title: 'Meters',
    summary:
      'A 0-100 rating with its grade, one bar per row. Built for matchup ratings: how good an opponent each team is to face, in a shape you can scan.',
    needs: 'a rating per row — matchup ratings today',
    ask: 'Rate every team as a matchup for my hitters.',
  },
  {
    type: WIDGET_TYPES.badges,
    title: 'Badges',
    summary:
      'A status chip per row — available, injured, hot, cold, confirmed, projected — with a line of detail under it. Wording we do not recognise stays grey rather than being guessed into a severity.',
    needs: 'a status field per row: availability, form, confirmed starts',
    ask: 'Who on this list is hurt right now?',
  },
];

export const FORMAT_GUIDE: FormatGuideEntry[] = [
  { format: 'text', summary: 'Names, teams, positions', example: 'SEA' },
  { format: 'int', summary: 'Counts', example: '38' },
  { format: 'decimal', summary: 'Points and averages', example: '3.7' },
  { format: 'rate', summary: 'Batting-average style rates', example: '.301' },
  { format: 'percent', summary: 'Shares', example: '64.2%' },
  { format: 'innings', summary: 'Innings pitched, in thirds', example: '184.2' },
];

/**
 * A spec using every widget kind. It is a spec the builder could really have
 * written — the tools, arguments and field names are the live ones — but it is
 * rendered against the fixed results below rather than run, so the guide never
 * depends on an upstream API being up.
 */
export const EXAMPLE_SPEC = {
  title: 'Widget guide',
  description:
    'Every widget kind, drawn from made-up numbers so the shapes stay put.',
  sources: [
    {
      id: 'leaders',
      tool: 'get_leaderboard',
      args: { sport: 'mlb', group: 'hitting', sort: 'homeRuns', limit: 8 },
    },
    {
      id: 'head',
      tool: 'compare_players',
      args: { sport: 'mlb', playerIds: ['p1', 'p2'] },
    },
    {
      id: 'log_a',
      tool: 'get_player_stats',
      args: { sport: 'mlb', playerId: 'p1', include: ['totals', 'games'] },
    },
    {
      id: 'log_b',
      tool: 'get_player_stats',
      args: { sport: 'mlb', playerId: 'p2', include: ['games'] },
    },
    { id: 'matchups', tool: 'get_matchup_ratings', args: { sport: 'mlb', side: 'hitting' } },
    { id: 'availability', tool: 'get_player_status', args: { sport: 'mlb', limit: 6 } },
  ],
  widgets: [
    {
      type: WIDGET_TYPES.table,
      id: 'board',
      title: 'Home run leaders',
      source: 'leaders',
      rowsPath: 'rows',
      width: WIDGET_WIDTHS.full,
      selectable: true,
      sort: { key: 'hr', order: 'desc' },
      columns: [
        { key: 'name', header: 'Player', path: 'name', format: 'text' },
        { key: 'team', header: 'Team', path: 'team', format: 'text' },
        { key: 'hr', header: 'HR', path: 'stats.homeRuns', format: 'int', sortable: true },
        { key: 'rbi', header: 'RBI', path: 'stats.rbi', format: 'int', sortable: true },
        { key: 'avg', header: 'AVG', path: 'stats.avg', format: 'rate', sortable: true },
        { key: 'ops', header: 'OPS', path: 'stats.ops', format: 'rate', sortable: true },
        {
          key: 'points',
          header: 'Points',
          path: 'fantasyPoints',
          format: 'decimal',
          sortable: true,
          highlight: true,
        },
      ],
    },
    {
      type: WIDGET_TYPES.compare,
      id: 'shortlist',
      title: 'Ticked players',
      from: 'board',
      width: WIDGET_WIDTHS.half,
    },
    {
      type: WIDGET_TYPES.versus,
      id: 'versus',
      title: 'Okafor vs Salcedo',
      source: 'head',
      rowsPath: 'players',
      labelPath: 'name',
      width: WIDGET_WIDTHS.half,
      metrics: [
        { key: 'ppg', header: 'Points per game', path: 'pointsPerGame', format: 'decimal' },
        { key: 'floor', header: 'Floor', path: 'floor', format: 'decimal' },
        { key: 'ceiling', header: 'Ceiling', path: 'ceiling', format: 'decimal' },
        {
          key: 'volatility',
          header: 'Volatility',
          path: 'volatility',
          format: 'decimal',
          better: 'lower',
        },
      ],
    },
    {
      type: WIDGET_TYPES.line,
      id: 'trend',
      title: 'Points per game, last 10',
      source: 'log_a',
      rowsPath: 'games',
      width: WIDGET_WIDTHS.full,
      x: { path: 'date', label: 'Date' },
      series: [
        { key: 'okafor', label: 'Okafor', path: 'fantasyPoints' },
        { key: 'salcedo', label: 'Salcedo', path: 'fantasyPoints', source: 'log_b' },
      ],
    },
    {
      type: WIDGET_TYPES.bar,
      id: 'homers',
      title: 'Home runs',
      source: 'leaders',
      rowsPath: 'rows',
      width: WIDGET_WIDTHS.full,
      horizontal: true,
      x: { path: 'name', label: 'Player' },
      series: [{ key: 'hr', label: 'Home runs', path: 'stats.homeRuns', format: 'int' }],
    },
    {
      type: WIDGET_TYPES.stats,
      id: 'consistency',
      title: 'Okafor, game to game',
      source: 'log_a',
      path: 'consistency',
      width: WIDGET_WIDTHS.half,
      tiles: [
        { key: 'games', header: 'Games', path: 'games', format: 'int' },
        { key: 'median', header: 'Median', path: 'median', format: 'decimal' },
        { key: 'floor', header: 'Floor', path: 'floor', format: 'decimal' },
        { key: 'ceiling', header: 'Ceiling', path: 'ceiling', format: 'decimal' },
        { key: 'stdDev', header: 'Volatility', path: 'stdDev', format: 'decimal' },
      ],
    },
    {
      type: WIDGET_TYPES.meter,
      id: 'matchups',
      title: 'Best teams to face',
      source: 'matchups',
      rowsPath: 'teams',
      labelPath: 'team',
      valuePath: 'score',
      gradePath: 'grade',
      width: WIDGET_WIDTHS.half,
      limit: 6,
    },
    {
      type: WIDGET_TYPES.badges,
      id: 'status',
      title: 'Availability',
      source: 'availability',
      rowsPath: 'players',
      labelPath: 'name',
      statusPath: 'availability',
      notePath: 'status',
      width: WIDGET_WIDTHS.full,
      limit: 6,
    },
  ],
} satisfies DashboardSpec;

const hitter = (
  id: string,
  name: string,
  team: string,
  position: string,
  gamesPlayed: number,
  fantasyPoints: number,
  [homeRuns, rbi, avg, ops, stolenBases]: number[],
) => ({
  id,
  name,
  team,
  position,
  gamesPlayed,
  fantasyPoints,
  fantasyPointsPerGame: Number((fantasyPoints / gamesPlayed).toFixed(2)),
  stats: { homeRuns, rbi, avg, ops, stolenBases },
});

const game = (date: string, opponent: string, isHome: boolean, fantasyPoints: number) => ({
  date,
  opponent,
  isHome,
  fantasyPoints,
});

/**
 * Invented players and numbers. Nothing here is a real stat line — the guide
 * documents the shapes, and a page that fetched live data would look different
 * every day and break when an upstream API did.
 */
export const EXAMPLE_RUN: DashboardRun = {
  ranAt: '2026-09-17T12:00:00.000Z',
  results: {
    leaders: {
      data: {
        rows: [
          hitter('p1', 'M. Okafor', 'SEA', 'OF', 139, 512.4, [38, 104, 0.301, 0.948, 14]),
          hitter('p2', 'D. Salcedo', 'ATL', '1B', 143, 498.1, [34, 112, 0.289, 0.921, 3]),
          hitter('p3', 'R. Tanaka', 'NYM', '2B', 141, 466.8, [19, 71, 0.316, 0.877, 27]),
          hitter('p4', 'K. Boone', 'TEX', 'SS', 138, 451.2, [27, 88, 0.274, 0.842, 18]),
          hitter('p5', 'J. Ferreira', 'LAD', 'C', 121, 392.5, [25, 79, 0.268, 0.833, 2]),
          hitter('p6', 'A. Whitfield', 'CHC', '3B', 145, 388.0, [22, 84, 0.259, 0.795, 9]),
          hitter('p7', 'L. Moreau', 'BOS', 'OF', 133, 371.6, [16, 62, 0.305, 0.861, 21]),
          hitter('p8', 'T. Nakamura', 'SD', 'OF', 136, 349.9, [12, 55, 0.281, 0.778, 31]),
        ],
      },
    },
    head: {
      data: {
        players: [
          {
            id: 'p1',
            name: 'M. Okafor',
            team: 'SEA',
            games: 139,
            fantasyPoints: 512.4,
            pointsPerGame: 3.69,
            floor: -1,
            ceiling: 16,
            volatility: 3.41,
          },
          {
            id: 'p2',
            name: 'D. Salcedo',
            team: 'ATL',
            games: 143,
            fantasyPoints: 498.1,
            pointsPerGame: 3.48,
            floor: 0,
            ceiling: 19,
            volatility: 4.02,
          },
        ],
      },
    },
    log_a: {
      data: {
        player: { id: 'p1', name: 'M. Okafor', team: 'SEA', position: 'OF' },
        fantasyPoints: 512.4,
        pointsPerGame: 3.69,
        consistency: { games: 139, median: 3, stdDev: 3.41, floor: -1, ceiling: 16 },
        games: [
          game('2026-09-05', 'HOU', true, 2),
          game('2026-09-06', 'HOU', true, 7),
          game('2026-09-07', 'HOU', true, 1),
          game('2026-09-09', 'TEX', false, 5),
          game('2026-09-10', 'TEX', false, 11),
          game('2026-09-11', 'TEX', false, 0),
          game('2026-09-13', 'LAA', true, 4),
          game('2026-09-14', 'LAA', true, 3),
          game('2026-09-15', 'OAK', false, 9),
          game('2026-09-16', 'OAK', false, 6),
        ],
      },
    },
    log_b: {
      data: {
        player: { id: 'p2', name: 'D. Salcedo', team: 'ATL', position: '1B' },
        games: [
          game('2026-09-05', 'PHI', false, 6),
          game('2026-09-06', 'PHI', false, 1),
          game('2026-09-07', 'PHI', false, 3),
          game('2026-09-09', 'NYM', true, 12),
          game('2026-09-10', 'NYM', true, 2),
          game('2026-09-11', 'NYM', true, 4),
          game('2026-09-13', 'WSH', true, 8),
          game('2026-09-14', 'WSH', true, 5),
          game('2026-09-15', 'MIA', false, 0),
          game('2026-09-16', 'MIA', false, 7),
        ],
      },
    },
    matchups: {
      data: {
        sport: 'mlb',
        side: 'hitting',
        teams: [
          { team: 'COL', score: 88.4, grade: 'great' },
          { team: 'WSH', score: 76.1, grade: 'good' },
          { team: 'CIN', score: 64.9, grade: 'good' },
          { team: 'PIT', score: 52.3, grade: 'neutral' },
          { team: 'MIL', score: 31.7, grade: 'tough' },
          { team: 'LAD', score: 14.2, grade: 'brutal' },
        ],
      },
    },
    availability: {
      data: {
        sport: 'mlb',
        players: [
          { playerId: 'p1', name: 'M. Okafor', team: 'SEA', availability: 'active', status: 'Active' },
          { playerId: 'p2', name: 'D. Salcedo', team: 'ATL', availability: 'injured', status: 'Injured 10-Day' },
          { playerId: 'p3', name: 'R. Tanaka', team: 'NYM', availability: 'active', status: 'Active' },
          { playerId: 'p4', name: 'K. Boone', team: 'TEX', availability: 'injured', status: 'Injured 60-Day' },
          { playerId: 'p5', name: 'J. Ferreira', team: 'LAD', availability: 'minors', status: 'Optioned to Triple-A' },
          { playerId: 'p7', name: 'L. Moreau', team: 'BOS', availability: 'inactive', status: 'Paternity Leave' },
        ],
      },
    },
  },
};

export const EXAMPLE_SPEC_JSON = JSON.stringify(EXAMPLE_SPEC, null, 2);
