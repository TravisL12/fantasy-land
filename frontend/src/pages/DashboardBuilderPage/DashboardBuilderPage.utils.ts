import { CHAT_ROLES } from '@/api/chat';
import { PROMPT_MAX_LENGTH } from '@/api/dashboards';
import type { ChatTurn } from '@/types';
import { PROMPT_SEPARATOR } from './DashboardBuilderPage.constants';

/**
 * What the dashboard is saved as having been asked for: the prompt it already
 * carried, followed by this session's requests. A refinement adds a line rather
 * than replacing the original ask, so the dashboard keeps its whole history.
 */
export const collectPrompt = (
  existing: string | null | undefined,
  turns: ChatTurn[],
): string => {
  const asked = [
    existing ?? '',
    ...turns
      .filter((turn) => turn.role === CHAT_ROLES.user)
      .map((turn) => turn.content),
  ]
    .map((text) => text.trim())
    .filter(Boolean);

  // Past the column's ceiling the oldest requests go first: the newest ones are
  // what the dashboard on screen actually reflects.
  while (
    asked.length > 1 &&
    asked.join(PROMPT_SEPARATOR).length > PROMPT_MAX_LENGTH
  ) {
    asked.shift();
  }

  return asked.join(PROMPT_SEPARATOR).slice(0, PROMPT_MAX_LENGTH);
};
