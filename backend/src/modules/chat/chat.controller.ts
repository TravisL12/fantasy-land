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
import {
  CHAT_MESSAGES,
  CHAT_ROLES,
  CHAT_ROUTE,
  CHAT_ROUTES,
} from './chat.constants.js';
import { ChatService } from './chat.service.js';
import type { ChatStatus, ChatStreamEvent } from './chat.types.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Stops nginx-style proxies from buffering the stream into one response.
  'X-Accel-Buffering': 'no',
} as const;

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
    res.writeHead(200, SSE_HEADERS).flushHeaders();

    for await (const event of this.chatService.run(
      messages,
      controller.signal,
    )) {
      if (controller.signal.aborted) break;
      write(res, event);
    }
    res.end();
  }
}

const write = (res: Response, event: ChatStreamEvent) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};
