import type { ChatMessage } from '@/api/chat';
import { streamSse } from '@/api/streamSse';
import { DASHBOARD_BUILD_URL } from './dashboards.constants';
import type { DashboardSpec, DashboardStreamEvent } from './dashboards.types';

/**
 * Same shape as the chat stream, plus a `dashboard_spec` event. Passing the
 * dashboard already on screen is what makes the next message refine it rather
 * than start over — the history carries only the text turns.
 */
export const streamDashboardBuild = (
  messages: ChatMessage[],
  signal: AbortSignal,
  spec?: DashboardSpec,
) => streamSse<DashboardStreamEvent>(DASHBOARD_BUILD_URL, { messages, spec }, signal);
