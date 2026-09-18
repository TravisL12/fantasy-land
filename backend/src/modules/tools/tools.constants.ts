export const FANTASY_TOOLS = Symbol('FANTASY_TOOLS');

export const LOCAL_TOOL_SOURCE = 'fantasy-land';

/**
 * Fields every row carries beside its `stats` object. A model listing the
 * columns it wants writes "fantasyPoints" among them, which is not a stat key
 * and used to be rejected — costing a round to recover from a request that was
 * already satisfied, since these are returned whatever the filter says.
 */
export const ROW_LEVEL_FIELDS = [
  'name',
  'team',
  'position',
  'gamesPlayed',
  'games',
  'fantasyPoints',
  'fantasyPointsPerGame',
  'pointsPerGame',
] as const;

export const TOOL_MESSAGES = {
  unknownTool: (name: string) => `Unknown tool "${name}"`,
  /** Named keys beat a bare rejection: the model retries with a real one. */
  unknownStats: (unknown: string[], group: string, defined: string[]) =>
    `Unknown stat ${unknown.length > 1 ? 'keys' : 'key'} ${unknown.map((key) => `"${key}"`).join(', ')} for the "${group}" group. Valid keys: ${defined.join(', ')}.`,
} as const;
