/** A tool as offered to the model: flat name, JSON Schema parameters. */
export interface ToolDefinition {
  name: string;
  /** Where the tool came from — a local module, or an MCP server's name. */
  source: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  text: string;
  isError: boolean;
}

/**
 * A tool implemented in this codebase. Implementations are `@Injectable()` and
 * listed in tools.module.ts, so they get the full DI container — the sports
 * providers, the Postgres data cache and the scoring engine.
 */
export interface FantasyTool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<unknown>;
}
