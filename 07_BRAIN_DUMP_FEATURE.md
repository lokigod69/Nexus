# NEXUS — Brain Dump / Thought Capture Mode

> Amendment to existing specs. Adds free-form text capture alongside URL capture. Brain dumps live in the same `signals` table, get the same AI analysis + embedding + 3D positioning, and cluster semantically with everything else.

---

## 1. What This Is

A second capture mode. Instead of pasting a URL, you write text — thoughts, book quotes, morning reflections, principles, ideas, questions. The text goes through the same pipeline as URL-based signals (minus the scrape step):

```
Text Input → AI Analyze → Generate Embedding → Save → Recompute 3D Positions
```

Brain dumps become nodes in the 3D universe. A thought about "discipline and creative output" will naturally cluster near a saved article about productivity workflows. That's the whole point — your thoughts live alongside your collected knowledge, connected by meaning.

---

## 2. Schema Changes

### signals table — MODIFY

The `url` column must become nullable (it's currently `NOT NULL UNIQUE`):

```sql
-- url was: TEXT NOT NULL UNIQUE
-- url is now: TEXT (nullable, unique constraint only applies to non-null values)
-- SQLite doesn't support ALTER COLUMN, so this needs to be handled in the Drizzle schema

-- Add a unique partial index instead:
CREATE UNIQUE INDEX idx_signals_url ON signals(url) WHERE url IS NOT NULL;
```

In the Drizzle schema (`src/lib/db/schema.ts`), change:
```typescript
// BEFORE:
url: text('url').notNull().unique(),

// AFTER:
url: text('url'),  // nullable, unique enforced via partial index or application logic
```

### New/modified fields used by brain dumps:

| Field | Value for Brain Dumps |
|-------|----------------------|
| `url` | `null` |
| `source` | `'brain_dump'` |
| `raw_scraped_content` | The user's original text input (stored as-is) |
| `title` | AI-generated from the text |
| `summary` | AI-generated |
| `category` | AI-detected or user-selected |
| `content_type` | `'reflection'`, `'quote'`, `'principle'`, `'question'`, `'note'` (new types) |
| `extracted_content` | AI picks the most quotable/actionable line if applicable |
| `extracted_content_type` | `'quote'` or `'technique'` or `'none'` |

### New content_type values to add:

Add these to the content_type options (wherever content types are defined/validated):
- `reflection` — personal thoughts, morning pages, processing
- `quote` — book quotes, saved passages, attributed wisdom  
- `principle` — rules, mental models, things to internalize
- `question` — things you're curious about, open questions to explore
- `note` — general notes, observations, unstructured capture

---

## 3. UI Changes

### 3.1 Capture Modal — Add Tab System

The existing URL capture modal gets a second tab. The modal should have two tabs at the top:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│  CAPTURE NEW SIGNAL                               │
│                                                   │
│  [ 🔗 URL ]  [ 🧠 Brain Dump ]                   │
│  ─────────────────────────────                    │
│                                                   │
│  (tab content changes based on selection)         │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 3.2 Brain Dump Tab Content

```
┌─────────────────────────────────────────────────┐
│                                                   │
│  CAPTURE NEW SIGNAL                               │
│                                                   │
│  [ 🔗 URL ]  [ 🧠 Brain Dump ]                   │
│  ────────────════════════════                     │
│                                                   │
│  Title (optional — AI will generate one):         │
│  ┌─────────────────────────────────────────┐     │
│  │                                         │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│  What's on your mind?                             │
│  ┌─────────────────────────────────────────┐     │
│  │                                         │     │
│  │  (expandable textarea, min 4 rows)      │     │
│  │                                         │     │
│  │                                         │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│  Type: [Auto-detect ▼]                            │
│    Options: Auto-detect, Reflection, Quote,       │
│    Principle, Question, Note                      │
│                                                   │
│  Category: [Auto-detect ▼]                        │
│    (same category dropdown as URL mode)           │
│                                                   │
│            [Cancel]   [🧠 Capture Thought]        │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Minimum required input:** Just the textarea content. Everything else (title, type, category) is optional — the AI generates sensible defaults.

**Maximum input:** No hard limit, but the AI analysis prompt should handle long text gracefully. If content > 4000 chars, truncate to first 4000 for embedding but store the full text.

### 3.3 Visual Differentiation in Grid/Universe

Brain dump signals should be visually distinct from URL-based signals:

**Grid view cards:**
- Instead of a source icon (X, GitHub, etc.), show a 🧠 icon
- Instead of "X · 3 days ago", show "Brain dump · 3 days ago"
- Card border uses category color (same as URL signals)
- If content_type is 'quote', show the text in italics with a left border accent

**Universe view nodes:**
- Brain dump nodes use the SAME shape as URL nodes (icosahedron)
- They position via UMAP based on semantic meaning (identical to URL signals)
- They cluster with URL signals about similar topics (this is the key feature)
- Optional visual differentiation: slightly different geometry (e.g., octahedron instead of icosahedron) or a subtle inner ring/halo

**Detail panel:**
- Shows "🧠 Brain Dump" as the source instead of a URL
- "Open Original" button is hidden (no URL to open)
- Full text of the brain dump is displayed in the extracted content area
- AI chat works identically — the AI has the brain dump text as context

---

## 4. API Changes

### POST `/api/signals` — AMEND capture flow

Add detection for brain dump mode. The request body gains a new optional field:

```typescript
// Request — URL mode (existing, unchanged):
{
  url: string;
  note?: string;
  category?: string;
  skipAnalysis?: boolean;
}

// Request — Brain Dump mode (NEW):
{
  content: string;          // The brain dump text (REQUIRED for brain dumps)
  title?: string;           // Optional user-provided title
  contentType?: string;     // 'reflection' | 'quote' | 'principle' | 'question' | 'note'
  category?: string;        // Override auto-detect
  note?: string;
  source: 'brain_dump';     // Identifies this as a brain dump
}
```

**Modified flow for brain dumps:**

```
1. Detect: if request has `source === 'brain_dump'` and `content` field → brain dump mode
2. Skip: duplicate URL check (no URL)
3. Skip: Jina scrape (no URL to scrape)
4. Store raw_scraped_content = the user's input text
5. Send content to AI for analysis (same summarize prompt, slightly modified — see Section 5)
6. Generate embedding from content
7. Save signal with url=null, source='brain_dump'
8. Recompute 3D positions (debounced)
9. Return complete signal object
```

### Duplicate detection for brain dumps:

Since there's no URL to deduplicate on, brain dumps don't check for duplicates. If someone dumps the same thought twice, the embedding similarity will place them next to each other in 3D space, making the duplication visually obvious.

---

## 5. AI Analysis — Modified Prompt

For brain dumps, use a slightly modified version of the summarization prompt:

```typescript
const BRAIN_DUMP_ANALYZE_PROMPT = `You are a knowledge curator. Analyze the following personal thought, note, or reflection and return ONLY a JSON object with these fields:
{
  "title": "Clear, descriptive title for this thought (max 80 chars)",
  "summary": "2-3 sentences capturing the essence of this thought and why it might be worth revisiting",
  "keyTakeaway": "The single most important insight or principle from this text",
  "category": "one of: prompts, coding, ai-art, video, tools, philosophy, music, lifestyle, learning, other",
  "contentType": "one of: reflection, quote, principle, question, note",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "extractedContent": "If there is a specific quote, principle, or actionable insight worth highlighting, extract it here. If the entire text IS the content, set to null.",
  "extractedContentType": "one of: quote, technique, none",
  "actionable": true/false
}

Rules:
- This is a personal thought or note, NOT a web page. Treat it as first-person knowledge.
- Tags should reflect the concepts and themes discussed, useful for clustering.
- For book quotes, try to identify the book/author if mentioned and include as tags.
- For principles/rules, the extractedContent should be the principle stated clearly.
- For questions, the title should be phrased as a question.
- Be thoughtful about category assignment — philosophical reflections go in "philosophy", coding insights in "coding", etc.
- Return ONLY the JSON, no markdown fences, no preamble`;
```

---

## 6. Embedding Text Composition — Brain Dumps

The existing `composeEmbeddingText()` function works for brain dumps too, but the weighting is slightly different since there's no URL-scraped content:

```typescript
function composeEmbeddingText(signal: Signal): string {
  if (signal.source === 'brain_dump') {
    // For brain dumps, the raw content IS the primary material
    const parts = [
      signal.title,
      signal.raw_scraped_content?.substring(0, 1500),  // The actual brain dump text
      signal.keyTakeaway,
      signal.tags?.join(", "),
      signal.note,
    ].filter(Boolean);
    return parts.join(". ");
  }
  
  // Existing logic for URL-based signals
  const parts = [
    signal.title,
    signal.summary,
    signal.keyTakeaway,
    signal.extractedContent?.substring(0, 500),
    signal.tags?.join(", "),
    signal.note,
  ].filter(Boolean);
  return parts.join(". ");
}
```

---

## 7. Re-evaluation & Repositioning

### Automatic repositioning (already built in):
- UMAP recomputes positions every time a signal is added or deleted
- All nodes shift slightly when the universe changes — nothing is fixed
- A brain dump's position evolves as more signals are added around it

### Manual re-analysis (NEW — add a button):
Add a "Re-analyze" button to the detail panel for any signal (brain dumps AND URLs):

```typescript
// POST /api/signals/[id]/reanalyze
// Flow:
// 1. Load signal's raw_scraped_content (or scraped content for URLs)
// 2. Also load any chat conversation as additional context
// 3. Re-run AI analysis with enriched context
// 4. Re-generate embedding with new analysis
// 5. Update signal in DB
// 6. Recompute UMAP positions
```

This lets users re-evaluate a brain dump after they've chatted about it and realize it's actually about something different. The AI gets the original text PLUS the conversation history, producing a richer analysis.

---

## 8. Chat System Prompt — Brain Dumps

For brain dump signal chats, use a modified system prompt:

```typescript
const BRAIN_DUMP_CHAT_PROMPT = `You are a knowledgeable AI thinking partner helping the user explore, develop, and build upon their own thoughts and ideas.

Here is the thought/note they want to discuss:

---
{raw_scraped_content}
---

Category: {category}
Type: {contentType}
User's note: {note}

This is their own thinking, not a web article. Help them:
- Develop the idea further — ask probing questions
- Connect it to broader concepts or frameworks
- Challenge assumptions respectfully
- Suggest related ideas, books, or resources
- If it's a principle, help them pressure-test it with edge cases
- If it's a question, help them explore possible answers
- Be a genuine thinking partner, not just an information source`;
```

---

## 9. Implementation Checklist

### Step 1: Schema migration
- [ ] Make `url` nullable in Drizzle schema
- [ ] Add partial unique index on `url WHERE url IS NOT NULL`
- [ ] Add new content_type values: reflection, quote, principle, question, note
- [ ] Run migration

### Step 2: API route modification
- [ ] Modify POST `/api/signals` to detect brain dump mode (`source === 'brain_dump'`)
- [ ] Skip scrape step for brain dumps
- [ ] Use BRAIN_DUMP_ANALYZE_PROMPT for brain dump analysis
- [ ] Store user text as `raw_scraped_content`
- [ ] Handle embedding text composition for brain dumps
- [ ] Return proper signal object

### Step 3: UI — Capture modal tabs
- [ ] Add tab system to the capture modal (URL | Brain Dump)
- [ ] Build Brain Dump tab with: optional title, textarea, type selector, category selector
- [ ] "Capture Thought" button triggers brain dump API flow
- [ ] Progress states: idle → analyzing → embedding → captured
- [ ] Keyboard shortcut: Cmd+Shift+N for brain dump (Cmd+N stays as URL capture)

### Step 4: UI — Visual differentiation
- [ ] Grid view: 🧠 icon for brain dump source, appropriate subtitle
- [ ] Detail panel: hide "Open Original" button when source is brain_dump
- [ ] Detail panel: show full brain dump text in content area
- [ ] Chat uses brain dump system prompt when source is brain_dump

### Step 5: Re-analyze feature
- [ ] Add POST `/api/signals/[id]/reanalyze` route
- [ ] Add "Re-analyze" button to detail panel (works for both brain dumps and URLs)
- [ ] Include conversation history in re-analysis context
- [ ] Re-embed after re-analysis
- [ ] Trigger UMAP recompute

### Step 6: Test scenarios
- [ ] Brain dump a short thought (1 sentence) → verify AI generates title, category, tags
- [ ] Brain dump a book quote → verify it categorizes correctly and clusters near related signals
- [ ] Brain dump a long reflection (500+ words) → verify truncation works for embedding
- [ ] Chat with a brain dump → verify AI acts as thinking partner, not information source
- [ ] Re-analyze a brain dump after chatting → verify new embedding repositions the node
- [ ] Mix brain dumps with URL signals → verify they cluster by meaning in 3D universe

---

## 10. File Changes Summary

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Make `url` nullable, add new content_type values |
| `src/lib/db/queries.ts` | Handle null URL in createSignal, update duplicate check |
| `src/lib/ai/prompts.ts` | Add BRAIN_DUMP_ANALYZE_PROMPT and BRAIN_DUMP_CHAT_PROMPT |
| `src/lib/ai/provider.ts` | Modify summarize() to accept source type for prompt selection |
| `src/lib/embedding/umap.ts` | No change needed (already handles any signal with embedding) |
| `src/app/api/signals/route.ts` | Add brain dump detection, skip scrape, use brain dump prompt |
| `src/app/api/signals/[id]/reanalyze/route.ts` | NEW — re-analysis endpoint |
| `src/components/capture/URLInput.tsx` | Add tab system, brain dump tab with textarea |
| `src/components/signals/SignalCard.tsx` | Show 🧠 icon for brain_dump source |
| `src/components/signals/SignalDetail.tsx` | Hide "Open Original" for brain dumps, add Re-analyze button |
| `src/components/chat/ChatPanel.tsx` | Use brain dump chat prompt when source is brain_dump |

---

*This feature transforms Nexus from "things I found on the internet" to "everything I think about and encounter" — the complete knowledge reactor vision.*
