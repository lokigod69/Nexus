import { eq, and, or, like, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from './index';
import {
  signals,
  tags,
  signalTags,
  conversations,
  messages,
  signalEnrichments,
  enrichmentCache,
  settings,
  conductorConversations,
  conductorMessages,
  conductorMemory,
} from './schema';
import type { Signal, SignalFilters } from '@/types';

type SignalRow = typeof signals.$inferSelect;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transaction = any;

// ============================================================
// Signals
// ============================================================

/**
 * Fetch enrichments for a list of signal IDs (batch).
 */
async function fetchEnrichmentsForSignals(signalIds: string[]) {
  if (signalIds.length === 0) return new Map<string, Record<string, unknown>>();

  const rows = await db
    .select()
    .from(signalEnrichments)
    .where(inArray(signalEnrichments.signalId, signalIds))
    .all();

  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!map.has(row.signalId)) {
      map.set(row.signalId, {});
    }
    const enrichments = map.get(row.signalId)!;
    try {
      enrichments[row.enrichmentType] = JSON.parse(row.data);
    } catch {
      enrichments[row.enrichmentType] = row.data;
    }
  }
  return map;
}

/**
 * Fetch tags for a list of signal IDs (batch).
 */
async function fetchTagsForSignals(signalIds: string[]) {
  if (signalIds.length === 0) return new Map<string, { id: number; name: string; createdAt: string }[]>();

  const rows = await db
    .select({
      signalId: signalTags.signalId,
      tagId: tags.id,
      tagName: tags.name,
      tagCreatedAt: tags.createdAt,
    })
    .from(signalTags)
    .innerJoin(tags, eq(signalTags.tagId, tags.id))
    .where(inArray(signalTags.signalId, signalIds))
    .all();

  const map = new Map<string, { id: number; name: string; createdAt: string }[]>();
  for (const row of rows) {
    const list = map.get(row.signalId) || [];
    list.push({ id: row.tagId, name: row.tagName, createdAt: row.tagCreatedAt! });
    map.set(row.signalId, list);
  }
  return map;
}

export async function getAllSignals(filters: SignalFilters = {}) {
  const { status, category, tag, search, sort = 'newest', limit = 50, offset = 0 } = filters;

  // If filtering by tag, we need to find matching signal IDs first
  let tagFilteredIds: string[] | null = null;
  if (tag) {
    const tagRow = await db.select().from(tags).where(eq(tags.name, tag)).get();
    if (!tagRow) {
      return { signals: [], total: 0 };
    }
    const rows = await db
      .select({ signalId: signalTags.signalId })
      .from(signalTags)
      .where(eq(signalTags.tagId, tagRow.id))
      .all();
    const ids = rows.map((r: { signalId: string }) => r.signalId);
    if (ids.length === 0) {
      return { signals: [], total: 0 };
    }
    tagFilteredIds = ids;
  }

  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (tagFilteredIds && tagFilteredIds.length > 0) {
    conditions.push(inArray(signals.id, tagFilteredIds));
  }

  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    if (statuses.length === 1) {
      conditions.push(eq(signals.status, statuses[0]));
    } else {
      conditions.push(inArray(signals.status, statuses));
    }
  }

  if (category) {
    const categories = category.split(',').map((c) => c.trim());
    if (categories.length === 1) {
      conditions.push(eq(signals.category, categories[0]));
    } else {
      conditions.push(inArray(signals.category, categories));
    }
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(signals.title, pattern),
        like(signals.summary, pattern),
        like(signals.note, pattern)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total (without limit/offset)
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .where(whereClause)
    .get();

  const total = countResult?.count ?? 0;

  // Build ORDER BY
  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = asc(signals.createdAt);
      break;
    case 'starred':
      orderBy = sql`CASE WHEN ${signals.status} = 'starred' THEN 0 ELSE 1 END, ${signals.createdAt} DESC`;
      break;
    case 'newest':
    default:
      orderBy = desc(signals.createdAt);
      break;
  }

  const rows = await db
    .select()
    .from(signals)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  // Fetch tags for returned signals
  const signalIds = rows.map((r: SignalRow) => r.id!);
  const tagsMap = await fetchTagsForSignals(signalIds);

  // Fetch enrichments for returned signals (batch query)
  const enrichmentsMap = await fetchEnrichmentsForSignals(signalIds);

  const signalsWithTags = rows.map((row: SignalRow) => ({
    ...row,
    tags: tagsMap.get(row.id!) || [],
    enrichments: enrichmentsMap.get(row.id!) || {},
  }));

  return { signals: signalsWithTags, total };
}

