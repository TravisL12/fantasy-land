export const AUTH_ROUTE = 'auth';
export const AUTH_ROUTES = {
  register: 'register',
  login: 'login',
  logout: 'logout',
  me: 'me',
} as const;

export const SESSION_COOKIE = 'session';
export const SESSION_TOKEN_BYTES = 32;
/** Extend a session once less than this fraction of its TTL remains. */
export const SESSION_RENEW_FRACTION = 0.5;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

export const AUTH_THROTTLE = { ttl: 60_000, limit: 10 };

export const AUTH_MESSAGES = {
  invalidCredentials: 'Invalid email or password',
  usernamePattern: 'Username may only contain letters, numbers, and underscores',
} as const;
