import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/nexus.db';

function ensureTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      url TEXT NOT NULL UNIQUE,
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
  `);
}

function getDb() {
  // Check globalThis for existing connection (survives HMR)
  const globalAny = globalThis as any;
  if (globalAny.__nexusDb) return globalAny.__nexusDb;

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables if they don't exist (no migrations needed)
  ensureTables(sqlite);

  const db = drizzle(sqlite, { schema });
  globalAny.__nexusDb = db;
  return db;
}

export const db = getDb();
export type DbType = typeof db;
