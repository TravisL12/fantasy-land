import type { Response } from 'express';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Stops nginx-style proxies from buffering the stream into one response.
  'X-Accel-Buffering': 'no',
} as const;

export const openSseStream = (res: Response) => {
  res.writeHead(200, SSE_HEADERS).flushHeaders();
};

/** One event per `data:` line, which is what the frontend's stream parser expects. */
export const writeSseEvent = (res: Response, event: unknown) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};
