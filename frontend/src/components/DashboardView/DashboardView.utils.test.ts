import {
  WIDGET_TYPES,
  type ChartWidget,
  type DashboardSpec,
  type TableWidget,
} from '@/api/dashboards';
import { EMPTY_STAT } from '@/utils';
import {
  bestValue,
  blankReason,
  chartPoints,
  compareValues,
  formatCell,
  getPath,
  resolveRows,
  resolveTableRows,
  statusTone,
  widgetSources,
} from './DashboardView.utils';

const table: TableWidget = {
  type: WIDGET_TYPES.table,
  id: 'hitters',
  title: 'Hitters',
  source: 'top',
  columns: [{ key: 'name', header: 'Player', path: 'name' }],
};

describe('getPath', () => {
  it('reads a nested value', () => {
    expect(getPath({ stats: { hr: 41 } }, 'stats.hr')).toBe(41);
  });

  it('returns undefined for a path that is not there', () => {
    expect(getPath({ stats: {} }, 'stats.hr.deep')).toBeUndefined();
  });
});

describe('formatCell', () => {
  it('formats numbers by the column format', () => {
    expect(formatCell(0.312, 'rate')).toBe('.312');
    expect(formatCell(1234, 'int')).toBe('1,234');
  });

  it('passes text through and marks missing values', () => {
    expect(formatCell('LAD', 'text')).toBe('LAD');
    expect(formatCell(undefined, 'int')).toBe(EMPTY_STAT);
  });
});

describe('resolveRows', () => {
  it('reads the rows array', () => {
    expect(resolveRows({ rows: [{ id: '1' }] })).toEqual([{ id: '1' }]);
  });

  it('treats a single-object result as one row', () => {
    expect(resolveRows({ id: '1', name: 'Ohtani' }, 'player')).toEqual([
      { id: '1', name: 'Ohtani' },
    ]);
  });

  // Tools name their array for what it holds, and a spec may omit rowsPath
  // entirely — defaulting to "rows" left those widgets rendering the envelope.
  it.each([
    ['players', { players: [{ name: 'Judge' }] }],
    ['games', { games: [{ date: '2026-04-01' }] }],
    ['teams', { teams: [{ team: 'NYY' }] }],
    ['pitchers', { pitchers: [{ matchupScore: 60 }] }],
  ])('finds the %s array when no rowsPath is given', (_key, data) => {
    expect(resolveRows(data)).toHaveLength(1);
  });

  it('falls back to the real array when rowsPath names nothing', () => {
    expect(resolveRows({ teams: [{ team: 'NYY' }] }, 'rows')).toEqual([
      { team: 'NYY' },
    ]);
  });

  it('leaves an envelope with several arrays alone rather than guessing', () => {
    const data = { alpha: [{ a: 1 }], beta: [{ b: 2 }] };
    expect(resolveRows(data)).toEqual([data]);
  });
});

describe('blankReason', () => {
  it('says nothing when a path resolves', () => {
    expect(blankReason(table, [{ name: 'Judge' }])).toBeUndefined();
  });

  it('names the paths that missed and the fields that exist', () => {
    const reason = blankReason(table, [{ player: 'Judge', stats: { hr: 40 } }]);

    expect(reason?.paths).toEqual(['name']);
    expect(reason?.fields).toEqual(['player', 'stats']);
  });

  it('stays quiet when only some paths miss, so a partial widget still renders', () => {
    const widget: TableWidget = {
      ...table,
      columns: [
        { key: 'name', header: 'Player', path: 'name' },
        { key: 'hr', header: 'HR', path: 'stats.hr' },
      ],
    };

    expect(blankReason(widget, [{ name: 'Judge' }])).toBeUndefined();
  });
});

