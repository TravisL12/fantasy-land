import {
  type ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { McpTokenGuard } from './mcp-token.guard.js';

const context = (authorization?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  }) as ExecutionContext;

const guard = (token?: string) =>
  new McpTokenGuard({ getOrThrow: () => ({ token }) } as unknown as ConfigService);

describe('McpTokenGuard', () => {
  it('accepts the configured bearer token', () => {
    expect(guard('s3cret').canActivate(context('Bearer s3cret'))).toBe(true);
  });

  it('stays off until a token is configured', () => {
    expect(() => guard(undefined).canActivate(context('Bearer anything'))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects a wrong token', () => {
    expect(() => guard('s3cret').canActivate(context('Bearer nope'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing or non-bearer header', () => {
    expect(() => guard('s3cret').canActivate(context())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard('s3cret').canActivate(context('Basic s3cret'))).toThrow(
      UnauthorizedException,
    );
  });
});
