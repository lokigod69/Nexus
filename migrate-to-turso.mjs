/**
 * migrate-to-turso.mjs
 * 
 * One-time script to copy all data from your local nexus.db
 * into the Turso cloud database.
 * 
 * Usage:  node migrate-to-turso.mjs
 * 
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env vars from .env.local manually (no dotenv dependency needed)
try {
  const envFile = readFileSync(resolve('.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch { /* .env.local not found, rely on existing env */ }

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const LOCAL_DB = process.env.DATABASE_PATH || './data/nexus.db';

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
  process.exit(1);
}

console.log('📦 Opening local database:', LOCAL_DB);
console.log('☁️  Target Turso database:', TURSO_URL);
console.log('');

// Connect to local SQLite file
const local = createClient({ url: `file:${LOCAL_DB}` });

// Connect to remote Turso
const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Tables to migrate (in dependency order)
const TABLES = [
  'signals',
  'tags',
  'signal_tags',
  'conversations',
  'messages',
  'collections',
  'signal_collections',
  'settings',
  'signal_enrichments',
  'enrichment_cache',
  'conductor_conversations',
  'conductor_messages',
  'conductor_memory',
];

async function migrateTable(tableName) {
  try {
    // Read all rows from local
    const result = await local.execute(`SELECT * FROM ${tableName}`);
    
    if (result.rows.length === 0) {
      console.log(`  ⏭️  ${tableName}: empty, skipping`);
      return 0;
    }

    const columns = result.columns;
    const placeholders = columns.map(() => '?').join(', ');
    const insertSQL = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    // Insert in batches of 20 (Turso has request size limits)
    const BATCH_SIZE = 20;
    let inserted = 0;

    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const batch = result.rows.slice(i, i + BATCH_SIZE);
      
      const statements = batch.map(row => ({
        sql: insertSQL,
        args: columns.map(col => {
          const val = row[col];
          // Handle binary data (embeddings) — convert ArrayBuffer to Buffer for transit
          if (val instanceof ArrayBuffer || val instanceof Uint8Array) {
            return Buffer.from(val);
          }
          return val ?? null;
        }),
      }));

      await remote.batch(statements);
      inserted += batch.length;
    }

    console.log(`  ✅ ${tableName}: ${inserted} rows migrated`);
    return inserted;
  } catch (err) {
    // Table might not exist locally
    if (err.message?.includes('no such table')) {
      console.log(`  ⏭️  ${tableName}: doesn't exist locally, skipping`);
      return 0;
    }
    console.error(`  ❌ ${tableName}: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting migration...\n');
  
  let totalRows = 0;

  for (const table of TABLES) {
    totalRows += await migrateTable(table);
  }

  console.log(`\n✨ Migration complete! ${totalRows} total rows migrated.`);
  console.log('🌐 Your Nexus data is now in the cloud!');
  
  process.exit(0);
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
