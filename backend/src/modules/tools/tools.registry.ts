import { Inject, Injectable, Logger } from '@nestjs/common';
import { toErrorMessage } from '../../common/errors/error-message.js';
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

  /**
   * Like callLocalTool, but hands back the tool's own data with no truncation
   * and no serialization: a dashboard renders the result rather than feeding it
   * to a context window, so the row caps would only lose data.
   */
  async callLocalToolData(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ data?: unknown; error?: string }> {
    const tool = this.local.get(name);
    if (!tool) return { error: TOOL_MESSAGES.unknownTool(name) };

    try {
      return { data: await tool.execute(args) };
    } catch (error) {
      const message = toErrorMessage(error);
      this.logger.warn(`Tool "${name}" failed: ${message}`);
      return { error: message };
    }
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
      const message = toErrorMessage(error);
      this.logger.warn(`Tool "${name}" failed: ${message}`);
      return { text: message, isError: true };
    }
  }
}
