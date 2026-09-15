import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Library defaults are argon2id with OWASP-recommended cost parameters.
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  /** Burns the same time as a real verify so unknown emails can't be detected by timing. */
  async verifyAgainstDummy(password: string): Promise<false> {
    this.dummyHash ??= hash('dummy-password-for-timing');
    await verify(await this.dummyHash, password);
    return false;
  }
}
