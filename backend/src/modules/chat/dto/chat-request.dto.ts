import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CHAT_ROLES,
  MAX_MESSAGES,
  MESSAGE_MAX_LENGTH,
} from '../chat.constants.js';

/** Only the two roles a client is allowed to send — system and tool are ours. */
const CLIENT_ROLES = [CHAT_ROLES.user, CHAT_ROLES.assistant];

export class ChatMessageDto {
  @IsIn(CLIENT_ROLES)
  role!: (typeof CLIENT_ROLES)[number];

  @IsString()
  @MaxLength(MESSAGE_MAX_LENGTH)
  content!: string;
}

export class ChatRequestDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_MESSAGES)
  messages!: ChatMessageDto[];
}
