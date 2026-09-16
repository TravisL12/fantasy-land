/** Local models have small context windows — long tool payloads crowd out the question. */
export const MAX_TOOL_RESULT_CHARS = 6_000;
export const TRUNCATION_NOTICE =
  '\n…[truncated: ask for a narrower slice of this data]';

export const truncate = (text: string, max = MAX_TOOL_RESULT_CHARS) =>
  text.length <= max ? text : text.slice(0, max) + TRUNCATION_NOTICE;
