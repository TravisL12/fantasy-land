import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { serializeToolResult } from '../../common/text/truncate.js';
import { McpService } from '../mcp/mcp.service.js';
import { FANTASY_TOOLS, TOOL_MESSAGES } from './tools.constants.js';
import type { FantasyTool, ToolDefinition, ToolResult } from './tools.types.js';

/**
 * The one tool list the model sees: this codebase's own tools plus everything
 * the configured MCP servers expose. Local tools win a name clash, since they
 * run in-process against our own data.
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly local: Map<string, FantasyTool>;

  constructor(
    @Inject(FANTASY_TOOLS) tools: FantasyTool[],
    private readonly mcp: McpService,
  ) {
    this.local = new Map(tools.map((tool) => [tool.definition.name, tool]));
  }

  /** Only this codebase's own tools — what we publish over MCP. */
  listLocalTools(): ToolDefinition[] {
    return [...this.local.values()].map((tool) => tool.definition);
  }

  async listTools(): Promise<ToolDefinition[]> {
    const mcpTools = await this.mcp.listTools();
    return [
      ...this.listLocalTools(),
      ...mcpTools
        .filter(({ name }) => !this.local.has(name))
        .map(
          ({ name, server, description, parameters }): ToolDefinition => ({
            name,
            source: server,
            description,
            parameters,
          }),
        ),
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.local.get(name);
    return tool ? this.run(name, tool, args) : this.mcp.callTool(name, args);
  }

  /** Never falls through to an MCP server, so we don't proxy someone else's tools. */
  async callLocalTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.local.get(name);
    return tool
      ? this.run(name, tool, args)
      : { text: TOOL_MESSAGES.unknownTool(name), isError: true };
  }

  private async run(
    name: string,
    tool: FantasyTool,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      return {
        text: serializeToolResult(await tool.execute(args)),
        isError: false,
      };
    } catch (error) {
      this.logger.warn(`Tool "${name}" failed: ${messageOf(error)}`);
      return { text: messageOf(error), isError: true };
    }
  }
}

/**
 * Nest's HTTP exceptions carry the useful detail in their response body —
 * "Unknown stat group" is worth telling the model so it can correct itself.
 */
const messageOf = (error: unknown): string => {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === 'object' && response !== null
        ? (response as { message?: string | string[] }).message
        : response;
    return String(Array.isArray(message) ? message.join('; ') : (message ?? error.message));
  }
  return error instanceof Error ? error.message : String(error);
};
