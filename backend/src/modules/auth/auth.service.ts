import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, lt } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthConfig } from '../../config/auth.config.js';
import { AUTH_CONFIG_KEY } from '../../config/config.constants.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { users } from '../users/users.schema.js';
import { UsersService } from '../users/users.service.js';
import {
  AUTH_MESSAGES,
  SESSION_RENEW_FRACTION,
  SESSION_TOKEN_BYTES,
} from './auth.constants.js';
import type { IssuedSession, ValidatedSession } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { sessions } from './sessions.schema.js';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly sessionTtlMs: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly passwords: PasswordService,
    config: ConfigService,
  ) {
    this.sessionTtlMs =
      config.getOrThrow<AuthConfig>(AUTH_CONFIG_KEY).sessionTtlMs;
  }

  async register({ email, username, password }: RegisterDto) {
    const user = await this.usersService.create({
      email,
      username,
      passwordHash: await this.passwords.hash(password),
    });
    return this.issueSession(user.id, this.usersService.toPublic(user));
  }

  async login({ email, password }: LoginDto): Promise<IssuedSession> {
    const user = await this.usersService.findByEmail(email);
    const valid = user
      ? await this.passwords.verify(user.passwordHash, password)
      : await this.passwords.verifyAgainstDummy(password);

    if (!user || !valid) {
      throw new UnauthorizedException(AUTH_MESSAGES.invalidCredentials);
    }
    return this.issueSession(user.id, this.usersService.toPublic(user));
  }

  async logout(token: string) {
    await this.db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }

  async validateSession(token: string): Promise<ValidatedSession | null> {
    const id = hashToken(token);
    const [row] = await this.db
      .select({ user: users, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id));

    if (!row) return null;

    const now = Date.now();
    if (row.expiresAt.getTime() <= now) {
      await this.db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }

    const user = this.usersService.toPublic(row.user);
    const remainingMs = row.expiresAt.getTime() - now;
    if (remainingMs > this.sessionTtlMs * SESSION_RENEW_FRACTION) {
      return { user, expiresAt: row.expiresAt, renewed: false };
    }

    const expiresAt = new Date(now + this.sessionTtlMs);
    await this.db
      .update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.id, id));
    return { user, expiresAt, renewed: true };
  }

  private async issueSession(
    userId: string,
    user: IssuedSession['user'],
  ): Promise<IssuedSession> {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    // Opportunistically prune this user's expired sessions.
    await this.db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
    await this.db
      .insert(sessions)
      .values({ id: hashToken(token), userId, expiresAt });

    return { user, token, expiresAt };
  }
}
