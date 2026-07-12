# Nexus v2 — The Front Door to raw/
Master spec. Owner: the architect (main session). 2026-07-11.

**Priority order when anything disagrees: `scripts/acceptance.mjs` > `src/types/index.ts` > this prose.**

## One sentence
A tiny, beautiful capture app: dump a link or thought from any device → AI enriches it and
suggests which project brain it belongs to → you confirm with one tap → a local `npm run pull`
writes it into that project's `memory/raw/`, where the Second Brain protocol
(D:\CODING\SecondBrainOS\PROTOCOL.md) takes over. Nexus's job ends at raw/.

## What v2 deliberately is NOT (all deleted from v1)
No embeddings, UMAP, semantic search, 3D universe, triage deck, timeline, collections,
per-signal chat, conductor, enrichment plugins, Obsidian export (Obsidian reads memory/ directly),
no settings UI. The protocol forbids RAG machinery (PROTOCOL.md §10); routing is one LLM call.

## The loop
1. **Capture** (cloud, any device): one input. Paste URL or type a thought.
   POST /api/captures returns instantly; the client then fires POST /api/captures/[id]/enrich.
2. **Route** (cloud): inbox cards show the AI's suggested project + reason.
   One tap confirms (PATCH {project}) or archives. 'general' is always available.
3. **Pull** (local, Windows machine): `npm run pull` →
   a) parse `SecondBrainOS/PROJECTS.md` → PUT /api/projects (registry sync up)
   b) GET /api/pull → routed, undelivered captures
   c) write each as `<project-path>/memory/raw/nexus-YYYY-MM-DD-<slug>.md`
      ('general' or missing path → `SecondBrainOS/memory/raw/`)
   d) POST /api/pull/ack. The next brain-save harvests the files.

## Stack (facts, verified 2026-07-11)
- Next.js 16.1.6 App Router, React 19.2.3, TS strict, Tailwind v4, dev port **3001**
- DB: @libsql/client + drizzle. Dual-mode: TURSO_DATABASE_URL set → Turso cloud (prod),
  else `file:./data/nexus.db`. **NEW: `NEXUS_LOCAL_DB=1` env is a hard override forcing file
  mode even when TURSO_DATABASE_URL is set** (protects acceptance runs from prod; .env.local
  carries live Turso credentials). Tables bootstrapped by `ensureTables()` in src/lib/db/index.ts
  (CREATE TABLE IF NOT EXISTS; no runtime migrations). **v1 tables in Turso are left untouched** —
  v2 creates new tables `captures` and `projects` only. Never DROP anything.
- Auth: src/middleware.ts (KEEP AS-IS). NEXUS_PASSWORD unset → open (dev). Set → cookie
  `nexus-token` for browser, `x-nexus-token` header for the CLI. Already supports both.
- Scraper: src/lib/scraper (KEEP AS-IS): Firecrawl primary → Jina → HTML fallback; FixTweet for X.
- AI: src/lib/ai — keep the provider/registry/switching pattern, refactor surface to
  `AIProvider.complete(system, user)` per types. Chain: Ollama (if OLLAMA_ENABLED) →
  OpenRouter free → gpt-4o-mini. AMENDED 2026-07-11: the chain is walked at RUNTIME per
  enrich call (free models 429 routinely; a failed/unparseable response falls through to
  the next model before degrading to 'failed'). No Anthropic provider exists; don't add one.
- New deps already installed: `cuelume` (interaction sounds), `motion` (springs).

## Data model — src/types/index.ts is canonical
Two tables. `captures` mirrors the Capture interface (tags as JSON text; timestamps unix
seconds as integers; id = lower(hex(randomblob(8)))). `projects` mirrors BrainProject
(slug PK; full-replace on PUT sync).

## Enrichment (one AI call)
Build EnrichInput (scrape first if kind='url'; scrape failure is not fatal — enrich from the
URL/content alone). Prompt (src/lib/ai/prompts.ts) instructs strict JSON matching
EnrichmentResult, includes the project registry (slug + name + description) and rules:
suggest 'general' when no project clearly fits; tags lowercase-kebab, 2–5.
`extract` = scraped markdown trimmed to 8000 chars. Parse defensively (strip code fences).
**Enrich never 500s** — any failure → enrichStatus 'failed', capture stays usable and routable.

## Pull CLI — scripts/nexus-pull.mjs (Node ≥18, zero npm deps)
Flags: `--url`, `--token`, `--os-path`, `--dry-run`. Env fallbacks: NEXUS_URL, NEXUS_TOKEN,
SECONDBRAIN_PATH; defaults: url http://localhost:3001, os-path D:\CODING\SecondBrainOS.
Auth: sends `x-nexus-token: <token>` when a token is provided (middleware accepts it).
- Registry: parse the PROJECTS.md markdown table (columns: Project | Path | What it is | Brain
  since). slug = kebab-case(name) — lowercase, strip anything in parentheses, non-alnum → '-'.
