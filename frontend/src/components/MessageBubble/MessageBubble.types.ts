import type { ChatTurn } from '@/types';

export interface MessageBubbleProps {
  turn: ChatTurn;
  /** True while this turn is still receiving tokens. */
  isStreaming: boolean;
}
