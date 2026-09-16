import { fireEvent, screen } from '@testing-library/react';
import { COMPOSER_COPY } from '@/components/ChatComposer';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ChatPage } from './ChatPage';
import { CHAT_COPY } from './ChatPage.constants';

const STATUS = {
  model: 'qwen3.5:9b-q4_K_M',
  baseUrl: 'http://host.docker.internal:11434',
  available: true,
  modelAvailable: true,
  models: ['qwen3.5:9b-q4_K_M'],
  tools: [
    { name: 'find_player', source: 'fantasy-land', description: '' },
    { name: 'get_nfl_state', source: 'sleeper', description: '' },
  ],
};

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

/** Answers the status query and the stream from one stubbed fetch. */
const stubFetch = (events: unknown[]) => {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = typeof input === 'string' ? input : (input as Request).url;
    return url.includes('/chat/status')
      ? new Response(JSON.stringify(STATUS), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      : sse(events);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
};

const ask = (question: string) => {
  fireEvent.change(screen.getByLabelText(CHAT_COPY.placeholder), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole('button', { name: COMPOSER_COPY.send }));
};

describe('ChatPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('streams the answer and shows the tool calls behind it', async () => {
    stubFetch([
      { type: 'tool_call', call: { id: 't1', name: 'get_nfl_state', arguments: {} } },
      { type: 'tool_result', id: 't1', name: 'get_nfl_state', isError: false, text: '{"week":2}' },
      { type: 'token', text: 'It is week 2.' },
      { type: 'done' },
    ]);
    renderWithProviders(<ChatPage />);

    ask('what week is it?');

    expect(await screen.findByText('It is week 2.')).toBeInTheDocument();
    expect(screen.getByText('what week is it?')).toBeInTheDocument();
    expect(screen.getByText('get_nfl_state')).toBeInTheDocument();
    expect(screen.getByText('{"week":2}')).toBeInTheDocument();
  });

  it('sends the earlier turns back as history', async () => {
    const fetchMock = stubFetch([{ type: 'token', text: 'Week 2.' }, { type: 'done' }]);
    renderWithProviders(<ChatPage />);

    ask('what week is it?');
    await screen.findByText('Week 2.');
    ask('and next week?');
    await screen.findAllByText('Week 2.');

    const streamCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'POST',
    );
    const body = JSON.parse(String(streamCalls.at(-1)?.[1]?.body));
    expect(body.messages).toEqual([
      { role: 'user', content: 'what week is it?' },
      { role: 'assistant', content: 'Week 2.' },
      { role: 'user', content: 'and next week?' },
    ]);
  });

  it('renders a streamed markdown table, not raw pipes', async () => {
    stubFetch([
      { type: 'token', text: '| Player | PPR |\n| --- | --- |\n' },
      { type: 'token', text: '| Puka Nacua | 375 |\n' },
      { type: 'done' },
    ]);
    renderWithProviders(<ChatPage />);

    ask('top WR?');

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Puka Nacua' })).toBeInTheDocument();
  });

  it('leaves the user\'s own text literal', async () => {
    stubFetch([{ type: 'token', text: 'ok' }, { type: 'done' }]);
    renderWithProviders(<ChatPage />);

    ask('compare **Bijan** and Gibbs');

    expect(
      await screen.findByText('compare **Bijan** and Gibbs'),
    ).toBeInTheDocument();
  });

  it('surfaces a model error', async () => {
    stubFetch([
      { type: 'error', message: 'Could not reach Ollama' },
      { type: 'done' },
    ]);
    renderWithProviders(<ChatPage />);

    ask('hi');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach Ollama',
    );
  });

  it('shows which local model is answering', async () => {
    stubFetch([{ type: 'done' }]);
    renderWithProviders(<ChatPage />);

    expect(await screen.findByText(STATUS.model)).toBeInTheDocument();
    expect(await screen.findByText('fantasy-land: 1 tool')).toBeInTheDocument();
    expect(await screen.findByText('sleeper: 1 tool')).toBeInTheDocument();
  });
});
