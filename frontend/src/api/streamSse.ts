import { SSE_DATA_PREFIX } from './api.constants';

/**
 * POSTs a body and yields the backend's SSE events as they arrive. RTK Query
 * can't model a streaming response, so streaming endpoints stay a plain fetch.
 */
export async function* streamSse<TEvent>(
  url: string,
  body: unknown,
  signal: AbortSignal,
): AsyncGenerator<TEvent> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Request failed (${response.status})`);
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
          yield JSON.parse(frame.slice(SSE_DATA_PREFIX.length)) as TEvent;
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
