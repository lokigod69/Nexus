import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Dual-mode: TURSO_DATABASE_URL set → Turso cloud (prod), else local file.
//
// HARD OVERRIDE: NEXUS_LOCAL_DB=1 forces file mode even when TURSO_DATABASE_URL
// is set. .env.local carries live prod Turso credentials and Next.js loads it
// automatically — acceptance/dev runs must never touch prod.
const forceLocal = process.env.NEXUS_LOCAL_DB === '1';
const isCloud = !forceLocal && !!process.env.TURSO_DATABASE_URL;

const client = createClient(
  isCloud
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: `file:${process.env.DATABASE_PATH || './data/nexus.db'}`,
      }
);

const db = drizzle(client, { schema });

// Bootstrap v2 tables only (CREATE TABLE IF NOT EXISTS — no runtime
// migrations). NEVER drop or alter v1 tables (signals, tags, …): prod
// Turso still holds the user's v1 data.
async function ensureTables() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      kind TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      title TEXT,
      summary TEXT,
      takeaway TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      suggested_project TEXT,
      suggested_reason TEXT,
      project TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      enrich_status TEXT NOT NULL DEFAULT 'pending',
      extract TEXT,
      source TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      routed_at INTEGER,
      delivered_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS projects (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      synced_at INTEGER NOT NULL
    );
  `);
}

// Kick off table creation at module load; query helpers await this so the
// first request can never race the bootstrap.
const dbReady = ensureTables().catch((err) => {
  console.error('Failed to initialize database tables:', err);
  throw err;
});

export { db, dbReady };
export type DbType = typeof db;
