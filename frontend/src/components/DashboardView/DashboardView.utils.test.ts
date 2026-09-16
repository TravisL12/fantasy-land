import { WIDGET_TYPES, type DashboardSpec, type TableWidget } from '@/api/dashboards';
import { EMPTY_STAT } from '@/utils';
import {
  compareValues,
  formatCell,
  getPath,
  resolveRows,
  resolveTableRows,
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
