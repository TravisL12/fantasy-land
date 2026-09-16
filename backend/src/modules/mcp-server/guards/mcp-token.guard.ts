import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { MCP_HTTP_CONFIG_KEY } from '../../../config/config.constants.js';
import type { McpHttpConfig } from '../../../config/mcp-http.config.js';
import {
  BEARER_PREFIX,
  MCP_SERVER_MESSAGES,
} from '../mcp-server.constants.js';

/**
 * The MCP endpoint can't use the session cookie — its clients are Claude Code,
 * Claude Desktop and other agents, not the browser. It takes a bearer token
 * instead, and stays off entirely until one is configured.
 */
@Injectable()
export class McpTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const { token } = this.config.getOrThrow<McpHttpConfig>(
      MCP_HTTP_CONFIG_KEY,
    );
    if (!token) {
      throw new ServiceUnavailableException(MCP_SERVER_MESSAGES.disabled);
    }

    const header = context
      .switchToHttp()
      .getRequest<Request>()
      .headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(MCP_SERVER_MESSAGES.unauthorized);
    }
    if (!matches(header.slice(BEARER_PREFIX.length), token)) {
      throw new UnauthorizedException(MCP_SERVER_MESSAGES.unauthorized);
    }
    return true;
  }
}

/** Constant-time compare so the token can't be guessed a character at a time. */
const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
