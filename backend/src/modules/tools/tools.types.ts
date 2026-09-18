/** A tool as offered to the model: flat name, JSON Schema parameters. */
export interface ToolDefinition {
  name: string;
  /** Where the tool came from — a local module, or an MCP server's name. */
  source: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** How many rows a tool returns by default, and the most it will ever return. */
export interface ToolLimit {
  default: number;
  max: number;
}

export interface ToolResult {
  text: string;
  isError: boolean;
}

/**
 * How much of a tool's data the caller wants back.
 *
 * A chat turn pays for every field in the context window, so tools answer it
 * with a projection: the stat group's `defaultStats` rather than all twenty-odd
 * of them, and no labels the key already carries. A dashboard renders the
 * result instead of reading it, so it asks for `full` — the same reasoning that
 * already exempts dashboards from truncation. Either way an explicit `stats`
 * argument wins, so a caller can always name the fields it wants.
 */
export interface ToolContext {
  full?: boolean;
}

/**
 * A tool implemented in this codebase. Implementations are `@Injectable()` and
 * listed in tools.module.ts, so they get the full DI container — the sports
 * providers, the Postgres data cache and the scoring engine.
 */
export interface FantasyTool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>, context?: ToolContext): Promise<unknown>;
}
