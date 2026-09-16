import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatConfig } from '../../config/chat.config.js';
import { CHAT_CONFIG_KEY } from '../../config/config.constants.js';
import { CHAT_MESSAGES, CHAT_ROLES } from './chat.constants.js';
import type { ChatMessage } from './chat.types.js';
import type {
  OllamaChatChunk,
  OllamaMessage,
  OllamaTagsResponse,
  OllamaTool,
} from './ollama.types.js';

const CHAT_PATH = '/api/chat';
const TAGS_PATH = '/api/tags';

/** Thin streaming client for a local Ollama server. */
@Injectable()
export class OllamaClient {
  constructor(private readonly config: ConfigService) {}

  get settings(): ChatConfig {
    return this.config.getOrThrow<ChatConfig>(CHAT_CONFIG_KEY);
  }

  async listModels(): Promise<string[]> {
    const { baseUrl } = this.settings;
    const response = await fetch(`${baseUrl}${TAGS_PATH}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Ollama responded ${response.status}`);
    const { models } = (await response.json()) as OllamaTagsResponse;
    return models.map((model) => model.name);
  }

  /** Yields raw chunks; the caller assembles content and tool calls. */
  async *stream(
    messages: ChatMessage[],
    tools: OllamaTool[],
    signal: AbortSignal,
  ): AsyncGenerator<OllamaChatChunk> {
    const { baseUrl, model, temperature, contextTokens, think } = this.settings;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${CHAT_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model,
          messages: messages.map(toOllamaMessage),
          ...(tools.length > 0 && { tools }),
          stream: true,
          think,
          options: { temperature, num_ctx: contextTokens },
        }),
      });
    } catch (error) {
      throw new Error(`${CHAT_MESSAGES.unreachable} at ${baseUrl}`, {
        cause: error,
      });
    }

    if (!response.ok || !response.body) {
      throw new Error(
        `${CHAT_MESSAGES.failed}: Ollama responded ${response.status}`,
      );
    }

    for await (const chunk of readNdjson(response.body, signal)) {
      if (chunk.error) throw new Error(chunk.error);
      yield chunk;
    }
  }
}

const toOllamaMessage = (message: ChatMessage): OllamaMessage => ({
  role: message.role,
  content: message.content,
  ...(message.toolCalls && {
    tool_calls: message.toolCalls.map(({ name, arguments: args }) => ({
      function: { name, arguments: args },
    })),
  }),
  ...(message.role === CHAT_ROLES.tool &&
    message.toolName && { tool_name: message.toolName }),
});

/** Ollama streams newline-delimited JSON, so chunks can split mid-line. */
async function* readNdjson(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<OllamaChatChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line) as OllamaChatChunk;
        newline = buffer.indexOf('\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
