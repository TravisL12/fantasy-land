import { streamSse } from '@/api/streamSse';
import { CHAT_STREAM_URL } from './chat.constants';
import type { ChatMessage, ChatStreamEvent } from './chat.types';

/** POSTs the conversation and yields the backend's events as they arrive. */
export const streamChat = (messages: ChatMessage[], signal: AbortSignal) =>
  streamSse<ChatStreamEvent>(CHAT_STREAM_URL, { messages }, signal);
