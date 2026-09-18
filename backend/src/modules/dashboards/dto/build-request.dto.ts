import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { MAX_MESSAGES } from '../../chat/chat.constants.js';
import { ChatMessageDto } from '../../chat/dto/chat-request.dto.js';

export class BuildRequestDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_MESSAGES)
  messages!: ChatMessageDto[];

  /**
   * The dashboard already on screen, when there is one. It is what turns a
   * second message into a refinement rather than a fresh build.
   */
  @IsOptional()
  @IsObject()
  spec?: Record<string, unknown>;
}
