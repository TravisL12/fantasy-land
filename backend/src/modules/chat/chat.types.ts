import type { CHAT_EVENTS, CHAT_ROLES } from './chat.constants.js';

type ValueOf<T> = T[keyof T];

export type ChatRole = ValueOf<typeof CHAT_ROLES>;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCalls?: ToolCall[];
  /** Set on tool results so the model can match them to the call. */
  toolName?: string;
}

export type ChatStreamEvent =
  | { type: typeof CHAT_EVENTS.token; text: string }
  | { type: typeof CHAT_EVENTS.thinking; text: string }
  | { type: typeof CHAT_EVENTS.toolCall; call: ToolCall }
  | {
      type: typeof CHAT_EVENTS.toolResult;
      id: string;
      name: string;
      isError: boolean;
      text: string;
    }
  | { type: typeof CHAT_EVENTS.done }
  | { type: typeof CHAT_EVENTS.error; message: string };

export interface ChatStatus {
  model: string;
  baseUrl: string;
  /** False when Ollama isn't running or the model isn't pulled. */
  available: boolean;
  modelAvailable: boolean;
  models: string[];
  tools: { name: string; source: string; description: string }[];
}
