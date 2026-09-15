import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/**/*.schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://app:app@localhost:5432/fantasy_land',
  },
});
