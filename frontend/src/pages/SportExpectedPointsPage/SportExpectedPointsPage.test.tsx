import { screen } from '@testing-library/react';
import { Outlet, Route, Routes } from 'react-router';
import type { SportCatalog } from '@/api/sports';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { SportOutletContext } from '@/pages/SportPage';
import { SportExpectedPointsPage } from './SportExpectedPointsPage';

const catalog = {
  key: 'nfl',
  league: 'NFL',
  seasons: ['2026', '2025'],
  defaultSeason: '2026',
  groups: [{ key: 'offense', label: 'Offense', positions: ['QB', 'WR'] }],
  capabilities: {
    schedule: false,
    standings: false,
    leagueData: false,
    expectedPoints: true,
    playerDirectory: true,
  },
} as unknown as SportCatalog;

const board = {
  sport: 'nfl',
  season: '2026',
  week: null,
  group: 'offense',
  scoring: 'ppr',
  models: [{ position: 'WR', observations: 212, rSquared: 0.95 }],
  total: 2,
  rows: [
    {
      player: { id: '1', name: 'Lucky Receiver', team: 'CIN', position: 'WR' },
      gamesPlayed: 12,
      fantasyPoints: 200,
      pointsPerGame: 16.7,
      expectedPoints: 150,
      expectedPointsPerGame: 12.5,
      delta: 50,
      deltaPerGame: 4.2,
      efficiency: 1.33,
      model: 'WR',
      opportunities: {},
    },
    {
      player: { id: '2', name: 'Unlucky Receiver', team: 'PIT', position: 'WR' },
      gamesPlayed: 12,
      fantasyPoints: 100,
      pointsPerGame: 8.3,
      expectedPoints: 140,
      expectedPointsPerGame: 11.7,
      delta: -40,
      deltaPerGame: -3.3,
      efficiency: 0.71,
      model: 'WR',
      opportunities: {},
    },
  ],
};

/** The real nesting: the sport layout hands the catalog down through Outlet. */
const renderPage = (route = '/sports/nfl/expected-points') =>
  renderWithProviders(
    <Routes>
      <Route
        path="/sports/:sport"
        element={<Outlet context={{ catalog } satisfies SportOutletContext} />}
      >
        <Route
          path="expected-points"
          element={<SportExpectedPointsPage />}
        />
      </Route>
    </Routes>,
    { route },
  );

describe('SportExpectedPointsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(board), {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows each player beside what their opportunities were worth', async () => {
    renderPage();

    expect(await screen.findByText('Lucky Receiver')).toBeVisible();
    expect(screen.getByText('+50.0')).toBeVisible();
    expect(screen.getByText('-40.0')).toBeVisible();
  });

  it('says how the expectation was fitted, and that it looks backwards', async () => {
    renderPage();

    expect(await screen.findByText(/not a projection/i)).toBeVisible();
    expect(screen.getByText(/WR: 212 players, R² 0.95/)).toBeVisible();
  });
});
