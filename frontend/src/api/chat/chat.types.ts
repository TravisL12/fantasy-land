import type { CHAT_EVENTS, CHAT_ROLES } from './chat.constants';

type ValueOf<T> = T[keyof T];

export type ChatRole = ValueOf<typeof CHAT_ROLES>;

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
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

export interface ChatTool {
  name: string;
  /** Which tool set it came from — this app, or a named MCP server. */
  source: string;
  description: string;
}

export interface ChatStatus {
  model: string;
  baseUrl: string;
  available: boolean;
  modelAvailable: boolean;
  models: string[];
  tools: ChatTool[];
}
