// ============================================================
// Nexus v2 — Shared Contract
// The canonical shape of everything: DB rows, API bodies, AI
// results, CLI payloads. When prose docs and these types
// disagree, these types win.
// ============================================================

// ------------------------------------------------------------
// Capture lifecycle: inbox → routed → delivered, or → archived.
//   inbox     = captured, awaiting a routing decision
//   routed    = target project confirmed; waiting for `nexus pull`
//   delivered = pull CLI wrote it into <project>/memory/raw/ and acked
//   archived  = deliberately dropped (kept, never pulled)
// ------------------------------------------------------------

export type CaptureStatus = 'inbox' | 'routed' | 'delivered' | 'archived';
export type CaptureKind = 'url' | 'text';
export type EnrichStatus = 'pending' | 'done' | 'failed';

export interface Capture {
  id: string;
  kind: CaptureKind;
  /** Exactly what the user pasted/typed. Never rewritten. */
  content: string;
  url: string | null;
  title: string | null;
  summary: string | null;
  takeaway: string | null;
  tags: string[];
  /** AI-suggested project slug (from the synced registry) or 'general'. */
  suggestedProject: string | null;
  /** One short sentence: why the AI thinks it belongs there. */
  suggestedReason: string | null;
  /** Human-confirmed target project slugs (1+ = routed; a capture can be
   *  delivered to several brains). Empty array = not routed. */
  projects: string[];
  status: CaptureStatus;
  enrichStatus: EnrichStatus;
  /** Trimmed scraped markdown (URL captures), max ~8000 chars. */
  extract: string | null;
  /** Display source, e.g. 'github.com', 'x.com'. */
  source: string | null;
  createdAt: number; // unix seconds
  routedAt: number | null;
  deliveredAt: number | null;
}

/** One row of the synced SecondBrainOS project registry. */
export interface BrainProject {
  /** kebab-case, derived from the project name, stable across syncs. */
  slug: string;
  name: string;
  /** Local path on the user's machine, e.g. 'D:\\CODING\\TRADERBOT'. */
  path: string;
  description: string;
  syncedAt: number;
}

/** Special routing target: pull writes to SecondBrainOS/memory/raw/. */
export const GENERAL_PROJECT_SLUG = 'general';

// ------------------------------------------------------------
// API contract. All routes JSON in/out, guarded by middleware
// (cookie for the browser, x-nexus-token header for the CLI).
// Errors: { error: string } with a 4xx/5xx status.
// ------------------------------------------------------------

/** POST /api/captures — instant create; enrichment is a separate call. */
export interface CreateCaptureRequest {
  content: string; // raw paste; server detects url vs text
}
export interface CreateCaptureResponse {
  capture: Capture; // enrichStatus 'pending'
}

/** POST /api/captures/[id]/enrich — scrape (if url) + one AI call. Idempotent:
 *  re-running on a 'done' capture re-enriches; concurrent calls are safe. */
export interface EnrichResponse {
  capture: Capture; // enrichStatus 'done' | 'failed'
}

/** GET /api/captures?status=<CaptureStatus|all>&q=<text>&limit=50
 *  (default status=inbox). `q` is a case-insensitive substring search over
 *  title, summary, takeaway, tags, and content. `status=all` spans every
 *  status — the Library view. */
export interface ListCapturesResponse {
  captures: Capture[];
}

/** PATCH /api/captures/[id] — route, archive, restore, or edit. */
export interface UpdateCaptureRequest {
  /** 1+ slugs (registry or 'general') → sets status 'routed' + routedAt.
   *  A capture can target several project brains at once. */
  projects?: string[];
  /** 'archived' to drop, 'inbox' to restore. */
  status?: Extract<CaptureStatus, 'inbox' | 'archived'>;
  title?: string;
  tags?: string[];
}
export interface UpdateCaptureResponse {
  capture: Capture;
}

/** DELETE /api/captures/[id] → { ok: true } */

/** GET /api/projects — registry for the routing picker. */
export interface ListProjectsResponse {
  projects: BrainProject[];
}

/** PUT /api/projects — full-replace registry sync from the pull CLI. */
export interface SyncProjectsRequest {
  projects: Array<Omit<BrainProject, 'syncedAt'>>;
}
export interface SyncProjectsResponse {
  count: number;
}

/** GET /api/pull — everything routed and not yet delivered. One item per
 *  capture; `targets` has one entry per routed project slug. */
export interface PullTarget {
  slug: string;
  /** Registry name; null for 'general' or unknown slugs. */
  name: string | null;
  /** Resolved local path; null for 'general' or unknown slugs (the CLI
   *  writes those to SecondBrainOS/memory/raw/). */
  path: string | null;
}
export interface PullItem {
  capture: Capture;
  targets: PullTarget[];
}
export interface PullResponse {
  items: PullItem[];
}

/** POST /api/pull/ack — mark captures delivered. The CLI acks a capture id
 *  only after writing files for ALL of its targets. */
export interface AckRequest {
  ids: string[];
}
export interface AckResponse {
  acked: number;
}

/** POST /api/ask — one-shot question over the full capture history.
 *  Retrieval is plain SQL (recency + substring match), no embeddings.
 *  AI failure returns { error } with a 502 — never a fabricated answer. */
export interface AskRequest {
  question: string;
}
export interface AskReference {
  id: string;
  title: string | null;
  status: CaptureStatus;
  projects: string[];
  url: string | null;
}
export interface AskResponse {
  answer: string;
  /** Captures the answer is grounded in, for display beneath it. */
  references: AskReference[];
}

// ------------------------------------------------------------
// AI layer (src/lib/ai). One job: enrich a capture.
// ------------------------------------------------------------

export type AIProviderType = 'openai' | 'openrouter' | 'ollama';

export interface ModelDefinition {
  id: string; // unique key, e.g. 'gemma-4-26b'
  name: string; // display name
  provider: AIProviderType;
  modelId: string; // provider-native model ID
  costInput: number; // $ per M input tokens (0 = free)
  costOutput: number;
  contextWindow: number;
  free: boolean;
}

/** Thin completion interface each provider implements. */
export interface AIProvider {
  name: AIProviderType;
  setActiveModel(modelId: string): void;
  /** One-shot completion; returns raw model text (expected to be JSON). */
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface EnrichInput {
  kind: CaptureKind;
  content: string; // original paste
  url: string | null;
  scraped: ScrapedContent | null; // null for text captures or scrape failure
  /** Current registry, so the model can suggest a routing target. */
  projects: Array<Pick<BrainProject, 'slug' | 'name' | 'description'>>;
}

export interface EnrichmentResult {
  title: string;
  summary: string; // 2-3 plain-language sentences
  takeaway: string; // one sentence: why this was worth capturing
  tags: string[]; // 2-5, lowercase-kebab
  suggestedProject: string; // slug from registry, or 'general'
  suggestedReason: string; // one short sentence
}

// ------------------------------------------------------------
// Scraper (src/lib/scraper — existing lib, unchanged shape)
// ------------------------------------------------------------

export interface ScrapedContent {
  title: string;
  content: string;
  description?: string;
  url: string;
  siteName?: string;
  ogImage?: string;
  author?: string;
  publishedDate?: string;
  favicon?: string;
}
