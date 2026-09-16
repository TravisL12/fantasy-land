import type { ChatMessage } from '@/api/chat';
import { streamSse } from '@/api/streamSse';
import { DASHBOARD_BUILD_URL } from './dashboards.constants';
import type { DashboardStreamEvent } from './dashboards.types';

/** Same shape as the chat stream, plus a `dashboard_spec` event. */
export const streamDashboardBuild = (
  messages: ChatMessage[],
  signal: AbortSignal,
) =>
  streamSse<DashboardStreamEvent>(DASHBOARD_BUILD_URL, { messages }, signal);
