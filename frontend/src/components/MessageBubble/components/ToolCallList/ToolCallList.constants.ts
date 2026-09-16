import type { ToolStatus } from '@/types';

export const TOOL_STATUS_ICONS: Record<ToolStatus, string> = {
  running: '⋯',
  ok: '✓',
  error: '!',
};

export const TOOL_COPY = {
  pending: 'Running…',
  argsLabel: 'Arguments',
  resultLabel: 'Result',
} as const;
