import { CHAT_STREAM_URL, SSE_DATA_PREFIX } from './chat.constants';
import type { ChatMessage, ChatStreamEvent } from './chat.types';

/**
 * POSTs the conversation and yields the backend's SSE events as they arrive.
 * RTK Query can't model a streaming response, so this stays a plain fetch.
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(CHAT_STREAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Events are separated by a blank line and can span reads.
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (frame.startsWith(SSE_DATA_PREFIX)) {
          yield JSON.parse(
            frame.slice(SSE_DATA_PREFIX.length),
          ) as ChatStreamEvent;
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
