import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Captures — the core v2 entity (mirrors the Capture interface
// in src/types/index.ts). Timestamps are unix seconds (integer),
// tags are stored as JSON text and always surfaced as string[].
// ============================================================

export const captures = sqliteTable('captures', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  kind: text('kind').notNull(), // 'url' | 'text'
  content: text('content').notNull(), // verbatim paste, never rewritten
  url: text('url'),
  title: text('title'),
  summary: text('summary'),
  takeaway: text('takeaway'),
  tags: text('tags').notNull().default('[]'), // JSON string[]
  suggestedProject: text('suggested_project'),
  suggestedReason: text('suggested_reason'),
  project: text('project'),
  status: text('status').notNull().default('inbox'), // inbox | routed | delivered | archived
  enrichStatus: text('enrich_status').notNull().default('pending'), // pending | done | failed
  extract: text('extract'),
  source: text('source'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
  routedAt: integer('routed_at'),
  deliveredAt: integer('delivered_at'),
});

// ============================================================
// Projects — synced SecondBrainOS registry (mirrors BrainProject).
// Full-replace on PUT /api/projects.
// ============================================================

export const projects = sqliteTable('projects', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  description: text('description').notNull().default(''),
  syncedAt: integer('synced_at').notNull(),
});
