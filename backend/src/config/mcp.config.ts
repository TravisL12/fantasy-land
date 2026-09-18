import { createRequire } from 'node:module';
import { registerAs } from '@nestjs/config';
import { MCP_CONFIG_KEY } from './config.constants.js';

export interface McpServerConfig {
  /** Used to namespace tools and to label them in the UI. */
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  /**
   * Expose only these tools, named as the server names them. Omit for all of
   * them. Every tool a server offers is paid for in `num_ctx` on every round,
   * so a server with a wide surface is worth narrowing to what we actually use.
   */
  allowTools?: string[];
  /** Tools to drop, applied after `allowTools`. */
  denyTools?: string[];
}

export interface McpConfig {
  servers: McpServerConfig[];
}

const require = createRequire(import.meta.url);

/**
 * Tools the bundled Sleeper server offers that we do not want the model to see.
 * `clear_cache` would let a chat turn wipe our Postgres-backed cache, and the
 * three advice tools answer start/sit and waiver questions from Sleeper's own
 * numbers, competing with the scoring engine the rest of the app is built on.
 * Drop an entry to hand it back to the model.
 *
 * `get_user_info` is listed because our own tool of that name was folded into
 * get_user_leagues: with nothing shadowing it, the server's version — which
 * reads fields off the `null` body Sleeper returns for an unknown user and
 * throws an opaque TypeError — would come back into the model's prompt.
 *
 * Tools still shadowed by a local one of the same name (`compare_players`,
 * `get_user_leagues`) are filtered out by `ToolRegistry`, so they are
 * deliberately not repeated here.
 */
export const SLEEPER_DENIED_TOOLS = [
  'clear_cache',
  'analyze_lineup',
  'get_start_sit_advice',
  'get_waiver_suggestions',
  'get_user_info',
] as const;

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
        denyTools: [...SLEEPER_DENIED_TOOLS],
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
    const { name, command, args, env, allowTools, denyTools } =
      entry as Partial<McpServerConfig>;
    if (!name || !command) {
      throw new Error('Each MCP server needs a "name" and a "command"');
    }
    return {
      name,
      command,
      args: args ?? [],
      env,
      allowTools: toolNames(name, 'allowTools', allowTools),
      denyTools: toolNames(name, 'denyTools', denyTools),
    };
  });
};

/** Validated here rather than at connect time so a typo fails fast, on boot. */
const toolNames = (
  server: string,
  field: 'allowTools' | 'denyTools',
  value: unknown,
): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error(`"${field}" on MCP server "${server}" must be an array of tool names`);
  }
  return value as string[];
};

export const mcpConfig = registerAs(
  MCP_CONFIG_KEY,
  (): McpConfig => ({
    servers: process.env.MCP_SERVERS
      ? parseServers(process.env.MCP_SERVERS)
      : sleeperServer(),
  }),
);
