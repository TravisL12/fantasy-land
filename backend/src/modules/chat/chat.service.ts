import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from '../tools/tools.registry.js';
import type { ToolDefinition } from '../tools/tools.types.js';
import { SportsService } from '../sports/sports.service.js';
import {
  CHAT_EVENTS,
  CHAT_MESSAGES,
  CHAT_ROLES,
  SEASON_CONTEXT,
  SYSTEM_PROMPT,
} from './chat.constants.js';
import type {
  ChatMessage,
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
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly ollama: OllamaClient,
    private readonly tools: ToolRegistry,
    private readonly sports: SportsService,
  ) {}

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

  async *run(
    history: ChatMessage[],
    signal: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const { maxToolRounds } = this.ollama.settings;
    const tools = (await this.tools.listTools()).map(toOllamaTool);
    const messages: ChatMessage[] = [
      { role: CHAT_ROLES.system, content: await this.systemPrompt() },
      ...history,
    ];

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
          const result = await this.tools.callTool(call.name, call.arguments);
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
    }
  }

  /** Seasons are looked up per sport rather than left to the model to guess. */
  private async systemPrompt(): Promise<string> {
    try {
      const catalogs = await this.sports.getCatalogs();
      if (catalogs.length === 0) return SYSTEM_PROMPT;

      const today = new Date().toISOString().slice(0, 10);
      const seasons = catalogs.map(({ key, defaultSeason, currentWeek }) => ({
        sport: key,
        season: defaultSeason,
        week: currentWeek,
      }));
      return `${SYSTEM_PROMPT}\n\n${SEASON_CONTEXT(today, seasons)}`;
    } catch (error) {
      this.logger.warn(`Could not resolve the current season: ${String(error)}`);
      return SYSTEM_PROMPT;
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
          arguments: fn.arguments ?? {},
        };
        turn.toolCalls.push(call);
        yield { type: CHAT_EVENTS.toolCall, call };
      }
    }
  }
}

const toOllamaTool = (tool: ToolDefinition): OllamaTool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
});
