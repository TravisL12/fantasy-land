import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { PublicUser } from '../users/users.types.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionCookieService } from './session-cookie.service.js';

describe('AuthController', () => {
  const user: PublicUser = {
    id: 'user-1',
    email: 'coach@example.com',
    username: 'coach',
    createdAt: new Date(),
  };
  const session = { user, token: 'token-1', expiresAt: new Date() };
  const res = {} as Response;

  const authService = {
    register: vi.fn().mockResolvedValue(session),
    login: vi.fn().mockResolvedValue(session),
    logout: vi.fn(),
  };
  const cookies = { read: vi.fn(), set: vi.fn(), clear: vi.fn() };
  let controller: AuthController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionCookieService, useValue: cookies },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AuthController);
  });

  it('sets the session cookie on login without leaking the token', async () => {
    const body = await controller.login(
      { email: user.email, password: 'secret123' },
      res,
    );

    expect(cookies.set).toHaveBeenCalledWith(res, session.token, session.expiresAt);
    expect(body).toEqual({ user });
  });

  it('revokes the session and clears the cookie on logout', async () => {
    cookies.read.mockReturnValue('token-1');

    await controller.logout({} as Request, res);

    expect(authService.logout).toHaveBeenCalledWith('token-1');
    expect(cookies.clear).toHaveBeenCalledWith(res);
  });

  it('returns a null user when logged out', () => {
    expect(controller.me(undefined)).toEqual({ user: null });
  });
});
