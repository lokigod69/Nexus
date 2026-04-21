import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Signals — the core entity
// ============================================================

export const signals = sqliteTable('signals', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  url: text('url'),
  title: text('title').notNull(),
  summary: text('summary'),
  keyTakeaway: text('key_takeaway'),
  extractedContent: text('extracted_content'),
  extractedContentType: text('extracted_content_type'),
  rawScrapedContent: text('raw_scraped_content'),
  category: text('category').notNull().default('other'),
  contentType: text('content_type').default('resource'),
  source: text('source').default('Web'),
  status: text('status').notNull().default('inbox'),
  actionable: integer('actionable').default(0),
  note: text('note'),
  aiProvider: text('ai_provider'),
  embedding: blob('embedding'),
  embeddingModel: text('embedding_model'),
  embeddingDim: integer('embedding_dim'),
  posX: real('pos_x'),
  posY: real('pos_y'),
  posZ: real('pos_z'),
  scrapedAt: text('scraped_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text('reviewed_at'),
  archivedAt: text('archived_at'),
});

// ============================================================
// Tags
// ============================================================

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Signal ↔ Tag join table
// ============================================================

export const signalTags = sqliteTable(
  'signal_tags',
  {
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.signalId, table.tagId] }),
  })
);

// ============================================================
// Conversations
// ============================================================

export const conversations = sqliteTable('conversations', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  signalId: text('signal_id')
    .notNull()
    .references(() => signals.id, { onDelete: 'cascade' }),
  title: text('title'),
  aiProvider: text('ai_provider').notNull(),
  aiModel: text('ai_model').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Messages
// ============================================================

export const messages = sqliteTable('messages', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Collections
// ============================================================

export const collections = sqliteTable('collections', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#7b8aff'),
  icon: text('icon').default('◇'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Signal ↔ Collection join table
// ============================================================

export const signalCollections = sqliteTable(
  'signal_collections',
  {
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id, { onDelete: 'cascade' }),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.signalId, table.collectionId] }),
  })
);

// ============================================================
// Settings (key-value store)
// ============================================================

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ============================================================
// Signal Enrichments (per-signal enrichment data)
// ============================================================

export const signalEnrichments = sqliteTable('signal_enrichments', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  signalId: text('signal_id')
    .notNull()
    .references(() => signals.id, { onDelete: 'cascade' }),
  enrichmentType: text('enrichment_type').notNull(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at'),
});

// ============================================================
// Enrichment Cache (app-level cached data)
// ============================================================

export const enrichmentCache = sqliteTable('enrichment_cache', {
  key: text('key').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
});

// ============================================================
// Conductor Conversations (global AI navigator — no signal FK)
// ============================================================

export const conductorConversations = sqliteTable('conductor_conversations', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  title: text('title'),
  aiProvider: text('ai_provider'),
  aiModel: text('ai_model'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Conductor Messages
// ============================================================

export const conductorMessages = sqliteTable('conductor_messages', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conductorConversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON: signalMap, expandedSignalIds, etc.
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// Conductor Memory (persistent facts across conversations)
// ============================================================

export const conductorMemory = sqliteTable('conductor_memory', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(8))))`),
  category: text('category').notNull().default('general'),    // user_preference, project, goal, insight, general
  fact: text('fact').notNull(),
  source: text('source'),            // conversation ID or 'manual'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
