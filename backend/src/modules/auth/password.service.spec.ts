import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('verifies a hashed password and rejects a wrong one', async () => {
    const hashed = await passwords.hash('correct horse');

    expect(hashed).toMatch(/^\$argon2id\$/);
    await expect(passwords.verify(hashed, 'correct horse')).resolves.toBe(true);
    await expect(passwords.verify(hashed, 'wrong horse')).resolves.toBe(false);
  });

  it('always fails the dummy verify', async () => {
    await expect(passwords.verifyAgainstDummy('anything')).resolves.toBe(false);
  });
});
