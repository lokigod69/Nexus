# NEXUS — Amendment: Semantic Embedding Layer

> This document amends `02_ARCHITECTURE.md`, `03_UI_DESIGN.md`, and `04_IMPLEMENTATION.md`. It upgrades the 3D positioning, search, and clustering systems from tag-based heuristics to semantic vector embeddings powered by Google's Gemini Embedding API.

> **READ THE ORIGINAL FOUR DOCUMENTS FIRST.** This document describes what changes. Everything not mentioned here remains as originally specified.

---

## 1. What This Changes (And What It Doesn't)

### UPGRADED by embeddings:
- **3D node positioning**: Was d3-force with category gravity → Now UMAP reduction of real semantic vectors. Nodes position by *meaning*, not just labels.
- **Search**: Was keyword matching across title/summary/tags → Now cosine similarity "vibe search". Typing "that weird neon lighting trick" finds the right signal even if those words never appear in it.
- **Cluster formation**: Was artificial category magnets → Now emergent. Signals about similar topics naturally drift together without being told to.
- **Edge connections**: Was shared-tags check → Now vector proximity threshold. Two signals about "cinematic camera movement" connect even if tagged completely differently.
- **Related signal suggestions**: Free — just find the nearest vectors to the current signal.

### NOT changed by embeddings:
- App framework (Next.js, TypeScript, Tailwind)
- Database (SQLite via better-sqlite3, Drizzle ORM)
- Scraping pipeline (Jina Reader API)
- AI chat conversations (Claude / OpenAI)
- Triage interface
- Grid view, timeline view
- Obsidian export
- UI layout, color system, typography
- All API routes (signals CRUD, chat, export)

### NEW capabilities unlocked:
- "Vibe search" — semantic search that finds signals by meaning, not keywords
- Automatic signal similarity detection (find related signals without manual tagging)
- True semantic clustering in 3D space (prompts about similar topics cluster even across categories)
- Future: multimodal search (search by image, audio, or video — Gemini Embedding 2 supports this natively)

---

## 2. Embedding Provider Strategy

### V1: Text Embeddings (Free / Near-Free)

