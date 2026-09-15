import { PG_UNIQUE_VIOLATION } from './database.constants.js';
import { getUniqueViolation } from './database.utils.js';

describe('getUniqueViolation', () => {
  const pgError = { code: PG_UNIQUE_VIOLATION, constraint: 'users_email_unique' };

  it('reads the constraint from a raw or wrapped pg error', () => {
    expect(getUniqueViolation(pgError)).toBe('users_email_unique');
    expect(getUniqueViolation({ cause: pgError })).toBe('users_email_unique');
  });

  it('ignores other errors', () => {
    expect(getUniqueViolation(new Error('boom'))).toBeUndefined();
    expect(getUniqueViolation({ cause: { code: '23503' } })).toBeUndefined();
  });
});
