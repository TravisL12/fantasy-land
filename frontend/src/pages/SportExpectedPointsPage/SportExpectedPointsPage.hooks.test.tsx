import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { useExpectedPointsFilters } from './SportExpectedPointsPage.hooks';

const renderFilters = (initialEntry = '/sports/nfl/expected-points') =>
  renderHook(() => useExpectedPointsFilters(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    ),
  });

describe('useExpectedPointsFilters', () => {
  it('defaults to the per-game board, best first', () => {
    const { result } = renderFilters();

    expect(result.current.filters.sort).toBe('expectedPointsPerGame');
    expect(result.current.filters.order).toBe('desc');
    expect(result.current.filters.minGames).toBe(3);
  });

  it('reads filters out of the URL', () => {
    const { result } = renderFilters(
      '/sports/nfl/expected-points?season=2024&position=WR&sort=delta&order=asc&minGames=8',
    );

    expect(result.current.filters).toMatchObject({
      season: '2024',
      position: 'WR',
      sort: 'delta',
      order: 'asc',
      minGames: 8,
    });
  });

  it('ignores a sort key the board has no column for', () => {
    const { result } = renderFilters('/sports/nfl/expected-points?sort=homeRuns');

    expect(result.current.filters.sort).toBe('expectedPointsPerGame');
  });

  it('flips the order when the sorted column is clicked again', () => {
    const { result } = renderFilters();

    act(() => result.current.toggleSort('delta'));
    expect(result.current.filters).toMatchObject({
      sort: 'delta',
      order: 'desc',
    });

    act(() => result.current.toggleSort('delta'));
    expect(result.current.filters.order).toBe('asc');

    // A different column starts fresh rather than inheriting the direction.
    act(() => result.current.toggleSort('efficiency'));
    expect(result.current.filters).toMatchObject({
      sort: 'efficiency',
      order: 'desc',
    });
  });
});