export async function getSignalById(id: string) {
  const row = await db.select().from(signals).where(eq(signals.id, id)).get();
  if (!row) return null;

  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
    })
    .from(signalTags)
    .innerJoin(tags, eq(signalTags.tagId, tags.id))
    .where(eq(signalTags.signalId, id))
    .all();

  // Fetch enrichments
  const enrichments = await getSignalEnrichments(id);

  return { ...row, tags: tagRows, enrichments };
}

export async function createSignal(data: {
  url: string | null;
  title: string;
  summary?: string | null;
  keyTakeaway?: string | null;
  extractedContent?: string | null;
  extractedContentType?: string | null;
  rawScrapedContent?: string | null;
  category?: string;
  contentType?: string;
  source?: string;
  status?: string;
  actionable?: number;
  note?: string | null;
  aiProvider?: string | null;
  tags?: string[];
}) {
  const { tags: tagNames, ...signalData } = data;

  return db.transaction(async (tx: Transaction) => {
    const inserted = await tx
      .insert(signals)
      .values(signalData)
      .returning()
      .get();

    const insertedTags: { id: number; name: string; createdAt: string }[] = [];

    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        // Upsert tag: insert or ignore
        await tx.run(sql`INSERT OR IGNORE INTO tags (name) VALUES (${tagName})`);

        const tag = await tx
          .select()
          .from(tags)
          .where(eq(tags.name, tagName))
          .get();

        if (tag) {
          await tx.insert(signalTags)
            .values({ signalId: inserted.id!, tagId: tag.id })
            .run();

          insertedTags.push({
            id: tag.id,
            name: tag.name,
            createdAt: tag.createdAt!,
          });
        }
      }
    }

    return { ...inserted, tags: insertedTags };
  });
}

export async function updateSignal(id: string, data: Partial<Signal>) {
  // Strip joined fields that aren't columns
  const { tags: _tags, ...updateData } = data as any;

  const updated = await db
    .update(signals)
    .set({ ...updateData, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(signals.id, id))
    .returning()
    .get();

  return updated;
}

export async function deleteSignal(id: string) {
  await db.delete(signals).where(eq(signals.id, id)).run();
}

// ============================================================
// Conversations
// ============================================================

export async function getConversation(signalId: string) {
  const row = await db
    .select()
    .from(conversations)
    .where(eq(conversations.signalId, signalId))
    .get();

  return row ?? null;
}

export async function createConversation(
  signalId: string,
  provider: string,
  model: string
) {
  const inserted = await db
    .insert(conversations)
    .values({
      signalId,
      aiProvider: provider,
      aiModel: model,
    })
    .returning()
    .get();

  return inserted;
}

// ============================================================
// Messages
// ============================================================

export async function getMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .all();
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string
) {
  const inserted = await db
    .insert(messages)
    .values({ conversationId, role, content })
    .returning()
    .get();

  // Update conversation's updatedAt
  await db.update(conversations)
    .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(conversations.id, conversationId))
    .run();

  return inserted;
}

// ============================================================
// Embeddings & Positions
// ============================================================

export async function getAllSignalEmbeddings() {
  return db
    .select({
      id: signals.id,
      embedding: signals.embedding,
    })
    .from(signals)
    .where(sql`${signals.embedding} IS NOT NULL`)
    .all();
}

export async function getAllSignalEmbeddingsWithCategory() {
  return db
    .select({
      id: signals.id,
      embedding: signals.embedding,
      category: signals.category,
    })
    .from(signals)
    .where(sql`${signals.embedding} IS NOT NULL`)
    .all();
}

export async function getSignalByUrl(url: string) {
  return await db.select().from(signals).where(eq(signals.url, url)).get() ?? null;
}

export async function updateSignalPositions(
  positions: Map<string, { x: number; y: number; z: number }>
) {
  await db.transaction(async (tx: Transaction) => {
    for (const [id, pos] of positions) {
      await tx.update(signals)
        .set({
          posX: pos.x,
          posY: pos.y,
          posZ: pos.z,
        })
        .where(eq(signals.id, id))
        .run();
    }
  });
}