Use **`gemini-embedding-001`** for text-only embeddings.
- Free tier available (rate-limited: ~1,500 requests/day)
- $0.15 per million tokens on paid tier
- 3072-dimension output (we truncate to 768 for storage efficiency — quality loss is minimal per Google's own benchmarks: 68.17 MTEB at 3072 vs 67.99 at 768)
- Supports task types: CLUSTERING, SEMANTIC_SIMILARITY, RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY
- SDK: `@google/genai`

For a personal local app processing a few dozen signals per day, the free tier is more than sufficient.

### V2: Multimodal Embeddings (Future)

Upgrade to **`gemini-embedding-2-preview`** when ready for:
- Image embeddings (screenshots of posts, art references)
- Audio embeddings (music clips, podcast segments)
- Video embeddings (tutorial clips, generated content)
- PDF embeddings (research papers, documentation)
- All mapped to the **same vector space** as text — a screenshot of code and a text description of the same algorithm will cluster together

Price: $0.20 per million tokens (text), higher for audio/video. Not needed for V1.

### Why Gemini specifically (not OpenAI embeddings)?

OpenAI's `text-embedding-3-small` is cheaper ($0.02/MTok) but text-only with no multimodal upgrade path. Gemini gives us a migration path from text-only (V1) to full multimodal (V2) within the same vector space — no re-embedding your entire corpus when you upgrade.

However, the system should be provider-agnostic. The embedding layer should have an interface that allows swapping providers (see Section 4).

---

## 3. Schema Amendment

### signals table — ADD columns:

```sql
-- Add to the signals table defined in 02_ARCHITECTURE.md:
ALTER TABLE signals ADD COLUMN embedding BLOB;           -- 768-dim float32 vector stored as binary (768 * 4 = 3,072 bytes per signal)
ALTER TABLE signals ADD COLUMN embedding_model TEXT;      -- 'gemini-embedding-001' or 'gemini-embedding-2-preview' or 'text-embedding-3-small'
ALTER TABLE signals ADD COLUMN embedding_dim INTEGER;     -- 768, 1536, or 3072
ALTER TABLE signals ADD COLUMN pos_x REAL;                -- UMAP-reduced 3D position (recomputed periodically)
ALTER TABLE signals ADD COLUMN pos_y REAL;
ALTER TABLE signals ADD COLUMN pos_z REAL;
```

**Storage math:** 768 floats × 4 bytes = 3,072 bytes per signal. For 1,000 signals, that's ~3MB of vector data. Trivial for SQLite.

**Why binary BLOB, not JSON array?** A JSON array of 768 floats would be ~6KB of text per signal. Binary is 2x more compact and faster to load for similarity computations.

### Utility functions for BLOB storage:

```typescript
// Encode float array to Buffer for SQLite BLOB storage
function vectorToBlob(vector: number[]): Buffer {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
  return buffer;
}

// Decode Buffer back to float array
function blobToVector(blob: Buffer): number[] {
  const vector: number[] = [];
  for (let i = 0; i < blob.length; i += 4) {
    vector.push(blob.readFloatLE(i));
  }
  return vector;
}
```

---

## 4. New Files & Modules

### `src/lib/embedding/provider.ts` — Embedding Provider Interface

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getModelName(): string;
  getDimension(): number;
}
```

### `src/lib/embedding/gemini.ts` — Gemini Implementation

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private model: string;
  private dimension: number;

  constructor(model = "gemini-embedding-001", dimension = 768) {
    this.model = model;
    this.dimension = dimension;
  }

  async embed(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: this.model,
      contents: text,
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: this.dimension,
    });
    const vector = response.embeddings[0].values;
    return this.normalize(vector);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await ai.models.embedContent({
      model: this.model,
      contents: texts,
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: this.dimension,
    });
    return response.embeddings.map(e => this.normalize(e.values));
  }

  async embedQuery(text: string): Promise<number[]> {
    // Use RETRIEVAL_QUERY for search queries (optimized differently than documents)
    const response = await ai.models.embedContent({
      model: this.model,
      contents: text,
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: this.dimension,
    });
    return this.normalize(response.embeddings[0].values);
  }

  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map(v => v / norm);
  }

  getModelName() { return this.model; }
  getDimension() { return this.dimension; }
}
```

### `src/lib/embedding/openai.ts` — OpenAI Fallback (Optional)

```typescript
import OpenAI from "openai";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model = "text-embedding-3-small";
  private dimension = 768;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimension,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimension,
    });
    return response.data.map(d => d.embedding);
  }

  getModelName() { return this.model; }
  getDimension() { return this.dimension; }
}
```

### `src/lib/embedding/search.ts` — Semantic Search

```typescript
// Cosine similarity between two normalized vectors (dot product when normalized)
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// Find the K nearest signals to a query vector
async function semanticSearch(
  queryVector: number[],
  allSignals: { id: string; embedding: Buffer }[],
  topK: number = 10
): Promise<{ id: string; score: number }[]> {
  const scored = allSignals
    .filter(s => s.embedding)  // Skip signals without embeddings
    .map(s => ({
      id: s.id,
      score: cosineSimilarity(queryVector, blobToVector(s.embedding)),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

// Find signals similar to a given signal
async function findRelatedSignals(
  signalId: string,
  allSignals: { id: string; embedding: Buffer }[],
  topK: number = 5,
  minScore: number = 0.65
): Promise<{ id: string; score: number }[]> {
  const target = allSignals.find(s => s.id === signalId);
  if (!target?.embedding) return [];

  const targetVector = blobToVector(target.embedding);
  return allSignals
    .filter(s => s.id !== signalId && s.embedding)
    .map(s => ({
      id: s.id,
      score: cosineSimilarity(targetVector, blobToVector(s.embedding)),
    }))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

### `src/lib/embedding/umap.ts` — 3D Position Computation

```typescript
import { UMAP } from "umap-js";

