import { createRequire } from 'node:module';
import { registerAs } from '@nestjs/config';
import { MCP_CONFIG_KEY } from './config.constants.js';

export interface McpServerConfig {
  /** Used to namespace tools and to label them in the UI. */
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  servers: McpServerConfig[];
}

const require = createRequire(import.meta.url);

/**
 * Resolved from node_modules rather than hardcoded, so the entry point stays
 * correct whatever the process working directory is.
 */
const sleeperServer = (): McpServerConfig[] => {
  try {
    return [
      {
        name: 'sleeper',
        command: process.execPath,
        args: [require.resolve('sleeper-mcp')],
      },
    ];
  } catch {
    return [];
  }
};

/** `MCP_SERVERS` is a JSON array of McpServerConfig — set it to add or replace servers. */
const parseServers = (raw: string): McpServerConfig[] => {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('MCP_SERVERS must be a JSON array');
  }
  return parsed.map((entry) => {
    const { name, command, args, env } = entry as Partial<McpServerConfig>;
    if (!name || !command) {
      throw new Error('Each MCP server needs a "name" and a "command"');
    }
    return { name, command, args: args ?? [], env };
  });
};

export const mcpConfig = registerAs(
  MCP_CONFIG_KEY,
  (): McpConfig => ({
    servers: process.env.MCP_SERVERS
      ? parseServers(process.env.MCP_SERVERS)
      : sleeperServer(),
  }),
);
