import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, dbReady } from './index';
import { captures, projects } from './schema';
import type {
  BrainProject,
  Capture,
  CaptureKind,
  CaptureStatus,
  EnrichStatus,
  PullItem,
} from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';

type CaptureRow = typeof captures.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

const now = () => Math.floor(Date.now() / 1000);

// ============================================================
// Row mapping
// ============================================================

function parseTags(raw: string | null): string[] {
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
    tags: parseTags(row.tags),
    suggestedProject: row.suggestedProject ?? null,
    suggestedReason: row.suggestedReason ?? null,
    project: row.project ?? null,
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
// Captures
// ============================================================

export async function createCapture(data: {
  kind: CaptureKind;
  content: string;
  url: string | null;
  source: string | null;
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

export async function listCaptures(
  status: CaptureStatus = 'inbox',
  limit = 50
): Promise<Capture[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(captures)
    .where(eq(captures.status, status))
    .orderBy(desc(captures.createdAt))
    .limit(limit)
    .all();
  return rows.map(rowToCapture);
}

export interface CaptureUpdate {
  title?: string;
  summary?: string | null;
  takeaway?: string | null;
  tags?: string[];
  suggestedProject?: string | null;
  suggestedReason?: string | null;
  project?: string;
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
  const { tags, ...rest } = patch;
  const set: Record<string, unknown> = { ...rest };
  if (tags !== undefined) set.tags = JSON.stringify(tags);
  if (Object.keys(set).length === 0) return getCapture(id);

  const row = await db
    .update(captures)
    .set(set)
    .where(eq(captures.id, id))
    .returning()
    .get();
  return row ? rowToCapture(row) : null;
}

/** Route a capture to a project: sets project + status 'routed' + routedAt. */
export async function routeCapture(
  id: string,
  projectSlug: string
): Promise<Capture | null> {
  return updateCapture(id, {
    project: projectSlug,
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

/** Everything routed and not yet delivered, with resolved project paths.
 *  'general' (or an unknown slug) resolves to a null path/name. */
export async function getPullItems(): Promise<PullItem[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(captures)
    .leftJoin(projects, eq(captures.project, projects.slug))
    .where(eq(captures.status, 'routed'))
    .orderBy(asc(captures.routedAt))
    .all();

  return rows.map((row) => {
    const capture = rowToCapture(row.captures);
    const isGeneral = capture.project === GENERAL_PROJECT_SLUG;
    return {
      capture,
      projectPath: isGeneral ? null : row.projects?.path ?? null,
      projectName: isGeneral ? null : row.projects?.name ?? null,
    };
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