// Reduce high-dimensional embeddings to 3D positions for the Three.js scene
function computePositions(
  signals: { id: string; embedding: Buffer; category: string }[]
): Map<string, { x: number; y: number; z: number }> {
  const vectors = signals
    .filter(s => s.embedding)
    .map(s => blobToVector(s.embedding));

  if (vectors.length < 5) {
    // Too few signals for UMAP — use random positions with category offsets
    return fallbackPositions(signals);
  }

  const umap = new UMAP({
    nComponents: 3,          // Output 3 dimensions for Three.js
    nNeighbors: Math.min(15, Math.floor(vectors.length / 2)),
    minDist: 0.1,
    spread: 1.5,
  });

  const positions3D = umap.fit(vectors);

  // Scale to a reasonable 3D space range (e.g., -50 to +50 units)
  const scale = 50;
  const result = new Map<string, { x: number; y: number; z: number }>();

  const signalsWithEmbeddings = signals.filter(s => s.embedding);
  positions3D.forEach((pos, i) => {
    result.set(signalsWithEmbeddings[i].id, {
      x: pos[0] * scale,
      y: pos[1] * scale,
      z: pos[2] * scale,
    });
  });

  return result;
}

// Fallback for small datasets
function fallbackPositions(signals) {
  // Position by category in a sphere arrangement (original d3-force approach)
  // ... category center calculation ...
}
```

**IMPORTANT**: UMAP is re-run whenever:
1. A new signal is captured (debounced — wait 5 seconds after last capture to batch)
2. A signal is deleted
3. The user explicitly triggers "Recompute Layout" from settings
4. On app startup

The resulting `pos_x/y/z` values are stored in the database so the 3D scene loads instantly without recomputation.

---

## 5. Amended API Routes

### POST `/api/signals` — AMENDED capture flow

Original flow:
```
URL → Scrape → AI Analyze → Save
```

New flow:
```
URL → Scrape → AI Analyze → Generate Embedding → Save → Recompute 3D Positions (debounced)
```

The embedding is generated from the scraped content (or from the AI summary if the scraped content is too long). The text sent to the embedding API should be a condensed representation:

```typescript
// Compose the text to embed — a meaningful summary of the signal's content
function composeEmbeddingText(signal: Signal): string {
  const parts = [
    signal.title,
    signal.summary,
    signal.keyTakeaway,
    signal.extractedContent?.substring(0, 500),  // Truncate long code blocks
    signal.tags?.join(", "),
    signal.note,
  ].filter(Boolean);
  return parts.join(". ");
}
```

### GET `/api/signals/search` — NEW semantic search route

```typescript
// Request:
// GET /api/signals/search?q=weird neon lighting trick&limit=10

// Flow:
// 1. Embed the query text using embedQuery() (RETRIEVAL_QUERY task type)
// 2. Load all signal embeddings from DB
// 3. Compute cosine similarity against each
// 4. Return top K signals sorted by similarity score

// Response:
{
  results: [
    { signal: Signal, score: 0.87 },
    { signal: Signal, score: 0.82 },
    // ...
  ]
}
```

This runs alongside the existing keyword search. The UI can offer both:
- Quick filter (keyword, instant, no API call)
- Deep search (semantic, ~500ms, requires embedding API call for the query)

### GET `/api/signals/[id]/related` — NEW related signals route

```typescript
// Returns the 5 most semantically similar signals to the given signal
// No API call needed — pure vector math on stored embeddings

// Response:
{
  related: [
    { signal: Signal, score: 0.79 },
    { signal: Signal, score: 0.74 },
    // ...
  ]
}
```

### POST `/api/embedding/recompute` — NEW layout recomputation

```typescript
// Recomputes all 3D positions using UMAP
// Called automatically on signal changes (debounced) and manually from settings

// Flow:
// 1. Load all signals with embeddings
// 2. Run UMAP to get 3D positions
// 3. Update pos_x/y/z in database for all signals
// 4. Return new positions

