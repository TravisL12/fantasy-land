import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';
import { MIGRATION_LOCK_ID, MIGRATIONS_FOLDER } from './database.constants.js';

// Applies pending migrations under an advisory lock, so parallel app
// instances (or test files) wait for each other instead of racing.
export const runMigrations = async (pool: Pool) => {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID])
      .finally(() => client.release());
  }
};
