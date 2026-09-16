import {
  All,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { McpTokenGuard } from './guards/mcp-token.guard.js';
import {
  MCP_SERVER_MESSAGES,
  MCP_SERVER_ROUTE,
} from './mcp-server.constants.js';
import { McpServerService } from './mcp-server.service.js';

// @Public() only opts out of the session cookie — McpTokenGuard still applies.
@Public()
@UseGuards(McpTokenGuard)
@Controller(MCP_SERVER_ROUTE)
export class McpServerController {
  constructor(private readonly mcpServer: McpServerService) {}

  @Post()
  handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.mcpServer.handleRequest(req, res);
  }

  /** Stateless mode has no server-initiated stream, so GET and DELETE are 405. */
  @All()
  notAllowed(@Res() res: Response): void {
    res
      .status(HttpStatus.METHOD_NOT_ALLOWED)
      .json({ error: { message: MCP_SERVER_MESSAGES.methodNotAllowed } });
  }
}
