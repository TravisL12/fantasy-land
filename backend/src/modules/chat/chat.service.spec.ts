import type { ChatConfig } from '../../config/chat.config.js';
import type { SportsService } from '../sports/sports.service.js';
import type { ToolRegistry } from '../tools/tools.registry.js';
import { CHAT_EVENTS, CHAT_ROLES } from './chat.constants.js';
import { ChatService } from './chat.service.js';
import type { ChatMessage, ChatStreamEvent } from './chat.types.js';
import type { OllamaClient } from './ollama.client.js';
import type { OllamaChatChunk } from './ollama.types.js';

const settings = {
  model: 'test-model',
  maxToolRounds: 3,
  warmup: 'page',
} as ChatConfig;

const content = (text: string): OllamaChatChunk => ({
  message: { role: CHAT_ROLES.assistant, content: text },
});

const toolCall = (name: string, args: Record<string, unknown> | string) => ({
  message: {
    role: CHAT_ROLES.assistant,
    content: '',
    tool_calls: [{ function: { name, arguments: args } }],
  },
});

/** Each element is one assistant turn, replayed in order. */
const stubOllama = (turns: OllamaChatChunk[][]) => {
  const sent: ChatMessage[][] = [];
  let turn = 0;
  return {
    settings,
    sent,
    listModels: vi.fn(),
    warm: vi.fn().mockResolvedValue({ prompt_eval_count: 1_234 }),
    stream: vi.fn(async function* (messages: ChatMessage[]) {
      sent.push(structuredClone(messages));
      yield* turns[turn++] ?? [];
    }),
  } as unknown as OllamaClient & { sent: ChatMessage[][] };
};

const collect = async (events: AsyncGenerator<ChatStreamEvent>) => {
  const out: ChatStreamEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};

const ask = (content: string): ChatMessage[] => [
  { role: CHAT_ROLES.user, content },
];

