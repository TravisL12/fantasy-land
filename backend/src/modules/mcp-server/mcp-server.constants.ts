export const MCP_SERVER_ROUTE = 'mcp';

export const MCP_SERVER_INFO = {
  name: 'fantasy-land',
  version: '1.0.0',
} as const;

export const MCP_SERVER_MESSAGES = {
  disabled:
    'The MCP endpoint is disabled. Set MCP_HTTP_TOKEN to enable it.',
  unauthorized: 'A valid bearer token is required',
  methodNotAllowed:
    'This MCP endpoint is stateless — use POST. Server-initiated streams are not supported.',
} as const;

export const BEARER_PREFIX = 'Bearer ';
