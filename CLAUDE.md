# CLAUDE.md

## Project: Nexus — Personal Knowledge Reactor

### Documentation (Read in Order)
1. `README.md` — Overview and quick reference
2. `01_VISION.md` — What this is and why it exists
3. `02_ARCHITECTURE.md` — Tech stack, database schema, API specs, folder structure
4. `03_UI_DESIGN.md` — Visual design, layout, component specs, 3D universe details
5. `04_IMPLEMENTATION.md` — Step-by-step build order with test milestones
6. `05_EMBEDDING_AMENDMENT.md` — CRITICAL: Patches sections of docs 02, 03, 04 with semantic embedding layer

### Build Strategy
Focus on Phase 1 through Phase 3 first. Get the data pipeline working:
- Phase 1: Foundation (DB + AI providers + Scraper + Embedding provider)
- Phase 2: API Routes (Signal CRUD, Chat, Export, Semantic Search)
- Phase 3: Basic Frontend (Grid view, Detail panel, AI Chat, Capture flow)

STOP after Phase 3 and confirm with user before proceeding to Phase 4 (3D Universe).

### Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: better-sqlite3 + drizzle-orm (local SQLite, WAL mode)
- **3D** (Phase 4): @react-three/fiber + @react-three/drei + three.js
- **AI Chat**: @anthropic-ai/sdk (Claude) + openai (GPT) — both must work, switchable
- **Embeddings**: @google/genai (Gemini Embedding API) + umap-js
- **Scraping**: Jina Reader API (https://r.jina.ai/{url})
- **State**: zustand

### Coding Standards
- TypeScript strict mode — define shared types in `src/types/index.ts`
- All API routes need try/catch with user-friendly error responses
- Chat API MUST stream responses (ReadableStream / SSE)
- Use Zustand for global state, no prop drilling
- Dark theme only — CSS variables defined in `03_UI_DESIGN.md` Section 2
- Use transactions for multi-table DB writes (e.g., creating signal + tags)
- Normalize embedding vectors before storage (768-dim, float32 BLOB)

### Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
DATABASE_PATH=./data/nexus.db
OBSIDIAN_VAULT_PATH=            # Optional, for export
```

### Commands
```bash
npm run dev                     # Dev server at localhost:3000
npm run build                   # Type-check + build
npx drizzle-kit generate        # Generate DB migrations
```

### Key Architecture Decisions
- 3D node positions come from UMAP reduction of semantic embeddings, NOT d3-force physics
- Embedding text = title + summary + keyTakeaway + extractedContent (truncated) + tags + note
- Use RETRIEVAL_DOCUMENT task type for signal embeddings, RETRIEVAL_QUERY for search queries
- Store embeddings as binary BLOBs (768 floats × 4 bytes = 3,072 bytes per signal)
- Recompute UMAP positions on signal add/delete (debounced 5s)
- Cosine similarity threshold for edges in 3D: 0.70
- Cosine similarity for "related signals": top 5 with score >= 0.65
