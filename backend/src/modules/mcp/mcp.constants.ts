export const MCP_CLIENT_INFO = {
  name: 'fantasy-land',
  version: '1.0.0',
} as const;

export const MCP_MESSAGES = {
  unknownTool: (name: string) => `Unknown tool "${name}"`,
  connectFailed: (name: string) => `Could not start MCP server "${name}"`,
  noContent: 'The tool returned no content.',
} as const;
