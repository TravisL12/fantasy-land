export const CHAT_STREAM_URL = '/api/chat/stream';

export const CHAT_ROLES = {
  user: 'user',
  assistant: 'assistant',
} as const;

/** Mirrors the backend's CHAT_EVENTS. */
export const CHAT_EVENTS = {
  token: 'token',
  thinking: 'thinking',
  toolCall: 'tool_call',
  toolResult: 'tool_result',
  done: 'done',
  error: 'error',
} as const;

export const SSE_DATA_PREFIX = 'data: ';
