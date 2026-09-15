import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthConfig } from '../../config/auth.config.js';
import { AUTH_CONFIG_KEY } from '../../config/config.constants.js';
import { SESSION_COOKIE } from './auth.constants.js';

@Injectable()
export class SessionCookieService {
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.secure = config.getOrThrow<AuthConfig>(AUTH_CONFIG_KEY).secureCookies;
  }

  read(req: Request): string | undefined {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    return typeof token === 'string' && token ? token : undefined;
  }

  set(res: Response, token: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE, token, { ...this.options(), expires: expiresAt });
  }

  clear(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.options());
  }

  private options() {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
    } as const;
  }
}
