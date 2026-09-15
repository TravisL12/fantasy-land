import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import type { SportCatalog } from '@/api/sports';
import { useStatsFilters } from './SportStatsPage.hooks';

const catalog = {
  key: 'nfl',
  seasons: ['2026', '2025'],
  defaultSeason: '2026',
  weeks: [1, 2],
  dataKinds: ['stats', 'projections'],
  groups: [
    { key: 'offense', positions: ['QB', 'WR'], stats: [], defaultStats: [] },
  ],
  scoringPresets: [{ key: 'ppr', label: 'PPR', rules: {} }],
} as unknown as SportCatalog;

const renderFilters = (initialEntry = '/sports/nfl') =>
  renderHook(() => useStatsFilters(catalog), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    ),
  });

describe('useStatsFilters', () => {
  it('round-trips every filter through the URL', () => {
    const { result } = renderFilters('/sports/nfl?page=3');

    act(() =>
      result.current.setFilters({
        search: 'allen',
        season: '2025',
        week: 2,
        position: 'WR',
        kind: 'projections',
        minGames: 5,
      }),
    );

    expect(result.current.filters).toMatchObject({
      search: 'allen',
      season: '2025',
      week: 2,
      position: 'WR',
      kind: 'projections',
      minGames: 5,
      page: 1,
    });
  });

  it('flips sort order when the same column is sorted again', () => {
    const { result } = renderFilters();

    act(() => result.current.toggleSort('rec_yd'));
    expect(result.current.filters).toMatchObject({
      sort: 'rec_yd',
      order: 'desc',
    });

    act(() => result.current.toggleSort('rec_yd'));
    expect(result.current.filters.order).toBe('asc');
  });
});
