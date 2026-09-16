import { Injectable } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import { ToolRegistry } from '../tools/tools.registry.js';
import { MCP_SERVER_INFO } from './mcp-server.constants.js';

/**
 * Publishes this app's own tools over MCP so external clients — Claude Code,
 * Claude Desktop, other agents — can use them against a shared backend, with
 * the warm Postgres cache and our scoring engine behind them.
 *
 * Stateless: a fresh server and transport per request, so there are no sessions
 * to store or expire, and any instance can serve any request.
 */
@Injectable()
export class McpServerService {
  constructor(private readonly tools: ToolRegistry) {}

  async handleRequest(req: Request, res: Response): Promise<void> {
    const server = this.createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Both are per-request, so they must be torn down with the response.
    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  /** Public so tests can drive it over an in-memory transport. */
  createServer(): Server {
    const server = new Server(MCP_SERVER_INFO, {
      capabilities: { tools: {} },
    });

    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: this.tools.listLocalTools().map(({ name, description, parameters }) => ({
        name,
        description,
        inputSchema: parameters as { type: 'object' },
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { text, isError } = await this.tools.callLocalTool(
        request.params.name,
        request.params.arguments ?? {},
      );
      return { content: [{ type: 'text' as const, text }], isError };
    });

    return server;
  }
}