describe('resolveTableRows', () => {
  const spec: DashboardSpec = {
    title: 'Hitters',
    sources: [{ id: 'top', tool: 'get_leaderboard', args: {} }],
    widgets: [table],
  };

  it('keys rows so a selection survives sorting', () => {
    const rows = resolveTableRows(spec, {
      ranAt: '2026-09-16T00:00:00.000Z',
      results: { top: { data: { rows: [{ id: '660271', name: 'Ohtani' }] } } },
    });

    expect(rows.hitters).toEqual([
      { key: '660271', data: { id: '660271', name: 'Ohtani' } },
    ]);
  });

  it('gives a table with no data an empty row list', () => {
    expect(resolveTableRows(spec)).toEqual({ hitters: [] });
  });
});

describe('compareValues', () => {
  it('sorts numerically when both sides are numbers', () => {
    expect(compareValues(9, 10)).toBeLessThan(0);
  });

  it('falls back to alphabetical', () => {
    expect(compareValues('Acuna', 'Betts')).toBeLessThan(0);
  });
});

describe('chartPoints', () => {
  const chart: ChartWidget = {
    type: WIDGET_TYPES.line,
    id: 'trend',
    title: 'Weekly points',
    source: 'log_a',
    rowsPath: 'games',
    x: { path: 'week' },
    series: [
      { key: 'a', label: 'Barkley', path: 'fantasyPoints' },
      { key: 'b', label: 'Gibbs', path: 'fantasyPoints', source: 'log_b' },
    ],
  };

  const run = {
    ranAt: '2026-09-16T12:00:00.000Z',
    results: {
      log_a: { data: { games: [{ week: 2, fantasyPoints: 18.4 }, { week: 1, fantasyPoints: 9 }] } },
      log_b: { data: { games: [{ week: 1, fantasyPoints: 12.2 }] } },
    },
  };

  it('reads each series from its own source', () => {
    expect(chartPoints(chart, run)).toEqual([
      { x: 2, y: 18.4, series: 'Barkley' },
      { x: 1, y: 9, series: 'Barkley' },
      { x: 1, y: 12.2, series: 'Gibbs' },
    ]);
  });

  it('drops points whose value is not a number, rather than plotting them as zero', () => {
    const withGap = {
      ...run,
      results: {
        ...run.results,
        log_a: { data: { games: [{ week: 1, fantasyPoints: null }] } },
      },
    };

    expect(chartPoints(chart, withGap).filter(({ series }) => series === 'Barkley')).toEqual([]);
  });
});

describe('widgetSources', () => {
  it('lists every source a chart reads', () => {
    expect(
      widgetSources({
        type: WIDGET_TYPES.bar,
        id: 'bars',
        title: 'Points',
        source: 'top',
        x: { path: 'name' },
        series: [
          { key: 'a', label: 'A', path: 'points' },
          { key: 'b', label: 'B', path: 'points', source: 'other' },
        ],
      }),
    ).toEqual(['top', 'other']);
  });

  it('gives a compare widget no sources of its own', () => {
    expect(
      widgetSources({
        type: WIDGET_TYPES.compare,
        id: 'vs',
        title: 'Compare',
        from: 'hitters',
      }),
    ).toEqual([]);
  });
});

describe('bestValue', () => {
  it('picks the highest by default and the lowest where less is better', () => {
    expect(bestValue([12, 18.4])).toBe(18.4);
    expect(bestValue([12, 18.4], 'lower')).toBe(12);
  });

  it('marks no winner on a tie or a lone value', () => {
    expect(bestValue([12, 12])).toBeUndefined();
    expect(bestValue([12, undefined])).toBeUndefined();
  });
});

describe('statusTone', () => {
  it('maps league wording onto the reserved status colors', () => {
    expect(statusTone('Active')).toBe('good');
    expect(statusTone('60-day IL')).toBe('critical');
    expect(statusTone('projected')).toBe('warning');
  });

  it('leaves anything it does not recognise neutral', () => {
    expect(statusTone('paternity list')).toBe('neutral');
  });
});
