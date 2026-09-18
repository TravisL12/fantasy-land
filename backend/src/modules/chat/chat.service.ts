import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { toErrorMessage } from '../../common/errors/error-message.js';
import { serializeToolResult } from '../../common/text/truncate.js';
import { OLLAMA_WARMUP_MODES } from '../../config/config.constants.js';
import { ToolRegistry } from '../tools/tools.registry.js';
import type { FantasyTool, ToolDefinition, ToolResult } from '../tools/tools.types.js';
import { SportsService } from '../sports/sports.service.js';
import {
  CHAT_EVENTS,
  CHAT_MESSAGES,
  CHAT_ROLES,
  SEASON_CONTEXT,
  SYSTEM_PROMPT,
  WARM_MIN_INTERVAL_MS,
} from './chat.constants.js';
import type {
  ChatMessage,
  ChatRunOptions,
  ChatStatus,
  ChatStreamEvent,
  ToolCall,
} from './chat.types.js';
import { OllamaClient } from './ollama.client.js';
import type { OllamaTool } from './ollama.types.js';

interface AssistantTurn {
  content: string;
  toolCalls: ToolCall[];
}

/**
 * Runs the assistant→tool→assistant loop against Ollama, with the MCP servers'
 * tools passed through on every round, and reports progress as a stream of
 * events so the UI can show tool calls as they happen.
 */
