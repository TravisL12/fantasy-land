import type { ChatRole, ToolCall } from '@/api/chat';
import type { TOOL_STATUSES } from '@/constants';

export type ToolStatus = (typeof TOOL_STATUSES)[keyof typeof TOOL_STATUSES];

/** A tool call from the stream, plus how it is going. */
export interface ToolCallView extends ToolCall {
  status: ToolStatus;
  /** The tool's text output, once it has come back. */
  result?: string;
}

/** One side of a conversation, with everything the model did to produce it. */
export interface ChatTurn {
  id: string;
  role: ChatRole;
  content: string;
  thinking: string;
  toolCalls: ToolCallView[];
}
