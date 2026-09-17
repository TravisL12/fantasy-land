import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpConfig, McpServerConfig } from '../../config/mcp.config.js';
import { MCP_CONFIG_KEY } from '../../config/config.constants.js';
import { serializeToolText } from '../../common/text/truncate.js';
import { MCP_CLIENT_INFO, MCP_MESSAGES } from './mcp.constants.js';
import type { McpToolDefinition, McpToolResult } from './mcp.types.js';

interface RegisteredTool {
  client: Client;
  /** The name the server knows, which may differ from the exposed name. */
  toolName: string;
  definition: McpToolDefinition;
}

/** MCP content blocks we know how to render into text for the model. */
interface TextContent {
  type: string;
  text?: string;
}

/**
 * Connects to the configured MCP servers over stdio and exposes their tools as
 * one flat, model-facing list. Servers are started on first use so a missing or
 * broken server degrades the chat to "no tools" instead of failing app boot.
 */
@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private readonly clients: Client[] = [];
  private readonly tools = new Map<string, RegisteredTool>();
  private ready?: Promise<void>;

  constructor(private readonly config: ConfigService) {}

  async listTools(): Promise<McpToolDefinition[]> {
    await this.connect();
    return [...this.tools.values()].map((tool) => tool.definition);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<McpToolResult> {
    await this.connect();
    const tool = this.tools.get(name);
    if (!tool) {
      return { text: MCP_MESSAGES.unknownTool(name), isError: true };
    }

    try {
      const result = await tool.client.callTool({
        name: tool.toolName,
        arguments: args,
      });
      return {
        text: serializeToolText(toText(result.content)),
        isError: result.isError === true,
      };
    } catch (error) {
      this.logger.warn(`Tool "${name}" failed: ${messageOf(error)}`);
      return { text: messageOf(error), isError: true };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.close()));
  }

  private connect(): Promise<void> {
    this.ready ??= this.connectAll();
    return this.ready;
  }

  private async connectAll(): Promise<void> {
    const { servers } = this.config.getOrThrow<McpConfig>(MCP_CONFIG_KEY);
    for (const server of servers) {
      await this.connectServer(server);
    }
  }

  private async connectServer(server: McpServerConfig): Promise<void> {
    try {
      const client = new Client(MCP_CLIENT_INFO);
      await client.connect(
        new StdioClientTransport({
          command: server.command,
          args: server.args,
          env: { ...(process.env as Record<string, string>), ...server.env },
          stderr: 'ignore',
        }),
      );
      this.clients.push(client);
      this.register(server, client, await client.listTools());
    } catch (error) {
      this.logger.error(
        `${MCP_MESSAGES.connectFailed(server.name)}: ${messageOf(error)}`,
      );
    }
  }

  private register(
    server: McpServerConfig,
    client: Client,
    { tools }: Awaited<ReturnType<Client['listTools']>>,
  ): void {
    const serverName = server.name;
    const exposed = tools.filter((tool) => isExposed(server, tool.name));

    for (const tool of exposed) {
      // Two servers can offer the same tool name; the later one gets namespaced.
      const name = this.tools.has(tool.name)
        ? `${serverName}_${tool.name}`
        : tool.name;
      this.tools.set(name, {
        client,
        toolName: tool.name,
        definition: {
          name,
          server: serverName,
          description: tool.description ?? '',
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      });
    }
    const skipped = tools.length - exposed.length;
    this.logger.log(
      `MCP server "${serverName}" ready (${exposed.length} tools` +
        `${skipped ? `, ${skipped} filtered out` : ''})`,
    );
  }
}

/**
 * Filtered by the name the server uses, before namespacing, so a config entry
 * matches what that server's own docs call the tool.
 */
const isExposed = (server: McpServerConfig, toolName: string): boolean =>
  (server.allowTools?.includes(toolName) ?? true) &&
  !server.denyTools?.includes(toolName);

const toText = (content: unknown): string => {
  const blocks = Array.isArray(content) ? (content as TextContent[]) : [];
  const text = blocks
    .filter((block) => typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
  return text || MCP_MESSAGES.noContent;
};


const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
