# CLAUDE.md

## Project: Nexus v2 — The Front Door to raw/

Capture app for the Second Brain system (D:\CODING\SecondBrainOS). Dump a link or thought
from any device → AI enriches + suggests a project brain → confirm with one tap →
`npm run pull` writes it into `<project>/memory/raw/`. Nexus's job ends at raw/.

### Canonical documents (priority order when they disagree)
1. `scripts/acceptance.mjs` — the behavioral contract, runnable
2. `src/types/index.ts` — every shape: DB rows, API bodies, CLI payloads
3. `docs/SPEC.md` — intent, constraints, design contract
4. `docs/v1/` — the old v1 design docs, historical reference only

### Tech Stack (verified 2026-07-11)
- Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4
- DB: @libsql/client + drizzle-orm. Dual-mode: `TURSO_DATABASE_URL` → Turso cloud (prod on
  Vercel), else local file. `NEXUS_LOCAL_DB=1` hard-forces file mode (acceptance safety).
- AI: provider chain Ollama (`OLLAMA_ENABLED`) → OpenRouter free → gpt-4o-mini. One job:
  the enrich call (`AIProvider.complete`). No Anthropic provider. No embeddings, ever.
- Scraper: Firecrawl primary → Jina fallback → raw HTML; FixTweet for X/Twitter.
- UI: zustand, motion (springs), cuelume (interaction sounds), lucide-react, react-hot-toast.

### Commands
```bash
npm run dev        # Dev server at localhost:3001 (NOT 3000)
npm run build      # Type-check + build — the merge gate
npm run pull       # Pull routed captures into project memory/raw/ folders
node scripts/acceptance.mjs   # Behavioral contract (server must be up; see file header)
```

### Auth
`src/middleware.ts` — password gate via `NEXUS_PASSWORD` (unset locally = open).
Browser: `nexus-token` cookie via login page. CLI/API: `x-nexus-token` header.

### Hard rules
- v1 tables in Turso (`signals`, `tags`, …) are legacy data. Never DROP or ALTER them.
- Enrichment failures degrade (enrichStatus 'failed'), they never 500 — captures must
  always stay routable.
- `raw/` files the pull CLI writes are Second Brain ground truth: write-once, never rewrite.
- Design contract in `docs/SPEC.md` is binding: one amber accent, dark warm neutrals,
  springs only (damping 1.0 default), cuelume sounds at exactly three moments, full
  reduced-motion support.

## Project Memory (Second Brain Protocol)

This project keeps its living memory in `memory/`. Markdown is the source of truth; agents maintain it.

**On session start (before touching code):**
1. Read `memory/INDEX.md` (the map) and `memory/STATE.md` (current truth).
2. Open other memory files only when relevant: `DECISIONS.md` for why, `ARCHITECTURE.md` for how, `LOG.md` for what happened recently, `notes/` for deep topics, `raw/` only to hunt an original source.
3. Never sweep the whole `memory/` tree. For big cross-cutting questions, send a subagent and take back only its conclusions.

**After meaningful work (before ending the session) — this is part of the task, not optional:**
1. `memory/LOG.md` — prepend a dated entry: what changed, files touched, commits, bugs fixed, open questions.
2. `memory/STATE.md` — refresh current truth and Next actions; delete lines that stopped being true.
3. `memory/DECISIONS.md` — append any decision made, with the why. Mark superseded decisions, never erase them.
4. `memory/ARCHITECTURE.md` — only if structure changed.
5. If new files landed in `memory/raw/`, compile their durable insights into the right pages and link back to the source.

Trivial work (typos, tiny tweaks) needs no save.

**Writing rules:** update, don't duplicate. Date everything (YYYY-MM-DD). Mark wrong or doubtful content visibly (`⚠️ superseded`, `⚠️ stale?`, `⚠️ unverified`) instead of leaving it looking current. Never edit `memory/raw/`. Keep STATE.md under ~100 lines. Link notes with `[[wikilinks]]`.

### Environment Variables
```
TURSO_DATABASE_URL=libsql://...   # prod DB (Vercel project: nexus-oz7q)
TURSO_AUTH_TOKEN=...
NEXUS_PASSWORD=...                # gate; unset locally
OPENROUTER_KEY=...                # default enrich provider (free models)
OPENAI_API_KEY=...                # fallback
FIRECRAWL_API_KEY=...             # primary scraper
DATABASE_PATH=./data/nexus.db     # local file mode
NEXUS_LOCAL_DB=                   # set to 1 to force local file DB
OLLAMA_ENABLED=                   # set to true for local Ollama models
```
