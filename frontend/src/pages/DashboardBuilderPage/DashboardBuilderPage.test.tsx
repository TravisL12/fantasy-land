import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { CHAT_EVENTS } from '@/api/chat';
import { DASHBOARD_EVENTS, WIDGET_TYPES } from '@/api/dashboards';
import { COMPOSER_COPY } from '@/components/ChatComposer';
import { ROUTES, buildDashboardEditPath } from '@/router/routes.constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardBuilderPage } from './DashboardBuilderPage';
import {
  BUILDER_COPY,
  BUILDER_MODES,
} from './DashboardBuilderPage.constants';

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

const DASHBOARD_ID = '11111111-1111-4111-8111-111111111111';

const SAVED = {
  id: DASHBOARD_ID,
  title: SPEC.title,
  description: null,
  prompt: 'top mlb hitters',
  spec: SPEC,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
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

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const RUN = {
  ranAt: '2026-09-16T12:00:00.000Z',
  results: { top: { data: { rows: [{ id: '1', name: 'Ohtani' }] } } },
};

/** One call the page made, however it was spelled: fetch(url, init) or Request. */
interface Recorded {
  url: string;
  method: string;
  body?: { spec?: unknown; prompt?: string };
}

/** The build stream, the saved dashboard, and the run the preview kicks off. */
const stubFetch = () => {
  const requests: Recorded[] = [];
  // RTK Query hands fetch a Request; streamSse passes a url and an init.
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = request?.url ?? String(input);
    const body = request ? await request.clone().text() : String(init?.body ?? '');
    requests.push({
      url,
      method: request?.method ?? init?.method ?? 'GET',
      body: body ? JSON.parse(body) : undefined,
    });

    if (url.includes('/dashboards/build')) return sse(EVENTS);
    if (url.includes('/dashboards/run')) return json(RUN);
    return json(SAVED);
  });
  vi.stubGlobal('fetch', mock);
  return requests;
};

const findRequest = (requests: Recorded[], method: string, endsWith: string) =>
  requests.find(
    (request) => request.method === method && request.url.endsWith(endsWith),
  );

const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText(BUILDER_COPY.placeholder), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: COMPOSER_COPY.send }));
};

describe('DashboardBuilderPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('previews the dashboard the builder returns, with live data', async () => {
    stubFetch();
    renderWithProviders(<DashboardBuilderPage />);

    expect(screen.getByText(BUILDER_COPY.empty)).toBeInTheDocument();

    ask('top mlb hitters');

    expect(await screen.findByRole('table', { name: 'Hitters' })).toBeInTheDocument();
    expect(await screen.findByText('Ohtani')).toBeInTheDocument();
    // The tool the model called is shown, as on the chat page.
    expect(screen.getByText('get_leaderboard')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: BUILDER_MODES.create.save }),
    ).toBeInTheDocument();
  });

  it('saves the request alongside the spec', async () => {
    const requests = stubFetch();
    renderWithProviders(<DashboardBuilderPage />);

    ask('top mlb hitters');
    fireEvent.click(
      await screen.findByRole('button', { name: BUILDER_MODES.create.save }),
    );

    await waitFor(() => {
      const saved = findRequest(requests, 'POST', '/api/dashboards');
      expect(saved?.body?.prompt).toBe('top mlb hitters');
      expect(saved?.body?.spec).toEqual(SPEC);
    });
  });

  it('refines a saved dashboard: the spec rides along and the save is a PATCH', async () => {
    const requests = stubFetch();
    renderWithProviders(
      <Routes>
        <Route path={ROUTES.dashboardEdit} element={<DashboardBuilderPage />} />
      </Routes>,
      { route: buildDashboardEditPath(DASHBOARD_ID) },
    );

    // The saved dashboard is the starting point, not a blank page.
    expect(await screen.findByRole('table', { name: 'Hitters' })).toBeInTheDocument();

    ask('add a bar chart');
    await waitFor(() =>
      expect(
        findRequest(requests, 'POST', '/dashboards/build')?.body?.spec,
      ).toEqual(SPEC),
    );

    fireEvent.click(
      await screen.findByRole('button', { name: BUILDER_MODES.edit.save }),
    );

    await waitFor(() => {
      const patch = findRequest(requests, 'PATCH', `/dashboards/${DASHBOARD_ID}`);
      // The original ask is kept and the refinement appended to it.
      expect(patch?.body?.prompt).toBe('top mlb hitters\n\nadd a bar chart');
    });
  });
});
