import type { ChatTurn } from '../../ChatPage.types';

export interface MessageBubbleProps {
  turn: ChatTurn;
  /** True while this turn is still receiving tokens. */
  isStreaming: boolean;
}
