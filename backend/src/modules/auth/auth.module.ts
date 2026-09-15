import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module.js';
import { AUTH_THROTTLE } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './guards/session.guard.js';
import { PasswordService } from './password.service.js';
import { SessionCookieService } from './session-cookie.service.js';

@Module({
  imports: [UsersModule, ThrottlerModule.forRoot([AUTH_THROTTLE])],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionCookieService,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