// Response: { positions: { [signalId]: { x, y, z } } }
```

---

## 6. Amended 3D Universe Behavior

### REPLACES: d3-force category clustering
### WITH: UMAP semantic positioning

The Three.js scene now reads `pos_x`, `pos_y`, `pos_z` directly from the database. No client-side physics simulation needed for positioning.

**What this means visually:**
- Prompts about "cinematic camera angles" cluster together regardless of whether they're tagged #midjourney or #video
- A post about AI consciousness and a post about transformer attention mechanisms will be near each other if they discuss similar concepts
- A GitHub repo for a music visualization tool will float between the "coding" and "music" clusters, exactly where it semantically belongs
- Categories still exist as labels and filter options, but positioning is organic

### Retained from original spec:
- Node appearance (size by status, color by category, glow by freshness) — unchanged
- Camera controls (orbit, fly-to, auto-rotate) — unchanged
- Hover/click interactions — unchanged
- Filter behavior (non-matching nodes fade) — unchanged

### Changed:
- **Node positions**: Read from DB fields `pos_x/y/z` instead of d3-force simulation
- **Edges**: Connect nodes with cosine similarity > 0.70 (instead of shared tags check). Edge opacity scales with similarity score.
- **Cluster labels**: Position at the centroid of nodes in each category (computed from the actual positions, not predetermined)
- **"Related" panel**: When viewing a signal, show its 5 nearest neighbors from the `findRelatedSignals` function

### Subtle animations:
- When a new signal is added, its node fades in at its UMAP-computed position
- When positions are recomputed (new signal changes the layout), existing nodes smoothly lerp to their new positions over 2 seconds — the universe gently reorganizes itself

---

## 7. Amended Environment Variables

```bash
# ADD to .env.local (in addition to existing vars from 02_ARCHITECTURE.md):

