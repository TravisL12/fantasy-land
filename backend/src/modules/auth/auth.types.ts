import type { Request } from 'express';
import type { PublicUser } from '../users/users.types.js';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

export interface IssuedSession {
  user: PublicUser;
  token: string;
  expiresAt: Date;
}

export interface ValidatedSession {
  user: PublicUser;
  expiresAt: Date;
  renewed: boolean;
}
