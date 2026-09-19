import { screen } from '@testing-library/react';
import { Outlet, Route, Routes } from 'react-router';
import type { ScheduleResponse, SportCatalog } from '@/api/sports';
import type { SportOutletContext } from '@/pages/SportPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SportSchedulePage } from './SportSchedulePage';

const catalog = (weeks: number[] | null): SportCatalog =>
  ({
    key: weeks ? 'nfl' : 'mlb',
    league: weeks ? 'NFL' : 'MLB',
    seasons: ['2026'],
    defaultSeason: '2026',
    weeks,
    groups: [],
  }) as unknown as SportCatalog;

const game = (over: Partial<ScheduleResponse['games'][number]> = {}) => ({
  gameId: '1',
  date: '2026-09-19',
  week: null,
  status: 'Final',
  home: 'NYY',
  away: 'BOS',
  probables: { home: null, away: null },
  score: null,
  ...over,
});

const respond = (body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );

/** The real nesting: the sport layout hands the catalog down through Outlet. */
const renderPage = (weeks: number[] | null, route = '/sports/x/schedule') =>
  renderWithProviders(
    <Routes>
      <Route
        path="/sports/:sport"
        element={
          <Outlet
            context={{ catalog: catalog(weeks) } satisfies SportOutletContext}
          />
        }
      >
        <Route path="schedule" element={<SportSchedulePage />} />
      </Route>
    </Routes>,
    { route },
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SportSchedulePage', () => {
  it('shows a final score and leaves a live game without one', async () => {
    respond({
      sport: 'mlb',
      season: '2026',
      games: [
        game({ score: { home: 5, away: 3 } }),
        game({ gameId: '2', status: 'In Progress' }),
      ],
    });
    renderPage(null);

    expect(await screen.findByText('3–5')).toBeVisible();
    expect(screen.getByText('In Progress')).toBeVisible();
  });

  it('offers a week picker and a week column to a sport with weeks', async () => {
    respond({ sport: 'nfl', season: '2026', weeks: [3], games: [game({ week: 3 })] });
    renderPage([1, 2, 3]);

    expect(await screen.findByLabelText('Week')).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Week' }),
    ).toBeVisible();
  });

  /**
   * Dates are the only index a sport without weeks has, and the starter
   * columns only appear where somebody is actually announced.
   */
  it('offers dates and starter columns to a sport without weeks', async () => {
    respond({
      sport: 'mlb',
      season: '2026',
      startDate: '2026-09-19',
      endDate: '2026-09-21',
      games: [
        game({
          probables: {
            home: {
              playerId: '9',
              name: 'Ace Pitcher',
              team: 'NYY',
              opponent: 'BOS',
              isHome: true,
              matchup: { score: 72, grade: 'good', metrics: [] },
            },
            away: null,
          },
        }),
      ],
    });
    renderPage(null);

    expect(await screen.findByText('Ace Pitcher')).toBeVisible();
    expect(screen.getByText('vs BOS · good (72)')).toBeVisible();
    expect(screen.queryByLabelText('Week')).toBeNull();
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-19');
  });
});
