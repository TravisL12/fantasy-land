import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { WIDGET_TYPES, type DashboardSpec } from '@/api/dashboards';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardView } from './DashboardView';
import { CHART_COPY } from '@/components/Chart';
import { DASHBOARD_VIEW_COPY } from './DashboardView.constants';

const SPEC: DashboardSpec = {
  title: 'Top hitters',
  sources: [{ id: 'top', tool: 'get_leaderboard', args: { sport: 'mlb' } }],
  widgets: [
    {
      type: WIDGET_TYPES.table,
      id: 'hitters',
      title: 'Hitters',
      source: 'top',
      selectable: true,
      columns: [
        { key: 'name', header: 'Player', path: 'name', format: 'text' },
        { key: 'hr', header: 'HR', path: 'stats.hr', format: 'int' },
      ],
    },
    {
      type: WIDGET_TYPES.compare,
      id: 'versus',
      title: 'Selected hitters',
      from: 'hitters',
    },
  ],
};

const ROWS = [
  { id: '1', name: 'Ohtani', stats: { hr: 41 } },
  { id: '2', name: 'Judge', stats: { hr: 53 } },
];

const stubRun = () => {
  const mock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          ranAt: '2026-09-16T12:00:00.000Z',
          results: { top: { data: { rows: ROWS } } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
};

const RICH_SPEC: DashboardSpec = {
  title: 'Barkley vs Gibbs',
  sources: [
    { id: 'head', tool: 'compare_players', args: { sport: 'nfl' } },
    { id: 'log', tool: 'get_player_game_log', args: { sport: 'nfl' } },
  ],
  widgets: [
    {
      type: WIDGET_TYPES.versus,
      id: 'vs',
      title: 'Head to head',
      source: 'head',
      rowsPath: 'players',
      metrics: [
        { key: 'ppg', header: 'PPG', path: 'pointsPerGame', format: 'decimal' },
        { key: 'vol', header: 'Volatility', path: 'volatility', format: 'decimal', better: 'lower' },
      ],
    },
    {
      type: WIDGET_TYPES.stats,
      id: 'headline',
      title: 'Season',
      source: 'log',
      path: 'consistency',
      width: 'half',
      tiles: [{ key: 'avg', header: 'Points per game', path: 'average', format: 'decimal' }],
    },
    {
      type: WIDGET_TYPES.meter,
      id: 'matchup',
      title: 'Matchups',
      source: 'head',
      rowsPath: 'players',
      labelPath: 'name',
      valuePath: 'matchupScore',
      gradePath: 'grade',
      width: 'half',
    },
    {
      type: WIDGET_TYPES.badges,
      id: 'status',
      title: 'Availability',
      source: 'head',
      rowsPath: 'players',
      statusPath: 'availability',
      notePath: 'note',
      width: 'half',
    },
    {
      type: WIDGET_TYPES.line,
      id: 'trend',
      title: 'Weekly points',
      source: 'log',
      rowsPath: 'games',
      x: { path: 'week', label: 'Week' },
      series: [{ key: 'pts', label: 'Barkley', path: 'fantasyPoints', format: 'decimal' }],
    },
  ],
};

const RICH_RESULTS = {
  head: {
    data: {
      players: [
        {
          name: 'Barkley',
          pointsPerGame: 18.4,
          volatility: 7.1,
          matchupScore: 82,
          grade: 'A',
          availability: 'active',
          note: 'Full practice',
        },
        {
          name: 'Gibbs',
          pointsPerGame: 16.2,
          volatility: 5.3,
          matchupScore: 41,
          grade: 'C',
          availability: 'questionable',
        },
      ],
    },
  },
  log: {
    data: {
      consistency: { average: 18.4 },
      games: [
        { week: 1, fantasyPoints: 9 },
        { week: 2, fantasyPoints: 18.4 },
      ],
    },
  },
};

const stubRichRun = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ranAt: '2026-09-16T12:00:00.000Z', results: RICH_RESULTS }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
};

