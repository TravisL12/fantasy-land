/** A tool as exposed to the model: flat name, JSON Schema parameters. */
export interface McpToolDefinition {
  /** Unique across servers — this is the name the model calls. */
  name: string;
  server: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface McpToolResult {
  text: string;
  isError: boolean;
}
