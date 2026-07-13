import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db, dbReady } from './index';
import { captures, projects } from './schema';
import type {
  BrainProject,
  Capture,
  CaptureKind,
  CaptureStatus,
  EnrichStatus,
  PullItem,
  PullTarget,
} from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';

type CaptureRow = typeof captures.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

const now = () => Math.floor(Date.now() / 1000);

// ============================================================
// Row mapping
// ============================================================

/** Parse a JSON-encoded string[] column ('tags', 'projects'). */
function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string');
    }
  } catch {
    // fall through
  }
  return [];
}

function rowToCapture(row: CaptureRow): Capture {
  return {
    id: row.id!,
    kind: row.kind as CaptureKind,
    content: row.content,
    url: row.url ?? null,
    title: row.title ?? null,
    summary: row.summary ?? null,
    takeaway: row.takeaway ?? null,
    tags: parseStringArray(row.tags),
    suggestedProject: row.suggestedProject ?? null,
    suggestedReason: row.suggestedReason ?? null,
    projects: parseStringArray(row.projects),
    status: row.status as CaptureStatus,
    enrichStatus: row.enrichStatus as EnrichStatus,
    extract: row.extract ?? null,
    source: row.source ?? null,
    createdAt: row.createdAt,
    routedAt: row.routedAt ?? null,
    deliveredAt: row.deliveredAt ?? null,
  };
}

function rowToProject(row: ProjectRow): BrainProject {
  return {
    slug: row.slug,
    name: row.name,
    path: row.path,
    description: row.description ?? '',
    syncedAt: row.syncedAt,
  };
}

// ============================================================
// Search (plain SQL LIKE — no embeddings, ever)
// ============================================================

/** Escape LIKE wildcards; queries use ESCAPE '!'. */
function escapeLike(term: string): string {
  return term.replace(/[!%_]/g, (m) => `!${m}`);
}

/** Case-insensitive substring condition over the searchable columns:
 *  title, summary, takeaway, tags, content. */
function likeCondition(term: string): SQL {
  const pattern = `%${escapeLike(term.toLowerCase())}%`;
  const fields = [
    captures.title,
    captures.summary,
    captures.takeaway,
    captures.tags,
    captures.content,
  ];
  return or(
    ...fields.map(
      (f) => sql`lower(coalesce(${f}, '')) LIKE ${pattern} ESCAPE '!'`
    )
  )!;
}

// ============================================================
// Captures
// ============================================================

export async function createCapture(data: {
  kind: CaptureKind;
  content: string;
  url: string | null;
  source: string | null;
  /** 'skipped' for a raw ("no AI") save; defaults to 'pending'. */
  enrichStatus?: EnrichStatus;
}): Promise<Capture> {
  await dbReady;
  const row = await db
    .insert(captures)
    .values({
      kind: data.kind,
      content: data.content,
      url: data.url,
      source: data.source,
      tags: '[]',
      projects: '[]',
      enrichStatus: data.enrichStatus ?? 'pending',
      createdAt: now(),
    })
    .returning()
    .get();
  return rowToCapture(row);
}

export async function getCapture(id: string): Promise<Capture | null> {
  await dbReady;
  const row = await db.select().from(captures).where(eq(captures.id, id)).get();
  return row ? rowToCapture(row) : null;
}

/** List captures. status 'all' spans every status (the Library view);
 *  `q` is a case-insensitive substring search (SQL LIKE, no embeddings). */
export async function listCaptures(
  status: CaptureStatus | 'all' = 'inbox',
  limit = 50,
  q?: string
): Promise<Capture[]> {
  await dbReady;
  const conditions: SQL[] = [];
  if (status !== 'all') conditions.push(eq(captures.status, status));
  const term = q?.trim();
  if (term) conditions.push(likeCondition(term));

  let query = db.select().from(captures).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows = await query.orderBy(desc(captures.createdAt)).limit(limit).all();
  return rows.map(rowToCapture);
}

export interface CaptureUpdate {
  title?: string;
  summary?: string | null;
  takeaway?: string | null;
  tags?: string[];
  suggestedProject?: string | null;
  suggestedReason?: string | null;
  projects?: string[];
  status?: CaptureStatus;
  enrichStatus?: EnrichStatus;
  extract?: string | null;
  source?: string | null;
  routedAt?: number | null;
  deliveredAt?: number | null;
}

