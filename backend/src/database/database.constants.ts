export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE');
export const MIGRATIONS_FOLDER = './drizzle';
/** Arbitrary app-wide key so concurrent boots don't migrate at the same time. */
export const MIGRATION_LOCK_ID = 727_001;
export const PG_UNIQUE_VIOLATION = '23505';
