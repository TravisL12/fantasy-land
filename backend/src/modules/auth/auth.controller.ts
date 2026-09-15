import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { PublicUser } from '../users/users.types.js';
import { AUTH_ROUTE, AUTH_ROUTES } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { IssuedSession } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { SessionResponseDto } from './dto/session-response.dto.js';
import { SessionCookieService } from './session-cookie.service.js';

@Public()
@Controller(AUTH_ROUTE)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: SessionCookieService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Post(AUTH_ROUTES.register)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    return this.startSession(res, await this.authService.register(dto));
  }

  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.login)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    return this.startSession(res, await this.authService.login(dto));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(AUTH_ROUTES.logout)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = this.cookies.read(req);
    if (token) await this.authService.logout(token);
    this.cookies.clear(res);
  }

  @Get(AUTH_ROUTES.me)
  me(@CurrentUser() user?: PublicUser): SessionResponseDto {
    return { user: user ?? null };
  }

  private startSession(
    res: Response,
    { user, token, expiresAt }: IssuedSession,
  ): SessionResponseDto {
    this.cookies.set(res, token, expiresAt);
    return { user };
  }
}
