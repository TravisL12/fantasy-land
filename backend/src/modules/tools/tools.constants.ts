export const FANTASY_TOOLS = Symbol('FANTASY_TOOLS');

export const LOCAL_TOOL_SOURCE = 'fantasy-land';

export const TOOL_MESSAGES = {
  unknownTool: (name: string) => `Unknown tool "${name}"`,
} as const;
