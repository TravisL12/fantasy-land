/**
 * Each status request also tells the backend to keep the model warm, so this
 * poll is what holds it in memory while the chat page is open — and what lets
 * it fall out of memory once you leave. It must stay well under
 * OLLAMA_KEEP_ALIVE (5m), and pauses while the tab is unfocused.
 */
export const STATUS_POLL_MS = 120_000;

export const STATUS_COPY = {
  offline: (baseUrl: string) => `Ollama unreachable at ${baseUrl}`,
  missingModel: (model: string) => `Model "${model}" is not pulled`,
  tools: (source: string, count: number) =>
    `${source}: ${count} tool${count === 1 ? '' : 's'}`,
  noTools: 'No MCP tools — the model is answering unaided',
} as const;