export async function updateSignalEmbedding(
  id: string,
  embedding: Buffer,
  model: string,
  dim: number
) {
  await db.update(signals)
    .set({
      embedding,
      embeddingModel: model,
      embeddingDim: dim,
    })
    .where(eq(signals.id, id))
    .run();
}

// ============================================================
// Stats
// ============================================================

// ============================================================
// Enrichments
// ============================================================

export async function getSignalEnrichments(signalId: string): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(signalEnrichments)
    .where(eq(signalEnrichments.signalId, signalId))
    .all();

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      result[row.enrichmentType] = JSON.parse(row.data);
    } catch {
      result[row.enrichmentType] = row.data;
    }
  }
  return result;
}

export async function upsertSignalEnrichment(
  signalId: string,
  enrichmentType: string,
  data: unknown,
  expiresAt?: string
) {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

  // Atomic delete+insert within a transaction
  await db.transaction(async (tx: Transaction) => {
    await tx.delete(signalEnrichments)
      .where(
        and(
          eq(signalEnrichments.signalId, signalId),
          eq(signalEnrichments.enrichmentType, enrichmentType)
        )
      )
      .run();

    await tx.insert(signalEnrichments)
      .values({
        signalId,
        enrichmentType,
        data: jsonData,
        expiresAt: expiresAt || null,
      })
      .run();
  });
}

export async function getCacheEntry(key: string): Promise<unknown | null> {
  const row = await db
    .select()
    .from(enrichmentCache)
    .where(eq(enrichmentCache.key, key))
    .get();

  if (!row) return null;

  // Check expiration
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    await db.delete(enrichmentCache).where(eq(enrichmentCache.key, key)).run();
    return null;
  }

  try {
    return JSON.parse(row.data);
  } catch {
    return row.data;
  }
}

export async function setCacheEntry(key: string, data: unknown, expiresAt: string) {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

  await db.delete(enrichmentCache).where(eq(enrichmentCache.key, key)).run();

  await db.insert(enrichmentCache)
    .values({
      key,
      data: jsonData,
      expiresAt,
    })
    .run();
}

export async function clearEnrichmentCache() {
  await db.delete(enrichmentCache).run();
  await db.delete(signalEnrichments).run();
}

export async function getEnrichmentCacheStats() {
  const cacheCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrichmentCache)
    .get();

  const enrichmentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(signalEnrichments)
    .get();

  return {
    cacheEntries: cacheCount?.count ?? 0,
    signalEnrichments: enrichmentCount?.count ?? 0,
  };
}

// ============================================================
// Settings
// ============================================================

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.delete(settings).where(eq(settings.key, key)).run();
  await db.insert(settings).values({ key, value }).run();
}

// ============================================================
// Stats
// ============================================================

export async function getSignalStats() {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .get();

  const freshResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .where(
      sql`${signals.createdAt} > datetime('now', '-24 hours')`
    )
    .get();

  const starredResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .where(eq(signals.status, 'starred'))
    .get();

  const conversationsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .get();

  return {
    total: totalResult?.count ?? 0,
    fresh: freshResult?.count ?? 0,
    starred: starredResult?.count ?? 0,
    conversations: conversationsResult?.count ?? 0,
  };
}

// ============================================================
// Conductor Conversations
// ============================================================

export async function createConductorConversation(
  provider?: string,
  model?: string,
  title?: string
) {
  const inserted = await db
    .insert(conductorConversations)
    .values({
      title: title || null,
      aiProvider: provider || null,
      aiModel: model || null,
    })
    .returning()
    .get();
  return inserted;
}

export async function getConductorConversation(id: string) {
  return await db
    .select()
    .from(conductorConversations)
    .where(eq(conductorConversations.id, id))
    .get() ?? null;
}

