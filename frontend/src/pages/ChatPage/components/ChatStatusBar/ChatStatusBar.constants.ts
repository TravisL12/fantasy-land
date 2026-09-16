export const STATUS_COPY = {
  offline: (baseUrl: string) => `Ollama unreachable at ${baseUrl}`,
  missingModel: (model: string) => `Model "${model}" is not pulled`,
  tools: (source: string, count: number) =>
    `${source}: ${count} tool${count === 1 ? '' : 's'}`,
  noTools: 'No MCP tools — the model is answering unaided',
} as const;
