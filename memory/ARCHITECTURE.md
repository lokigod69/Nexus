# Architecture
Last updated: 2026-07-12

## Overview
Next.js 16 App Router (TS strict, Tailwind v4) on Vercel (prod: https://www.mynexus.lol),
Turso (libsql) in prod, local file SQLite in dev. Three screens (`/`, `/inbox`, `/library`),
seven API routes, one CLI. Canonical shapes: `src/types/index.ts`. Behavioral contract:
`scripts/acceptance.mjs` (70 checks). Intent + design contract: `docs/SPEC.md` (+v2.1 addendum).

## Capture lifecycle
`inbox` → (PATCH projects: [1+ slugs]) → `routed` → (pull CLI ack after ALL targets written)
→ `delivered`; `archived` at any point; DELETE removes the Nexus record only.
Enrichment is orthogonal: `pending` → `done`/`failed` (never blocks routing).
Migration note: `captures.projects` (JSON array) superseded `project`; the legacy column is
retained in prod, backfilled additively via PRAGMA-guarded ALTER in ensureTables().

## Key components

| Piece | Path | Notes |
|---|---|---|
| DB client | src/lib/db/index.ts | Turso if TURSO_DATABASE_URL; `NEXUS_LOCAL_DB=1` hard-forces file mode; ensureTables bootstraps `captures`+`projects` only |
| Schema/queries | src/lib/db/{schema,queries}.ts | tags as JSON text; unix-second ints; id = hex randomblob(8) |
| AI enrich | src/lib/ai/{provider,enrich,prompts}.ts + per-provider files | `AIProvider.complete(system,user)`; runtime fallback chain; strict-JSON prompt with registry inlined; defensive parse; invalid slugs coerced to 'general' |
| Scraper | src/lib/scraper/ | Firecrawl → Jina → HTML fallback; FixTweet for X. Kept from v1 |
| Auth | src/middleware.ts | NEXUS_PASSWORD gate: cookie (browser login page) or x-nexus-token header (CLI). Unset = open. Kept from v1. ⚠️ Next 16 deprecation: "middleware" convention → "proxy" (warning only) |
| API | src/app/api/{captures,captures/[id],captures/[id]/enrich,projects,pull,pull/ack,ask} | POST /captures returns instantly; client fires enrich separately; GET /captures supports q= + status=all; /ask = SQL retrieval + one completion |
| Pull CLI | scripts/nexus-pull.mjs | zero deps; PROJECTS.md table → PUT /api/projects; one frontmatter raw file PER TARGET; acks a capture only after all targets written; missing path → SecondBrainOS/memory/raw/ |
| UI screens | src/app/page.tsx (+ capture/), src/app/inbox/, src/app/library/ (LibraryScreen/LibraryRow/AskPanel) | zustand stores (captureStore + libraryStore); optimistic create + tracked enrich; quick-route chip; multi-select ProjectPicker; shared DeleteButton (inline morph confirm) |
| Design system | src/app/globals.css | @theme tokens: bg #08080d/#0d0d14/#12121e, accent oklch(0.78 0.14 75); Outfit + JetBrains Mono via next/font |
| Sounds | src/components/sound/ | cuelume bind() SSR-safe; mute in localStorage (`nexus-muted`) |
| PWA | public/manifest.webmanifest | share_target GET → `/?text=` (+url,title) |

## Data flow
1. POST /api/captures {content} → url/text detection → row (inbox, pending) → instant return.
2. Client POST /api/captures/[id]/enrich → scrape if url (failure non-fatal) → one AI call with
   registry → title/summary/takeaway/tags/suggestedProject → done, or failed (200 either way).
3. PATCH {project} → routed. GET /api/pull joins projects for paths; POST /api/pull/ack → delivered.
4. CLI writes `nexus-YYYY-MM-DD-<slug>.md` into `<project>/memory/raw/`; 'general'/missing path
   → SecondBrainOS/memory/raw/.

## External dependencies
Turso (prod DB), Firecrawl + Jina (scraping), OpenRouter + OpenAI (enrichment; Ollama optional
local), Vercel (hosting, project **nexus-oz7q**), cuelume + motion (UI feel).

## Conventions
- Never DROP/ALTER v1 tables (user's legacy data lives in the same Turso DB).
- Enrich never 500s; captures must stay routable through any enrichment failure.
- raw/ files the CLI writes are write-once ground truth.
- Acceptance runs need `NEXUS_LOCAL_DB=1` — .env.local carries LIVE prod Turso credentials.
