import { CHAT_EVENTS } from './chat.constants';
import { streamChat } from './chat.stream';
import type { ChatStreamEvent } from './chat.types';

/** Feeds the body in arbitrary slices so frames split across reads. */
const sseResponse = (chunks: string[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200 },
  );

const collect = async (signal: AbortSignal) => {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamChat([], signal)) events.push(event);
  return events;
};

describe('streamChat', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reassembles events split across reads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'data: {"type":"token","te',
          'xt":"Week "}\n\ndata: {"type":"token","text":"2"}\n\n',
          'data: {"type":"done"}\n\n',
        ]),
      ),
    );

    await expect(collect(new AbortController().signal)).resolves.toEqual([
      { type: CHAT_EVENTS.token, text: 'Week ' },
      { type: CHAT_EVENTS.token, text: '2' },
      { type: CHAT_EVENTS.done },
    ]);
  });

  it('posts the conversation to the stream endpoint', async () => {
    const fetchMock = vi.fn(async () => sseResponse(['data: {"type":"done"}\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const messages = [{ role: 'user' as const, content: 'hi' }];
    for await (const _ of streamChat(messages, new AbortController().signal));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/chat/stream');
    expect(JSON.parse(init.body as string)).toEqual({ messages });
  });

  it('throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    await expect(collect(new AbortController().signal)).rejects.toThrow('500');
  });
});
