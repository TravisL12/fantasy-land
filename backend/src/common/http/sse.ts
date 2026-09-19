import type { Request, Response } from 'express';

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

/**
 * Streams an async generator to the client, one event per `data:` line, and
 * aborts it the moment the browser goes away — a chat turn that nobody is
 * reading is still a model holding the GPU. Both streaming endpoints run this
 * exact loop, so it lives here rather than once per controller.
 */
export const pipeSseStream = async <T>(
  req: Request,
  res: Response,
  run: (signal: AbortSignal) => AsyncIterable<T>,
): Promise<void> => {
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  openSseStream(res);

  for await (const event of run(controller.signal)) {
    if (controller.signal.aborted) break;
    writeSseEvent(res, event);
  }
  res.end();
};
