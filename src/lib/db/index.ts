import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Support both cloud (Turso) and local (file) SQLite
const isCloud = !!process.env.TURSO_DATABASE_URL;

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

// Ensure tables exist (runs on first connection)
async function ensureTables() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      url TEXT UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      key_takeaway TEXT,
      extracted_content TEXT,
      extracted_content_type TEXT,
      raw_scraped_content TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      content_type TEXT DEFAULT 'resource',
      source TEXT DEFAULT 'Web',
      status TEXT NOT NULL DEFAULT 'inbox',
      actionable INTEGER DEFAULT 0,
      note TEXT,
      ai_provider TEXT,
      embedding BLOB,
      embedding_model TEXT,
      embedding_dim INTEGER,
      pos_x REAL,
      pos_y REAL,
      pos_z REAL,
      scraped_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signal_tags (
      signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (signal_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      title TEXT,
      ai_provider TEXT NOT NULL,
      ai_model TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#7b8aff',
      icon TEXT DEFAULT '◇',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signal_collections (
      signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      PRIMARY KEY (signal_id, collection_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signal_enrichments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      enrichment_type TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS enrichment_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conductor_conversations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      title TEXT,
      ai_provider TEXT,
      ai_model TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conductor_messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      conversation_id TEXT NOT NULL REFERENCES conductor_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conductor_memory (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      category TEXT NOT NULL DEFAULT 'general',
      fact TEXT NOT NULL,
      source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Run table creation on startup
const _initPromise = ensureTables().catch((err) => {
  console.error('Failed to initialize database tables:', err);
});

export { db, _initPromise };
export type DbType = typeof db;