@Injectable()
export class ChatService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChatService.name);
  /** Deduped so overlapping triggers share one warm-up. */
  private warming?: Promise<void>;
  private lastWarmAt = 0;
  private activeRuns = 0;

  constructor(
    private readonly ollama: OllamaClient,
    private readonly tools: ToolRegistry,
    private readonly sports: SportsService,
  ) {}

  /**
   * Boot pays only the costs that hold no memory — starting the MCP servers and
   * resolving the season catalogs. Loading the model waits for someone to open
   * the chat page, so an app nobody is talking to holds no GPU memory. Fire and
   * forget: a slow or absent Ollama must not hold up or fail boot.
   */
  onApplicationBootstrap(): void {
    const { warmup } = this.ollama.settings;
    if (warmup === OLLAMA_WARMUP_MODES.off) return;

    void (warmup === OLLAMA_WARMUP_MODES.boot
      ? this.warmUp()
      : this.prepare().catch(() => undefined));
  }

  /** The cold starts that cost no memory, so they are safe to pay at boot. */
  private async prepare(): Promise<ToolDefinition[]> {
    const [tools] = await Promise.all([
      this.tools.listTools(),
      this.sports.getCatalogs().catch(() => []),
    ]);
    return tools;
  }

  /**
   * Pays the cold-start costs before anyone asks anything: starting the MCP
   * servers, resolving the season catalogs, loading the model's weights and
   * prefilling the system prompt plus tool schemas into Ollama's prompt cache.
   * Never rejects — a failed warm-up just means the first question is slow.
   */
  warmUp(base: string = SYSTEM_PROMPT): Promise<void> {
    if (this.ollama.settings.warmup === OLLAMA_WARMUP_MODES.off) {
      return Promise.resolve();
    }
    // A warm-up mid-conversation would queue ahead of the user's own turn, and
    // the model is loaded with the right prefix cached anyway.
    if (this.activeRuns > 0) return Promise.resolve();
    if (Date.now() - this.lastWarmAt < WARM_MIN_INTERVAL_MS) {
      return Promise.resolve();
    }

    this.warming ??= this.runWarmUp(base).finally(() => {
      this.warming = undefined;
    });
    return this.warming;
  }

  private async runWarmUp(base: string): Promise<void> {
    const startedAt = Date.now();
    try {
      const tools = (await this.prepare()).map(toOllamaTool);
      const messages: ChatMessage[] = [
        { role: CHAT_ROLES.system, content: await this.systemPrompt(base) },
      ];
      const { prompt_eval_count: prompt = 0, load_duration: load = 0 } =
        await this.ollama.warm(messages, tools);
      this.logger.log(
        `Warmed ${this.ollama.settings.model}: ${tools.length} tools, ` +
          `${prompt} prompt tokens, ${Math.round(load / 1e6)}ms loading the ` +
          `model, ${Date.now() - startedAt}ms total`,
      );
    } catch (error) {
      this.logger.warn(`Warm-up skipped: ${toErrorMessage(error)}`);
    } finally {
      // Set on failure too, so a down Ollama is retried once a minute rather
      // than on every status request.
      this.lastWarmAt = Date.now();
    }
  }

  async getStatus(): Promise<ChatStatus> {
    const { model, baseUrl } = this.ollama.settings;
    const [models, tools] = await Promise.all([
      this.ollama.listModels().catch(() => null),
      this.tools.listTools().catch(() => []),
    ]);

    return {
      model,
      baseUrl,
      available: models !== null,
      modelAvailable: models?.includes(model) ?? false,
      models: models ?? [],
      tools: tools.map(({ name, source, description }) => ({
        name,
        source,
        description,
      })),
    };
  }

  /**
   * `options` lets another feature reuse this loop with its own system prompt
   * and its own request-scoped tools — the dashboard builder adds a tool that
   * captures what the model designed instead of fetching anything.
   */
  async *run(
    history: ChatMessage[],
    signal: AbortSignal,
    options: ChatRunOptions = {},
  ): AsyncGenerator<ChatStreamEvent> {
    const maxToolRounds =
      options.maxToolRounds ?? this.ollama.settings.maxToolRounds;
    const extras = new Map(
      (options.extraTools ?? []).map((tool) => [tool.definition.name, tool]),
    );
    const tools = [
      ...(await this.tools.listTools()).filter(({ name }) => !extras.has(name)),
      ...[...extras.values()].map(({ definition }) => definition),
    ].map(toOllamaTool);
    const messages: ChatMessage[] = [
      {
        role: CHAT_ROLES.system,
        content: await this.systemPrompt(options.systemPrompt ?? SYSTEM_PROMPT),
      },
      ...history,
    ];

    this.activeRuns += 1;
    try {
      for (let round = 0; round < maxToolRounds; round += 1) {
        const turn: AssistantTurn = { content: '', toolCalls: [] };
        yield* this.streamTurn(messages, tools, signal, turn);

        if (turn.toolCalls.length === 0) {
          yield { type: CHAT_EVENTS.done };
          return;
        }

        messages.push({
          role: CHAT_ROLES.assistant,
          content: turn.content,
          toolCalls: turn.toolCalls,
        });

        for (const call of turn.toolCalls) {
          if (signal.aborted) return;
          const result = await this.callTool(extras, call);
          yield {
            type: CHAT_EVENTS.toolResult,
            id: call.id,
            name: call.name,
            isError: result.isError,
            text: result.text,
          };
          messages.push({
            role: CHAT_ROLES.tool,
            content: result.text,
            toolName: call.name,
          });
        }
      }

      yield { type: CHAT_EVENTS.error, message: CHAT_MESSAGES.toolRoundsExceeded };
      yield { type: CHAT_EVENTS.done };
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Chat failed: ${message}`);
      yield { type: CHAT_EVENTS.error, message };
      yield { type: CHAT_EVENTS.done };
    } finally {
      this.activeRuns -= 1;
      // The turn just left the model loaded with this prefix cached, so the
      // next warm-up trigger has nothing to do.
      this.lastWarmAt = Date.now();
    }
  }

  /** Request-scoped tools win, so a caller can shadow a registry tool by name. */
  private async callTool(
    extras: Map<string, FantasyTool>,
    call: ToolCall,
  ): Promise<ToolResult> {
    const extra = extras.get(call.name);
    if (!extra) return this.tools.callTool(call.name, call.arguments);

    try {
      return { text: serializeToolResult(await extra.execute(call.arguments)), isError: false };
    } catch (error) {
      return { text: toErrorMessage(error), isError: true };
    }
  }

  /** Seasons are looked up per sport rather than left to the model to guess. */
  private async systemPrompt(base: string): Promise<string> {
    try {
      const catalogs = await this.sports.getCatalogs();
      if (catalogs.length === 0) return base;

      const today = new Date().toISOString().slice(0, 10);
      const seasons = catalogs.map(({ key, defaultSeason, currentWeek }) => ({
        sport: key,
        season: defaultSeason,
        week: currentWeek,
      }));
      return `${base}\n\n${SEASON_CONTEXT(today, seasons)}`;
    } catch (error) {
      this.logger.warn(`Could not resolve the current season: ${String(error)}`);
      return base;
    }
  }

  /** Streams one assistant turn, filling `turn` with what the model produced. */
  private async *streamTurn(
    messages: ChatMessage[],
    tools: OllamaTool[],
    signal: AbortSignal,
    turn: AssistantTurn,
  ): AsyncGenerator<ChatStreamEvent> {
    for await (const chunk of this.ollama.stream(messages, tools, signal)) {
      const message = chunk.message;
      if (!message) continue;

      if (message.thinking) {
        yield { type: CHAT_EVENTS.thinking, text: message.thinking };
      }
      if (message.content) {
        turn.content += message.content;
        yield { type: CHAT_EVENTS.token, text: message.content };
      }
      for (const { function: fn } of message.tool_calls ?? []) {
        const call: ToolCall = {
          id: randomUUID(),
          name: fn.name,
          arguments: toArguments(fn.arguments),
        };
        turn.toolCalls.push(call);
        yield { type: CHAT_EVENTS.toolCall, call };
      }
    }
  }
}

/**
 * Some models emit tool arguments as a JSON string rather than an object. Left
 * as a string, every argument reads as undefined and the tool is called empty.
 */
const toArguments = (raw: unknown): Record<string, unknown> => {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && raw !== null
    ? (raw as Record<string, unknown>)
    : {};
};

const toOllamaTool = (tool: ToolDefinition): OllamaTool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
});
