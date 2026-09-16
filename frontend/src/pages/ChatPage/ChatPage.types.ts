import type { ChatRole } from '@/api/chat';
import type { TOOL_STATUSES } from './ChatPage.constants';

export type ToolStatus = (typeof TOOL_STATUSES)[keyof typeof TOOL_STATUSES];

export interface ToolCallView {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolStatus;
  /** The tool's text output, once it has come back. */
  result?: string;
}

export interface ChatTurn {
  id: string;
  role: ChatRole;
  content: string;
  thinking: string;
  toolCalls: ToolCallView[];
}
