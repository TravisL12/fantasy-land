import type { users } from './users.schema.js';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/** A user safe to send to clients. */
export type PublicUser = Pick<User, 'id' | 'email' | 'username' | 'createdAt'>;
