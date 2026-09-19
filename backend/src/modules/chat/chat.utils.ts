import { BadRequestException } from '@nestjs/common';
import { CHAT_MESSAGES, CHAT_ROLES } from './chat.constants.js';
import type { ChatMessage } from './chat.types.js';

/**
 * A turn the model is asked to answer has to end with the user's own message:
 * an assistant message last would make it answer itself. Both the chat and the
 * dashboard builder run the same loop, so both check it the same way.
 */
export const assertUserTurn = (messages: ChatMessage[]) => {
  if (messages.at(-1)?.role !== CHAT_ROLES.user) {
    throw new BadRequestException(CHAT_MESSAGES.lastMustBeUser);
  }
};
