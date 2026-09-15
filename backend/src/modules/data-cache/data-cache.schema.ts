import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Normalized third-party data (stat lines, catalogs, ...) keyed by provider + query.
export const dataCache = pgTable('data_cache', {
  key: text().primaryKey(),
  payload: jsonb().notNull(),
  fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});
