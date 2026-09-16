import { fireEvent, screen } from '@testing-library/react';
import { CHAT_EVENTS } from '@/api/chat';
import { DASHBOARD_EVENTS, WIDGET_TYPES } from '@/api/dashboards';
import { COMPOSER_COPY } from '@/components/ChatComposer';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardCreatePage } from './DashboardCreatePage';
import { CREATE_COPY } from './DashboardCreatePage.constants';

const SPEC = {
  title: 'Top hitters',
  sources: [{ id: 'top', tool: 'get_leaderboard', args: { sport: 'mlb' } }],
  widgets: [
    {
      type: WIDGET_TYPES.table,
      id: 'hitters',
      title: 'Hitters',
      source: 'top',
      columns: [{ key: 'name', header: 'Player', path: 'name', format: 'text' }],
    },
  ],
};

const EVENTS = [
  { type: CHAT_EVENTS.toolCall, call: { id: 'c1', name: 'get_leaderboard', arguments: {} } },
  { type: CHAT_EVENTS.toolResult, id: 'c1', name: 'get_leaderboard', isError: false, text: '{}' },
  { type: DASHBOARD_EVENTS.spec, spec: SPEC },
  { type: CHAT_EVENTS.token, text: 'Built a table of hitters.' },
  { type: CHAT_EVENTS.done },
];

const sse = (events: unknown[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      },
    }),
    { status: 200 },
  );

/** The build stream, then the run the preview kicks off once it has a spec. */
const stubFetch = () => {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    return url.includes('/dashboards/build')
      ? sse(EVENTS)
      : new Response(
          JSON.stringify({
            ranAt: '2026-09-16T12:00:00.000Z',
            results: { top: { data: { rows: [{ id: '1', name: 'Ohtani' }] } } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
  });
  vi.stubGlobal('fetch', mock);
  return mock;
};

describe('DashboardCreatePage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('previews the dashboard the builder returns, with live data', async () => {
    stubFetch();
    renderWithProviders(<DashboardCreatePage />);

    expect(screen.getByText(CREATE_COPY.empty)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(CREATE_COPY.placeholder), {
      target: { value: 'top mlb hitters' },
    });
    fireEvent.click(screen.getByRole('button', { name: COMPOSER_COPY.send }));

    expect(await screen.findByRole('table', { name: 'Hitters' })).toBeInTheDocument();
    expect(await screen.findByText('Ohtani')).toBeInTheDocument();
    // The tool the model called is shown, as on the chat page.
    expect(screen.getByText('get_leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CREATE_COPY.save })).toBeInTheDocument();
  });
});