export async function updateCapture(
  id: string,
  patch: CaptureUpdate
): Promise<Capture | null> {
  await dbReady;
  const { tags, projects: projectSlugs, ...rest } = patch;
  const set: Record<string, unknown> = { ...rest };
  if (tags !== undefined) set.tags = JSON.stringify(tags);
  if (projectSlugs !== undefined) set.projects = JSON.stringify(projectSlugs);
  if (Object.keys(set).length === 0) return getCapture(id);

  const row = await db
    .update(captures)
    .set(set)
    .where(eq(captures.id, id))
    .returning()
    .get();
  return row ? rowToCapture(row) : null;
}

/** Route a capture to one or more project brains: sets projects +
 *  status 'routed' + routedAt. Caller guarantees 1+ slugs. */
export async function routeCapture(
  id: string,
  projectSlugs: string[]
): Promise<Capture | null> {
  return updateCapture(id, {
    projects: projectSlugs,
    status: 'routed',
    routedAt: now(),
  });
}

export async function deleteCapture(id: string): Promise<boolean> {
  await dbReady;
  const row = await db
    .delete(captures)
    .where(eq(captures.id, id))
    .returning()
    .get();
  return !!row;
}

// ============================================================
// Ask retrieval (plain SQL: recency + keyword LIKE, no embeddings)
// ============================================================

/** Candidate captures for /api/ask: union of the most recent `recentLimit`
 *  and any capture matching a question keyword (LIKE over the same columns
 *  as search), deduped by id, capped at `cap` total. */
export async function getAskCandidates(
  keywords: string[],
  recentLimit = 15,
  cap = 30
): Promise<Capture[]> {
  await dbReady;
  const recent = await db
    .select()
    .from(captures)
    .orderBy(desc(captures.createdAt))
    .limit(recentLimit)
    .all();

  let matches: CaptureRow[] = [];
  if (keywords.length > 0) {
    matches = await db
      .select()
      .from(captures)
      .where(or(...keywords.map((k) => likeCondition(k))))
      .orderBy(desc(captures.createdAt))
      .limit(cap)
      .all();
  }

  const seen = new Set<string>();
  const combined: Capture[] = [];
  for (const row of [...recent, ...matches]) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    combined.push(rowToCapture(row));
    if (combined.length >= cap) break;
  }
  return combined;
}

// ============================================================
// Projects (SecondBrainOS registry)
// ============================================================

/** Full-replace sync from the pull CLI. Returns the synced count. */
export async function syncProjects(
  list: Array<Omit<BrainProject, 'syncedAt'>>
): Promise<number> {
  await dbReady;
  const syncedAt = now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    await tx.delete(projects).run();
    for (const p of list) {
      await tx
        .insert(projects)
        .values({
          slug: p.slug,
          name: p.name,
          path: p.path,
          description: p.description ?? '',
          syncedAt,
        })
        .run();
    }
  });
  return list.length;
}

export async function listProjects(): Promise<BrainProject[]> {
  await dbReady;
  const rows = await db.select().from(projects).orderBy(asc(projects.name)).all();
  return rows.map(rowToProject);
}

// ============================================================
// Pull (routed → delivered handoff)
// ============================================================

/** Everything routed and not yet delivered. One item per capture; `targets`
 *  has one entry per routed slug, resolved against the registry. 'general'
 *  (or an unknown slug) resolves to null name/path — the CLI writes those
 *  to SecondBrainOS/memory/raw/. */
export async function getPullItems(): Promise<PullItem[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(captures)
    .where(eq(captures.status, 'routed'))
    .orderBy(asc(captures.routedAt))
    .all();

  const registry = await db.select().from(projects).all();
  const bySlug = new Map(registry.map((p) => [p.slug, p]));

  return rows.map((row) => {
    const capture = rowToCapture(row);
    const targets: PullTarget[] = capture.projects.map((slug) => {
      const project =
        slug === GENERAL_PROJECT_SLUG ? undefined : bySlug.get(slug);
      return {
        slug,
        name: project?.name ?? null,
        path: project?.path ?? null,
      };
    });
    return { capture, targets };
  });
}

/** Mark written captures delivered. Only 'routed' captures transition. */
export async function ackCaptures(ids: string[]): Promise<number> {
  await dbReady;
  if (ids.length === 0) return 0;
  const rows = await db
    .update(captures)
    .set({ status: 'delivered', deliveredAt: now() })
    .where(and(inArray(captures.id, ids), eq(captures.status, 'routed')))
    .returning()
    .all();
  return rows.length;
}
