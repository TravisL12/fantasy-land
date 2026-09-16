import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { WIDGET_TYPES, type DashboardSpec } from '@/api/dashboards';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardView } from './DashboardView';
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
});
