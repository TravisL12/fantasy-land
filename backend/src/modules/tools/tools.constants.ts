export const FANTASY_TOOLS = Symbol('FANTASY_TOOLS');

export const LOCAL_TOOL_SOURCE = 'fantasy-land';

export const TOOL_MESSAGES = {
  unknownTool: (name: string) => `Unknown tool "${name}"`,
  /** Named keys beat a bare rejection: the model retries with a real one. */
  unknownStats: (unknown: string[], group: string, defined: string[]) =>
    `Unknown stat ${unknown.length > 1 ? 'keys' : 'key'} ${unknown.map((key) => `"${key}"`).join(', ')} for the "${group}" group. Valid keys: ${defined.join(', ')}.`,
} as const;
