import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { pipeSseStream } from '../../common/http/sse.js';
import { CHAT_ROUTE, CHAT_ROUTES } from './chat.constants.js';
import { ChatService } from './chat.service.js';
import type { ChatStatus } from './chat.types.js';
import { assertUserTurn } from './chat.utils.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

@Controller(CHAT_ROUTE)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(CHAT_ROUTES.status)
  async status(): Promise<ChatStatus> {
    const status = await this.chatService.getStatus();
    // Opening the chat page is the earliest honest signal that a question is
    // coming, so the model load and prompt prefill happen while it is typed.
    void this.chatService.warmUp();
    return status;
  }

  @Post(CHAT_ROUTES.stream)
  async stream(
    @Body() { messages }: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    assertUserTurn(messages);

    return pipeSseStream(req, res, (signal) =>
      this.chatService.run(messages, signal),
    );
  }
}
