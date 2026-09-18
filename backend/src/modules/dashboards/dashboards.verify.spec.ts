import { WIDGET_TYPES } from './dashboards.constants.js';
import type { DashboardRun, DashboardSpec } from './dashboards.types.js';
import { reviewSpec } from './dashboards.verify.js';

const run = (results: Record<string, { data?: unknown; error?: string }>): DashboardRun => ({
  ranAt: '2026-09-17T00:00:00.000Z',
  results,
});

const spec = (widget: Record<string, unknown>): DashboardSpec =>
  ({
    title: 'Probe',
    sources: [{ id: 'src', tool: 'get_leaderboard', args: {} }],
    widgets: [widget],
  }) as unknown as DashboardSpec;

const table = (over: Record<string, unknown> = {}) => ({
  type: WIDGET_TYPES.table,
  id: 'tbl',
  title: 'Table',
  source: 'src',
  columns: [
    { key: 'name', header: 'Player', path: 'name' },
    { key: 'hr', header: 'HR', path: 'stats.homeRuns' },
  ],
  ...over,
});

const LEADERS = { rows: [{ name: 'Judge', stats: { homeRuns: 40 } }] };

describe('reviewSpec', () => {
  it('passes a spec whose paths all resolve', () => {
    const { problems, notes } = reviewSpec(
      spec(table({ rowsPath: 'rows' })),
      run({ src: { data: LEADERS } }),
    );

    expect(problems).toEqual([]);
    expect(notes).toEqual([]);
  });

  it('points a widget at the key that holds the rows when rowsPath is wrong', () => {
    // compare_players answers with "players", not "rows" — the commonest way a
    // spec that validates perfectly still renders an empty widget.
    const { spec: fixed, problems, notes } = reviewSpec(
      spec(table({ rowsPath: 'rows' })),
      run({ src: { data: { players: [{ name: 'Judge', stats: { homeRuns: 40 } }] } } }),
    );

    expect(problems).toEqual([]);
    expect(notes[0]).toContain('reading "players" instead');
    expect(fixed.widgets[0]).toMatchObject({ rowsPath: 'players' });
  });

  it('fills in a missing rowsPath rather than defaulting to "rows"', () => {
    const { spec: fixed, problems } = reviewSpec(
      spec(table()),
      run({ src: { data: { games: [{ name: 'Judge', stats: { homeRuns: 2 } }] } } }),
    );

    expect(problems).toEqual([]);
    expect(fixed.widgets[0]).toMatchObject({ rowsPath: 'games' });
  });

  it('reports a column path no row has, with the fields that do exist', () => {
    const { problems } = reviewSpec(
      spec(table({ columns: [{ key: 'hr', header: 'HR', path: 'stats.hr' }] })),
      run({ src: { data: LEADERS } }),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('"stats.hr"');
    // The fix is named, not just the fault.
    expect(problems[0]).toContain('stats.homeRuns');
  });

  it('accepts a source that legitimately returned nothing', () => {
    const { problems, notes } = reviewSpec(
      spec(table()),
      run({ src: { data: { rows: [] } } }),
    );

    expect(problems).toEqual([]);
    expect(notes[0]).toContain('no rows');
  });

  it('reports a failed source without blaming the spec', () => {
    const { problems, notes } = reviewSpec(
      spec(table()),
      run({ src: { error: 'upstream timed out' } }),
    );

    expect(problems).toEqual([]);
    expect(notes[0]).toContain('upstream timed out');
  });

  it('treats a column that is null on every row as missing', () => {
    // MLB game rows carry week: null, so a chart with week on its x axis draws
    // every game at the same empty category — present, but not renderable.
    const { problems } = reviewSpec(
      spec({
        type: WIDGET_TYPES.line,
        id: 'trend',
        title: 'Trend',
        source: 'src',
        rowsPath: 'games',
        x: { path: 'week' },
        series: [{ key: 'pts', label: 'Points', path: 'fantasyPoints' }],
      }),
      run({ src: { data: { games: [{ week: null, date: '2026-05-11', fantasyPoints: 8 }] } } }),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('"week"');
    expect(problems[0]).toContain('date');
  });

  it('lets stat tiles read the result root as well as their own object', () => {
    // A KPI row straddles the two: points is top-level, floor is in consistency.
    const { problems } = reviewSpec(
      spec({
        type: WIDGET_TYPES.stats,
        id: 'kpi',
        title: 'KPIs',
        source: 'src',
        path: 'consistency',
        tiles: [
          { key: 'pts', header: 'Points', path: 'fantasyPoints' },
          { key: 'floor', header: 'Floor', path: 'floor' },
        ],
      }),
      run({ src: { data: { fantasyPoints: 310, consistency: { floor: 2 } } } }),
    );

    expect(problems).toEqual([]);
  });

  it('checks a stats widget against the object its tiles read', () => {
    const data = { consistency: { floor: 2, ceiling: 30 } };
    const tiles = [{ key: 'floor', header: 'Floor', path: 'floor' }];

    const ok = reviewSpec(
      spec({
        type: WIDGET_TYPES.stats,
        id: 'kpi',
        title: 'KPIs',
        source: 'src',
        path: 'consistency',
        tiles,
      }),
      run({ src: { data } }),
    );
    expect(ok.problems).toEqual([]);

    const bad = reviewSpec(
      spec({
        type: WIDGET_TYPES.stats,
        id: 'kpi',
        title: 'KPIs',
        source: 'src',
        path: 'summary',
        tiles,
      }),
      run({ src: { data } }),
    );
    expect(bad.problems[0]).toContain('"summary"');
  });

  it('checks a series against its own source, not the widget\'s', () => {
    const { problems } = reviewSpec(
      {
        title: 'Two logs',
        sources: [
          { id: 'a', tool: 'get_player_stats', args: {} },
          { id: 'b', tool: 'get_player_stats', args: {} },
        ],
        widgets: [
          {
            type: WIDGET_TYPES.line,
            id: 'trend',
            title: 'Trend',
            source: 'a',
            rowsPath: 'games',
            x: { path: 'week' },
            series: [
              { key: 'a', label: 'A', path: 'fantasyPoints' },
              { key: 'b', label: 'B', path: 'points', source: 'b' },
            ],
          },
        ],
      } as unknown as DashboardSpec,
      run({
        a: { data: { games: [{ week: 1, fantasyPoints: 20 }] } },
        // The second log spells its value differently, and that is what makes
        // the series valid — checking it against source "a" would reject it.
        b: { data: { games: [{ week: 1, points: 18 }] } },
      }),
    );

    expect(problems).toEqual([]);
  });

  it('reports a series path that is on no row of its own source', () => {
    const { problems } = reviewSpec(
      {
        title: 'Two logs',
        sources: [
          { id: 'a', tool: 'get_player_stats', args: {} },
          { id: 'b', tool: 'get_player_stats', args: {} },
        ],
        widgets: [
          {
            type: WIDGET_TYPES.line,
            id: 'trend',
            title: 'Trend',
            source: 'a',
            rowsPath: 'games',
            x: { path: 'week' },
            series: [
              { key: 'a', label: 'A', path: 'fantasyPoints' },
              { key: 'b', label: 'B', path: 'points', source: 'b' },
            ],
          },
        ],
      } as unknown as DashboardSpec,
      run({
        a: { data: { games: [{ week: 1, fantasyPoints: 20 }] } },
        b: { data: { games: [{ week: 1, fantasyPoints: 18 }] } },
      }),
    );

    // The widget's own source has the series' paths; "points" is on neither.
    expect(problems[0]).toContain('"points"');
  });
});
