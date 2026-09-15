import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { AuthService } from '../auth.service.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { SessionCookieService } from '../session-cookie.service.js';

// Registered globally: every route requires a session unless marked @Public().
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly cookies: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const res = http.getResponse<Response>();

    const token = this.cookies.read(req);
    if (token) {
      const session = await this.authService.validateSession(token);
      if (session) {
        req.user = session.user;
        if (session.renewed) this.cookies.set(res, token, session.expiresAt);
      } else {
        this.cookies.clear(res);
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic && !req.user) throw new UnauthorizedException();
    return true;
  }
}