export async function listConductorConversations(limit = 20) {
  const convs = await db
    .select()
    .from(conductorConversations)
    .orderBy(desc(conductorConversations.updatedAt))
    .limit(limit)
    .all();

  // Get message counts for each conversation
  const result = [];
  for (const conv of convs) {
    const countRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(conductorMessages)
      .where(eq(conductorMessages.conversationId, conv.id!))
      .get();

    // Get first user message as preview
    const firstMsg = await db
      .select()
      .from(conductorMessages)
      .where(
        and(
          eq(conductorMessages.conversationId, conv.id!),
          eq(conductorMessages.role, 'user')
        )
      )
      .orderBy(asc(conductorMessages.createdAt))
      .limit(1)
      .get();

    result.push({
      ...conv,
      messageCount: countRow?.count ?? 0,
      preview: firstMsg?.content?.substring(0, 80) || null,
    });
  }
  return result;
}

export async function getConductorMessages(conversationId: string) {
  return db
    .select()
    .from(conductorMessages)
    .where(eq(conductorMessages.conversationId, conversationId))
    .orderBy(asc(conductorMessages.createdAt))
    .all();
}

export async function addConductorMessage(
  conversationId: string,
  role: string,
  content: string,
  metadata?: string | null
) {
  const inserted = await db
    .insert(conductorMessages)
    .values({
      conversationId,
      role,
      content,
      metadata: metadata || null,
    })
    .returning()
    .get();

  // Update conversation's updatedAt
  await db.update(conductorConversations)
    .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(conductorConversations.id, conversationId))
    .run();

  return inserted;
}

export async function updateConductorConversationTitle(
  id: string,
  title: string
) {
  await db.update(conductorConversations)
    .set({ title, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(conductorConversations.id, id))
    .run();
}

export async function deleteConductorConversation(id: string) {
  await db.delete(conductorConversations)
    .where(eq(conductorConversations.id, id))
    .run();
}

// ============================================================
// Conductor Memory
// ============================================================

export async function addConductorMemory(
  fact: string,
  category: string = 'general',
  source?: string
) {
  return db
    .insert(conductorMemory)
    .values({
      fact,
      category,
      source: source || null,
    })
    .returning()
    .get();
}

export async function getAllConductorMemories() {
  return db
    .select()
    .from(conductorMemory)
    .orderBy(desc(conductorMemory.updatedAt))
    .all();
}

export async function deleteConductorMemory(id: string) {
  await db.delete(conductorMemory)
    .where(eq(conductorMemory.id, id))
    .run();
}

export async function clearConductorMemories() {
  await db.delete(conductorMemory).run();
}

export async function searchConductorMemories(query: string) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(conductorMemory)
    .where(like(conductorMemory.fact, pattern))
    .orderBy(desc(conductorMemory.updatedAt))
    .all();
}

// ============================================================
// Tags (user-created sub-tags)
// ============================================================

export async function getAllTags() {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      count: sql<number>`count(${signalTags.signalId})`,
    })
    .from(tags)
    .leftJoin(signalTags, eq(tags.id, signalTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${signalTags.signalId})`))
    .all();
  return rows;
}

/**
 * Returns tags used by signals within a specific category, with counts.
 */
export async function getTagsForCategory(category: string) {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      count: sql<number>`count(DISTINCT ${signalTags.signalId})`,
    })
    .from(tags)
    .innerJoin(signalTags, eq(tags.id, signalTags.tagId))
    .innerJoin(signals, eq(signalTags.signalId, signals.id))
    .where(eq(signals.category, category))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(DISTINCT ${signalTags.signalId})`))
    .all();
  return rows;
}

export async function addTagToSignal(signalId: string, tagName: string) {
  return db.transaction(async (tx: Transaction) => {
    // Upsert tag
    await tx.run(sql`INSERT OR IGNORE INTO tags (name) VALUES (${tagName})`);
    const tag = await tx.select().from(tags).where(eq(tags.name, tagName)).get();
    if (!tag) throw new Error('Failed to create tag');

    // Link (ignore if already exists)
    await tx.run(
      sql`INSERT OR IGNORE INTO signal_tags (signal_id, tag_id) VALUES (${signalId}, ${tag.id})`
    );

    return { id: tag.id, name: tag.name, createdAt: tag.createdAt! };
  });
}

export async function removeTagFromSignal(signalId: string, tagId: number) {
  await db.delete(signalTags)
    .where(and(eq(signalTags.signalId, signalId), eq(signalTags.tagId, tagId)))
    .run();
}

export async function deleteTag(tagId: number) {
  await db.delete(tags).where(eq(tags.id, tagId)).run();
}
