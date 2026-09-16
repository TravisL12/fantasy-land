import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';
import type { DashboardSpec } from './dashboards.types.js';

// The spec is stored, never the data: opening a dashboard re-runs its sources.
export const dashboards = pgTable(
  'dashboards',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text(),
    spec: jsonb().$type<DashboardSpec>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('dashboards_user_id_idx').on(t.userId)],
);
