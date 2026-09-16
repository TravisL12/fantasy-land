import { registerAs } from '@nestjs/config';
import { MCP_HTTP_CONFIG_KEY } from './config.constants.js';

export interface McpHttpConfig {
  /** Bearer token external MCP clients must present. Unset disables the endpoint. */
  token?: string;
}

export const mcpHttpConfig = registerAs(
  MCP_HTTP_CONFIG_KEY,
  (): McpHttpConfig => ({ token: process.env.MCP_HTTP_TOKEN || undefined }),
);
