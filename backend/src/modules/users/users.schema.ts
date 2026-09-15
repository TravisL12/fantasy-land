import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import {
  USERNAME_UNIQUE_INDEX,
  USERS_EMAIL_UNIQUE,
} from './users.constants.js';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(USERS_EMAIL_UNIQUE),
    username: text().notNull(),
    passwordHash: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Usernames are unique case-insensitively but keep their display casing.
  (t) => [uniqueIndex(USERNAME_UNIQUE_INDEX).on(sql`lower(${t.username})`)],
);