# Gemini Embedding (required for semantic features)
GEMINI_API_KEY=AI...                           # Google AI Studio API key (free tier available)
EMBEDDING_MODEL=gemini-embedding-001           # or 'gemini-embedding-2-preview' for multimodal
EMBEDDING_DIMENSION=768                        # 768 recommended (good quality, compact storage)
```

Note: The `GEMINI_API_KEY` is separate from the `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` used for chat. You can get a free API key from https://aistudio.google.com/apikey.

---

## 8. Additional Dependencies

```bash
# ADD to npm install:
npm install @google/genai umap-js
```

- `@google/genai` — Google's Generative AI SDK (includes embedding API)
- `umap-js` — Pure JavaScript UMAP implementation (runs server-side in Node.js, no Python needed)

---

## 9. Amended Implementation Phases

### Phase 1.6 (NEW — insert after Phase 1.5 Scraper, before Phase 2):

**Embedding Provider Setup**

1. Create `src/lib/embedding/provider.ts` — interface
2. Create `src/lib/embedding/gemini.ts` — Gemini implementation
3. Create `src/lib/embedding/openai.ts` — OpenAI fallback
4. Create `src/lib/embedding/search.ts` — cosine similarity + semantic search
5. Create `src/lib/embedding/umap.ts` — UMAP 3D position computation
6. Create vector BLOB utility functions (vectorToBlob, blobToVector)

**Test:** Call `embed("Hello world")` and verify you get a 768-float array back.

### Phase 2 — AMEND: Signal capture flow

After AI analysis (step 3 in original flow), add:
- Step 3.5: Generate embedding from `composeEmbeddingText(signal)`
- Step 3.6: Store embedding BLOB in database
- Step 4 (after save): Debounced call to recompute UMAP positions

### Phase 4 — AMEND: 3D Universe

Replace the d3-force-3d physics simulation with:
1. On load: Read `pos_x/y/z` from database, position nodes directly
2. On new signal: Recompute UMAP → animate nodes to new positions (lerp over 2s)
3. Edges: Compute from embedding similarity (>0.70 threshold) instead of shared tags

The scene becomes simpler — no ongoing physics simulation, just positioned nodes.

### Phase 7.5 (NEW — insert after Phase 7 Polish):

**Semantic Search & Related Signals**

1. Add `/api/signals/search` semantic search route
2. Add `/api/signals/[id]/related` related signals route
3. Add semantic search toggle in the header search bar ("Search by meaning" checkbox)
4. Add "Related Signals" section to the detail panel (shows 5 nearest neighbors with similarity scores)

---

## 10. Cost Estimate

For a personal knowledge tool processing 5-20 signals per day:

| Operation | Tokens per call | Calls per day | Daily cost |
|-----------|----------------|---------------|------------|
| Embed new signal | ~200 tokens | 5-20 | Free tier |
| Embed search query | ~20 tokens | 10-30 | Free tier |
| UMAP recomputation | 0 (local math) | 5-20 | $0.00 |

**Total: $0.00/day on the free tier** for a typical personal use pattern (under 1,500 API requests/day). You'd need to process hundreds of signals per day to hit the free tier limit.

---

## 11. Future: Multimodal Embeddings (V2 Art Layer)

When upgrading to `gemini-embedding-2-preview`, you unlock the ability to embed images, audio, video, and PDFs into the same vector space as text. This enables:

### For Nexus directly:
- Screenshot search: paste a screenshot of a UI → find signals about similar interfaces
- Audio notes: record a voice memo → embed it → find semantically related signals
- PDF ingestion: drop a research paper → it clusters near related text signals

### For separate creative projects (not Nexus scope, but uses the same embedding infrastructure):

**Synesthesia Machine** (Idea A from your discussion):
- Input text/poem → embed it (3072 floats)
- Map those floats to generative parameters (shape, color, sound frequency)
- Output: 3D sculpture or soundscape driven by the semantic meaning
- Change one word → the sculpture morphs

**Vibe Translator** (Idea B):
- Embed a guitar recording → get its vector
- Find the nearest text prompt in your Nexus vault
- Send that prompt to an image generator
- Result: images generated from music, matched on "vibe"

These would be separate projects that *read from* the Nexus database but have their own UIs. The shared infrastructure is the embedding vectors stored in Nexus's SQLite.

---

## 12. Summary of Patches to Existing Docs

| Original Document | Section | Change |
|-------------------|---------|--------|
| `02_ARCHITECTURE.md` | Section 2 (Project Structure) | Add `src/lib/embedding/` directory with 5 files |
| `02_ARCHITECTURE.md` | Section 3 (Database Schema) | Add 6 columns to signals table (embedding, model, dim, pos_x/y/z) |
| `02_ARCHITECTURE.md` | Section 4 (API Routes) | Add 3 new routes (search, related, recompute) |
| `02_ARCHITECTURE.md` | Section 8 (Environment) | Add GEMINI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSION |
| `03_UI_DESIGN.md` | Section 5.1 (Universe View) | Replace d3-force with UMAP positions; edges by vector similarity |
| `03_UI_DESIGN.md` | Section 6.2 (Sidebar) | Add "Vibe Search" toggle |
| `03_UI_DESIGN.md` | Section 6.3 (Detail Panel) | Add "Related Signals" section |
| `04_IMPLEMENTATION.md` | Phase 1 | Add Phase 1.6 (Embedding Provider) |
| `04_IMPLEMENTATION.md` | Phase 2 | Amend capture flow (add embedding step) |
| `04_IMPLEMENTATION.md` | Phase 4 | Replace d3-force with UMAP positions |
| `04_IMPLEMENTATION.md` | Phase 7 | Add Phase 7.5 (Semantic Search) |
| `04_IMPLEMENTATION.md` | Dependencies | Add `@google/genai`, `umap-js` |

---

*This amendment transforms Nexus from a manually categorized bookmarking tool into a true semantic knowledge graph. The fundamental promise — "things that are alike find each other" — is now baked into the mathematical foundation of the app rather than relying on human-assigned labels.*
