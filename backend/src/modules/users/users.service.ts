import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { getUniqueViolation } from '../../database/database.utils.js';
import { USER_CONFLICT_MESSAGES } from './users.constants.js';
import { users } from './users.schema.js';
import type { NewUser, PublicUser, User } from './users.types.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async create(data: NewUser): Promise<User> {
    try {
      const [user] = await this.db.insert(users).values(data).returning();
      return user;
    } catch (error) {
      const constraint = getUniqueViolation(error);
      if (constraint && USER_CONFLICT_MESSAGES[constraint]) {
        throw new ConflictException(USER_CONFLICT_MESSAGES[constraint]);
      }
      throw error;
    }
  }

  toPublic({ id, email, username, createdAt }: User): PublicUser {
    return { id, email, username, createdAt };
  }
}
