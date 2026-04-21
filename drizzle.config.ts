import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || `file:${process.env.DATABASE_PATH || './data/nexus.db'}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
