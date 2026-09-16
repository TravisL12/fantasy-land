import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { openSseStream, writeSseEvent } from '../../common/http/sse.js';
import {
  CHAT_MESSAGES,
  CHAT_ROLES,
  CHAT_ROUTE,
  CHAT_ROUTES,
} from './chat.constants.js';
import { ChatService } from './chat.service.js';
import type { ChatStatus } from './chat.types.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

@Controller(CHAT_ROUTE)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(CHAT_ROUTES.status)
  status(): Promise<ChatStatus> {
    return this.chatService.getStatus();
  }

  @Post(CHAT_ROUTES.stream)
  async stream(
    @Body() { messages }: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (messages.at(-1)?.role !== CHAT_ROLES.user) {
      throw new BadRequestException(CHAT_MESSAGES.lastMustBeUser);
    }

    const controller = new AbortController();
    req.on('close', () => controller.abort());
    openSseStream(res);

    for await (const event of this.chatService.run(
      messages,
      controller.signal,
    )) {
      if (controller.signal.aborted) break;
      writeSseEvent(res, event);
    }
    res.end();
  }
}