- Raw file (frontmatter + body):
  ```
  ---
  source: nexus
  captured: YYYY-MM-DD
  url: <url or omitted>
  tags: [a, b]
  routed-to: <project name>
  ---
  # <title or first 60 chars of content>

  **Takeaway:** <takeaway>

  <summary>

  ## Original
  <content verbatim>

  ## Extract        (url captures with extract only)
  <extract>
  ```
- Filename: `nexus-YYYY-MM-DD-<kebab-slug-of-title>.md`, `-2`/`-3` suffix on collision.
- Target `memory/raw/` created if missing. Project path missing on disk → warn, write to
  SecondBrainOS/memory/raw/ instead, still ack. Ack only what was actually written.

## UI — two screens, dark, Apple-clean (see design contract below)
- `/` **Capture**: a single focused input (autofocus, paste-and-go, Cmd/Ctrl+Enter),
  optimistic card appears instantly, enrichment fills it in live (title/summary/suggestion
  animate in). Last ~5 captures below. Inbox count badge → link to /inbox.
- `/inbox` **Inbox**: cards (title, source, summary, takeaway, tag pills, AI suggestion chip
  with reason). Actions per card: confirm suggested project (primary), change project
  (picker over the registry + 'general'), archive. Routed items leave the list with a spring exit.
- PWA: public/manifest + share_target GET → `/?text=` prefills capture (phone share sheet).
- State: zustand store; react-hot-toast for errors only (success is shown in-card, not toasted).

## Design contract (binding for the frontend)
- **Palette**: near-black warm neutrals (keep the void family: bg #08080d, surface #0d0d14,
  elevated #12121e, subtly warm-tinted), ONE locked accent: amber `oklch(0.78 0.14 75)` family.
  No purple, no gradient text, no glassmorphism-by-default, no identical card grids,
  body contrast ≥4.5:1. Anti-slop rules apply.
- **Type**: Outfit (headings, negative tracking at display sizes), JetBrains Mono (data:
  tags, sources, counts), body near 0 tracking, line-height 1.5–1.6.
- **Motion**: `motion` springs only — damping 1.0 / response 0.3–0.4 default; slight bounce
  (0.8) ONLY on momentum interactions (card exit after swipe/commit). Feedback on
  pointer-down (`:active` scale 0.97). Everything interruptible. Full
  `prefers-reduced-motion` fallbacks (opacity cross-fades).
- **Sound (cuelume)**: `bind()` once client-side. `data-cuelume-press`/`release` on the
  capture button; `play('success')` when enrichment completes; `play('tick')` on route
  confirm. NOWHERE else — utility over noise. Must be inert during SSR and respect a
  one-tap mute toggle persisted in localStorage.
- Buttons: verb+object labels. Touch targets ≥44px. 4/8px spacing scale.

## Acceptance
- Backend + CLI: `scripts/acceptance.mjs` (see file header for how to run). ALL PASS required.
- Everything: `npm run build` clean (type-check is the gate).
- Frontend: architect review in the browser against the design contract (sign-off pass).

---

# v2.1 addendum — Library, Ask, multi-route, delete (2026-07-12)

Same priority order: acceptance.mjs > types > this prose. Design contract above still binding.

## Multi-target routing
`Capture.project` became `Capture.projects: string[]` (empty = unrouted). PATCH takes
`projects: [1+ slugs]`; empty array → 400. Pull items carry `targets[]`; the CLI writes one
raw file per target ('general'/missing-path targets → SecondBrainOS/memory/raw/) and acks a
capture only after ALL its targets are written.
**MIGRATION (prod-critical):** the prod Turso `captures` table exists with the old `project`
TEXT column. `ensureTables()` must detect a missing `projects` column via PRAGMA table_info,
ALTER TABLE ADD COLUMN, and backfill `projects` from non-null `project` values
(`['<old>']`). Old column stays in place, ignored. Never DROP.

## Delete
DELETE /api/captures/[id] (existed) is now surfaced in the UI everywhere a capture appears.
Deleting affects Nexus's records only — files already delivered into project memory/raw/
stay on disk (say so in the confirm affordance for delivered captures).

## Library (/library)
GET /api/captures gains `q` (case-insensitive substring over title/summary/takeaway/
tags/content — plain SQL LIKE, NO embeddings) and `status=all`. The Library view shows the
full capture history with instant search, status filter chips, routed-to labels, and delete.

## Ask (POST /api/ask)
One-shot Q&A over the capture history. Server-side: SQL retrieval (recent N + LIKE matches
on question keywords, ~30 candidates max), one AIProvider completion (same fallback chain as
enrich) that must answer ONLY from the provided captures and cite which ones. Response:
{ answer, references[] } where references ⊆ retrieved candidates. Empty question → 400.
AI failure → 502 { error } — never a fabricated 200. No conversation persistence, no
streaming (single-shot). Scope honesty: Ask knows captures only, not project memory files.

## Quick-route from the capture screen
Once enrichment lands on `/`, the suggestion chip becomes actionable: tap to confirm the
suggested project immediately; a compact picker (multi-select, same as inbox) is one step
away. No detour through /inbox for the common case.
