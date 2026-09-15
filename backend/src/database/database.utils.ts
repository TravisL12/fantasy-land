import { PG_UNIQUE_VIOLATION } from './database.constants.js';

interface PgError {
  code?: string;
  constraint?: string;
}

// Drizzle wraps driver errors, so the pg error may be on `cause`.
// Returns the violated constraint name, or undefined for any other error.
export const getUniqueViolation = (error: unknown): string | undefined => {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  const pgError = candidates.find(
    (e): e is PgError => (e as PgError)?.code === PG_UNIQUE_VIOLATION,
  );
  return pgError?.constraint;
};