const table = () => screen.getByRole('table', { name: 'Hitters' });

describe('DashboardView', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs the spec and renders the rows it came back with', async () => {
    const fetchMock = stubRun();
    renderWithProviders(<DashboardView spec={SPEC} />);

    expect(await screen.findByText('Ohtani')).toBeInTheDocument();
    expect(within(table()).getByText('53')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('re-fetches on refresh, because the spec is saved and the data is not', async () => {
    const fetchMock = stubRun();
    renderWithProviders(<DashboardView spec={SPEC} />);
    await screen.findByText('Ohtani');

    fireEvent.click(screen.getByRole('button', { name: DASHBOARD_VIEW_COPY.refresh }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('sorts by a column when its header is clicked', async () => {
    stubRun();
    renderWithProviders(<DashboardView spec={SPEC} />);
    await screen.findByText('Ohtani');

    fireEvent.click(screen.getByRole('button', { name: /HR/ }));

    const [, firstRow] = within(table()).getAllByRole('row');
    expect(within(firstRow).getByText('Judge')).toBeInTheDocument();
  });

  it('feeds the compare panel from the rows the user ticks', async () => {
    stubRun();
    renderWithProviders(<DashboardView spec={SPEC} />);
    await screen.findByText('Ohtani');

    expect(screen.getByText(DASHBOARD_VIEW_COPY.comparePrompt)).toBeInTheDocument();

    const [first] = screen.getAllByLabelText(DASHBOARD_VIEW_COPY.selectRow);
    fireEvent.click(first);

    const compare = screen.getByRole('table', { name: 'Selected hitters' });
    expect(within(compare).getByRole('columnheader', { name: 'Ohtani' })).toBeInTheDocument();
    expect(within(compare).getByText('41')).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_VIEW_COPY.selected(1))).toBeInTheDocument();
  });

  it('compares two entities straight from a source, marking the better value', async () => {
    stubRichRun();
    renderWithProviders(<DashboardView spec={RICH_SPEC} />);

    const versus = await screen.findByRole('table', { name: 'Head to head' });
    expect(within(versus).getByRole('columnheader', { name: 'Barkley' })).toBeInTheDocument();

    // Higher points per game wins; lower volatility wins.
    const [, ppg, volatility] = within(versus).getAllByRole('row');
    expect(within(ppg).getByText('18.40')).toBeInTheDocument();
    expect(within(volatility).getByText('5.30')).toBeInTheDocument();
  });

  it('renders stat tiles, meters and status chips from the same run', async () => {
    stubRichRun();
    renderWithProviders(<DashboardView spec={RICH_SPEC} />);

    expect(await screen.findByText('Points per game')).toBeInTheDocument();
    expect(screen.getAllByText('18.40').length).toBeGreaterThan(0);
    expect(screen.getByText(/82 · A/)).toBeInTheDocument();
    expect(screen.getAllByRole('meter')).toHaveLength(2);
    expect(screen.getByText('questionable')).toBeInTheDocument();
    expect(screen.getByText('Full practice')).toBeInTheDocument();
  });

  it('keeps a chart\'s values reachable without hovering', async () => {
    stubRichRun();
    renderWithProviders(<DashboardView spec={RICH_SPEC} />);
    await screen.findByText('Points per game');

    fireEvent.click(screen.getByRole('button', { name: CHART_COPY.showData }));

    const data = screen.getByRole('table', { name: /Weekly points/ });
    expect(within(data).getByText('18.40')).toBeInTheDocument();
  });

  it('reports a failed source in place, leaving the rest of the dashboard usable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ranAt: '2026-09-16T12:00:00.000Z',
              results: { ...RICH_RESULTS, head: { error: 'upstream timed out' } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    renderWithProviders(<DashboardView spec={RICH_SPEC} />);

    // Three widgets read that source; the two that read the other still render.
    expect(await screen.findAllByText(/upstream timed out/)).toHaveLength(3);
    expect(screen.getByText('Points per game')).toBeInTheDocument();
  });
});
