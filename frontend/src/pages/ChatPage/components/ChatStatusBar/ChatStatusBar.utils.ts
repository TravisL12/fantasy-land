import type { ChatTool } from '@/api/chat';

/** Groups the tool list by where each tool came from. */
export const countBySource = (tools: ChatTool[]): [string, number][] => [
  ...tools.reduce(
    (counts, { source }) => counts.set(source, (counts.get(source) ?? 0) + 1),
    new Map<string, number>(),
  ),
];
