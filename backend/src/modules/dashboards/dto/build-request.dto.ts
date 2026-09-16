import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { MAX_MESSAGES } from '../../chat/chat.constants.js';
import { ChatMessageDto } from '../../chat/dto/chat-request.dto.js';

export class BuildRequestDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_MESSAGES)
  messages!: ChatMessageDto[];
}