describe('ChatService', () => {
  const signal = new AbortController().signal;

  const build = (
    ollama: ReturnType<typeof stubOllama>,
    callTool = vi.fn().mockResolvedValue({ text: 'tool output', isError: false }),
  ) => {
    const tools = {
      listTools: vi.fn().mockResolvedValue([
        { name: 'get_nfl_state', source: 'sleeper', description: '', parameters: {} },
      ]),
      callTool,
    } as unknown as ToolRegistry;
    const sports = {
      getCatalogs: vi.fn().mockResolvedValue([
        { key: 'nfl', defaultSeason: '2026', currentWeek: 2 },
        { key: 'mlb', defaultSeason: '2026', currentWeek: null },
      ]),
    } as unknown as SportsService;
    return { service: new ChatService(ollama, tools, sports), callTool, tools };
  };

  it('streams tokens and finishes when the model stops calling tools', async () => {
    const ollama = stubOllama([[content('Start '), content('Aiyuk.')]]);
    const { service } = build(ollama);

    const events = await collect(service.run(ask('who?'), signal));

    expect(events).toEqual([
      { type: CHAT_EVENTS.token, text: 'Start ' },
      { type: CHAT_EVENTS.token, text: 'Aiyuk.' },
      { type: CHAT_EVENTS.done },
    ]);
  });

  it('prepends the system prompt and passes the MCP tools to the model', async () => {
    const ollama = stubOllama([[content('hi')]]);
    const { service } = build(ollama);

    await collect(service.run(ask('hi'), signal));

    expect(ollama.sent[0][0].role).toBe(CHAT_ROLES.system);
    expect(ollama.sent[0][0].content).toContain('current NFL season is 2026, week 2');
    expect(ollama.sent[0][0].content).toContain('current MLB season is 2026,');
    expect(ollama.stream).toHaveBeenCalledWith(
      expect.anything(),
      [
        {
          type: 'function',
          function: { name: 'get_nfl_state', description: '', parameters: {} },
        },
      ],
      signal,
    );
  });

  it('runs a tool call and feeds the result back for the next turn', async () => {
    const ollama = stubOllama([
      [toolCall('get_nfl_state', { a: 1 })],
      [content('It is week 2.')],
    ]);
    const { service, callTool } = build(ollama);

    const events = await collect(service.run(ask('what week?'), signal));

    expect(callTool).toHaveBeenCalledWith('get_nfl_state', { a: 1 });
    expect(events.map((event) => event.type)).toEqual([
      CHAT_EVENTS.toolCall,
      CHAT_EVENTS.toolResult,
      CHAT_EVENTS.token,
      CHAT_EVENTS.done,
    ]);

    const secondTurn = ollama.sent[1];
    expect(secondTurn.at(-1)).toEqual({
      role: CHAT_ROLES.tool,
      content: 'tool output',
      toolName: 'get_nfl_state',
    });
    expect(secondTurn.at(-2)?.toolCalls?.[0].name).toBe('get_nfl_state');
  });


  // Some models send the arguments object as a JSON string, which read as
  // undefined and called the tool empty.
  it('parses tool arguments that arrive as a JSON string', async () => {
    const ollama = stubOllama([
      [toolCall('get_nfl_state', '{"username_or_id":"travis"}')],
      [content('done')],
    ]);
    const { service, callTool } = build(ollama);

    await collect(service.run(ask('my leagues?'), signal));

    expect(callTool).toHaveBeenCalledWith('get_nfl_state', {
      username_or_id: 'travis',
    });
  });

  it('calls the tool with no arguments when the model sends unparsable ones', async () => {
    const ollama = stubOllama([
      [toolCall('get_nfl_state', 'not json')],
      [content('done')],
    ]);
    const { service, callTool } = build(ollama);

    await collect(service.run(ask('my leagues?'), signal));

    expect(callTool).toHaveBeenCalledWith('get_nfl_state', {});
  });

  it('gives up after maxToolRounds instead of looping forever', async () => {
    const ollama = stubOllama(
      Array.from({ length: 5 }, () => [toolCall('get_nfl_state', {})]),
    );
    const { service } = build(ollama);

    const events = await collect(service.run(ask('loop'), signal));

    expect(ollama.stream).toHaveBeenCalledTimes(settings.maxToolRounds);
    expect(events.at(-2)?.type).toBe(CHAT_EVENTS.error);
    expect(events.at(-1)?.type).toBe(CHAT_EVENTS.done);
  });

  it('reports a failed model request as an error event', async () => {
    const ollama = {
      settings,
      listModels: vi.fn(),
      stream: vi.fn(() => {
        throw new Error('Could not reach Ollama');
      }),
    } as unknown as ReturnType<typeof stubOllama>;
    const { service } = build(ollama);

    const events = await collect(service.run(ask('hi'), signal));

    expect(events).toEqual([
      { type: CHAT_EVENTS.error, message: 'Could not reach Ollama' },
      { type: CHAT_EVENTS.done },
    ]);
  });

  it('reports status as unavailable when Ollama cannot be reached', async () => {
    const ollama = stubOllama([]);
    vi.mocked(ollama.listModels).mockRejectedValue(new Error('offline'));
    const { service } = build(ollama);

    await expect(service.getStatus()).resolves.toMatchObject({
      available: false,
      modelAvailable: false,
      models: [],
    });
  });

  it('reports the model as available when Ollama lists it', async () => {
    const ollama = stubOllama([]);
    vi.mocked(ollama.listModels).mockResolvedValue(['test-model']);
    const { service } = build(ollama);

    await expect(service.getStatus()).resolves.toMatchObject({
      available: true,
      modelAvailable: true,
      tools: [{ name: 'get_nfl_state', source: 'sleeper', description: '' }],
    });
  });

  it('warms with the same system prompt and tools a real turn sends', async () => {
    const ollama = stubOllama([]);
    const { service } = build(ollama);

    await service.warmUp();

    const [messages, tools] = vi.mocked(ollama.warm).mock.calls[0];
    // Nothing but the prefix: the prefill is the point, not an answer.
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe(CHAT_ROLES.system);
    expect(messages[0].content).toContain('The current NFL season is 2026');
    expect(tools).toEqual([
      expect.objectContaining({
        type: 'function',
        function: expect.objectContaining({ name: 'get_nfl_state' }),
      }),
    ]);
  });

  it('warms once for overlapping triggers', async () => {
    const ollama = stubOllama([]);
    const { service } = build(ollama);

    await Promise.all([service.warmUp(), service.warmUp()]);
    await service.warmUp();

    expect(ollama.warm).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed warm-up so boot and status survive a down Ollama', async () => {
    const ollama = stubOllama([]);
    vi.mocked(ollama.warm).mockRejectedValue(new Error('offline'));
    const { service } = build(ollama);

    await expect(service.warmUp()).resolves.toBeUndefined();
  });

  it('boots without loading the model, so an idle app holds no memory', () => {
    const ollama = stubOllama([]);
    const { service, tools } = build(ollama);

    service.onApplicationBootstrap();

    // The MCP servers and season catalogs still start early — they cost no VRAM.
    expect(tools.listTools).toHaveBeenCalled();
    expect(ollama.warm).not.toHaveBeenCalled();
  });

  it('loads the model at boot when asked to', async () => {
    const ollama = stubOllama([]);
    vi.spyOn(ollama, 'settings', 'get').mockReturnValue({
      ...settings,
      warmup: 'boot',
    } as ChatConfig);
    const { service } = build(ollama);

    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(ollama.warm).toHaveBeenCalled());
  });

  it('does not warm at all when warm-up is off', async () => {
    const ollama = stubOllama([]);
    vi.spyOn(ollama, 'settings', 'get').mockReturnValue({
      ...settings,
      warmup: 'off',
    } as ChatConfig);
    const { service, tools } = build(ollama);

    service.onApplicationBootstrap();
    await service.warmUp();

    expect(tools.listTools).not.toHaveBeenCalled();
    expect(ollama.warm).not.toHaveBeenCalled();
  });

  it('skips warming while a conversation is running', async () => {
    const ollama = stubOllama([[content('hello')]]);
    const { service } = build(ollama);

    const events = service.run(ask('hi'), signal);
    await events.next();
    await service.warmUp();

    expect(ollama.warm).not.toHaveBeenCalled();
    await collect(events);
  });
});
