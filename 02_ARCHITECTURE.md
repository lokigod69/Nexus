# NEXUS — Technical Architecture

> Complete technical specification for building Nexus as a local-first Next.js application.

---

## 1. Technology Stack

### Core Framework
- **Next.js 14** (App Router) — React framework with API routes for local backend
- **TypeScript** — type safety throughout
- **Tailwind CSS** — styling with custom dark theme
- **React Three Fiber** (`@react-three/fiber`) + **Drei** (`@react-three/drei`) — 3D visualization
- **three.js** (r160+) — underlying 3D engine

### Data Layer
- **better-sqlite3** — embedded SQLite database, zero-config, single file
- **drizzle-orm** + **drizzle-kit** — type-safe ORM with migration support
- Database file location: `./data/nexus.db` (gitignored, auto-created on first run)

### AI Integration
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude models
- **OpenAI SDK** (`openai`) — GPT models
- Provider switching via environment variable + runtime toggle
- Models used:
  - **Summarization/Triage** (cheap, fast): `claude-3-5-haiku-20241022` or `gpt-4o-mini`
  - **Deep Chat/Analysis** (powerful): `claude-sonnet-4-20250514` or `gpt-4o`

### Content Scraping
- **Jina Reader API** — free, no API key needed for basic use
  - Usage: `GET https://r.jina.ai/{URL}` returns clean Markdown
  - Rate limit: ~20 req/min on free tier (sufficient for manual use)
  - Handles: X/Twitter posts, GitHub READMEs, blog posts, articles, most web pages
- **Fallback**: Raw URL metadata extraction via `node-html-parser` + Open Graph tags

### Additional Dependencies
- `d3-force-3d` — force-directed graph physics for 3D node positioning
- `zustand` — lightweight state management
- `react-hot-toast` — toast notifications
- `lucide-react` — icon set
- `date-fns` — date formatting
- `marked` or `react-markdown` — render scraped markdown content
- `copy-to-clipboard` — clipboard utility

---

## 2. Project Structure

```
nexus/
├── .env.local                  # API keys (never committed)
├── data/
│   └── nexus.db                # SQLite database (auto-created, gitignored)
├── exports/                    # Obsidian markdown exports land here
├── drizzle/
│   └── migrations/             # Database migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark theme, fonts)
│   │   ├── page.tsx            # Main app — 3D universe + sidebar
│   │   ├── triage/
│   │   │   └── page.tsx        # Triage/swipe interface for inbox items
│   │   └── api/
│   │       ├── signals/
│   │       │   ├── route.ts         # CRUD: GET all, POST new signal
│   │       │   └── [id]/
│   │       │       ├── route.ts     # GET/PUT/DELETE single signal
│   │       │       └── chat/
│   │       │           └── route.ts # POST message, GET conversation
│   │       ├── scrape/
│   │       │   └── route.ts    # POST URL → scrape via Jina → return markdown
│   │       ├── analyze/
│   │       │   └── route.ts    # POST content → AI summary/tags/extraction
│   │       ├── chat/
│   │       │   └── route.ts    # POST message → AI response (streaming)
│   │       ├── export/
│   │       │   └── route.ts    # GET → export signals to Obsidian/JSON/MD
│   │       └── settings/
│   │           └── route.ts    # GET/PUT app settings (AI provider, etc.)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Left sidebar: navigation, filters, stats
│   │   │   ├── Header.tsx           # Top bar: search, add URL, view toggle
│   │   │   └── CommandPalette.tsx   # Cmd+K quick actions
│   │   ├── capture/
│   │   │   ├── URLInput.tsx         # Main URL paste input with auto-detect
│   │   │   ├── BulkImport.tsx       # Multi-URL paste modal
│   │   │   └── CaptureProgress.tsx  # Progress indicator for scrape+analyze
│   │   ├── triage/
│   │   │   ├── TriageCard.tsx       # Single card in triage view
│   │   │   └── TriageStack.tsx      # Swipeable card stack
│   │   ├── universe/
│   │   │   ├── NexusScene.tsx       # Main Three.js scene container
│   │   │   ├── SignalNode.tsx       # Individual 3D node (sphere/particle)
│   │   │   ├── NodeEdge.tsx         # Connection line between related nodes
│   │   │   ├── ClusterLabel.tsx     # Floating category labels in 3D space
│   │   │   ├── CameraController.tsx # Orbit, zoom, fly-to-node controls
│   │   │   └── UniverseHUD.tsx      # Overlay UI on top of 3D (filters, minimap)
│   │   ├── signals/
│   │   │   ├── SignalDetail.tsx      # Full signal view (summary, content, actions)
│   │   │   ├── SignalCard.tsx        # Card view for list/grid mode
│   │   │   ├── ExtractedContent.tsx  # Formatted code/prompt block with copy btn
│   │   │   └── SignalTimeline.tsx    # Calendar/timeline visualization
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx         # Sliding panel for AI conversation
│   │   │   ├── ChatMessage.tsx       # Individual message bubble
│   │   │   ├── ChatInput.tsx         # Message input with send button
│   │   │   └── ProviderSwitch.tsx    # Toggle between Claude/OpenAI
│   │   └── common/
│   │       ├── TagPill.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── CategoryIcon.tsx
│   │       ├── CopyButton.tsx
│   │       └── ConfirmDialog.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts         # Database connection singleton
│   │   │   ├── schema.ts        # Drizzle schema definitions
│   │   │   └── queries.ts       # Reusable query functions
│   │   ├── ai/
│   │   │   ├── provider.ts      # AI provider abstraction layer
│   │   │   ├── anthropic.ts     # Claude-specific implementation
│   │   │   ├── openai.ts        # OpenAI-specific implementation
│   │   │   └── prompts.ts       # System prompts for summarize, chat, analyze
│   │   ├── scraper/
│   │   │   ├── jina.ts          # Jina Reader API client
│   │   │   └── fallback.ts      # Fallback metadata scraper
│   │   ├── export/
│   │   │   ├── obsidian.ts      # Obsidian markdown formatter
│   │   │   ├── json.ts          # Full JSON export
│   │   │   └── markdown.ts      # Plain markdown export
│   │   ├── graph/
│   │   │   └── physics.ts       # d3-force-3d simulation config
│   │   └── utils/
│   │       ├── categories.ts    # Category definitions and icons
│   │       ├── url.ts           # URL parsing and source detection
│   │       └── time.ts          # Freshness calculations, age labels
│   ├── stores/
│   │   ├── signalStore.ts       # Zustand store for signals state
│   │   ├── uiStore.ts           # UI state (selected node, view mode, panels)
│   │   └── settingsStore.ts     # App settings (AI provider, theme, etc.)
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── public/
│   └── fonts/                   # Custom fonts (JetBrains Mono, etc.)
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Database Schema

### signals
The core entity. Each signal represents one captured URL/piece of knowledge.

```sql
CREATE TABLE signals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,                           -- AI-generated 2-3 sentence summary
  key_takeaway TEXT,                      -- Single most important insight
  extracted_content TEXT,                 -- The actual prompt/code/technique (copy-pasteable)
  extracted_content_type TEXT,            -- 'prompt' | 'code' | 'technique' | 'quote' | 'none'
  raw_scraped_content TEXT,              -- Full markdown from Jina scraper
  category TEXT NOT NULL DEFAULT 'other', -- prompts, coding, ai-art, video, tools, philosophy, music, lifestyle, learning, other
  content_type TEXT DEFAULT 'resource',   -- tutorial, prompt, discussion, tool, showcase, thread, article, video
  source TEXT DEFAULT 'web',              -- X/Twitter, GitHub, YouTube, Reddit, Medium, Web
  status TEXT NOT NULL DEFAULT 'inbox',   -- inbox, triaged, active, playground, starred, archived
  actionable INTEGER DEFAULT 0,           -- boolean: does this contain something you can immediately use?
  note TEXT,                              -- User's personal note
  ai_provider TEXT,                       -- Which AI analyzed this ('claude' | 'openai')
  scraped_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  archived_at DATETIME
);
```

### tags
Flexible tagging system.

```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signal_tags (
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (signal_id, tag_id)
);
```

### conversations
Each signal can have one ongoing AI conversation.

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  title TEXT,                              -- Auto-generated from first message
  ai_provider TEXT NOT NULL,               -- Which provider was used
  ai_model TEXT NOT NULL,                  -- Specific model used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### messages
Individual messages within a conversation.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                      -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### collections
Optional grouping of signals into user-defined collections.

```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#7b8aff',
  icon TEXT DEFAULT '◇',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signal_collections (
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (signal_id, collection_id)
);
```

### settings
App-level settings stored in DB for persistence.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings inserted on first run:
-- ai_provider: 'anthropic'
-- ai_model_fast: 'claude-3-5-haiku-20241022'
-- ai_model_deep: 'claude-sonnet-4-20250514'
-- obsidian_vault_path: ''
-- theme: 'dark'
-- default_view: 'universe'
```

---

## 4. API Routes Specification

### POST /api/signals
**Create a new signal.** This is the main capture flow.

```typescript
// Request
{
  url: string;
  note?: string;
  category?: string;        // Override auto-detect
  skipAnalysis?: boolean;    // For bulk import speed
}

// Flow:
// 1. Check for duplicate URL
// 2. Scrape via Jina Reader API: GET https://r.jina.ai/{url}
// 3. Send scraped content to AI for analysis
// 4. Store signal + tags in database
// 5. Return complete signal object

// Response: Signal object with all fields populated
```

### GET /api/signals
**List signals with filters.**

```typescript
// Query params:
// ?status=active,starred      (comma-separated)
// ?category=coding,prompts    (comma-separated)
// ?search=nano+banana         (full-text search across title, summary, tags, notes)
// ?sort=newest|oldest|starred (default: newest)
// ?limit=50                   (default: 50)
// ?offset=0                   (for pagination)

// Response: { signals: Signal[], total: number }
```

### PUT /api/signals/[id]
**Update a signal.** Used for status changes, notes, re-categorization.

### DELETE /api/signals/[id]
**Delete a signal and its conversations.**

### POST /api/signals/[id]/chat
**Send a message to a signal's AI conversation.**

```typescript
// Request
{
  message: string;
  provider?: 'anthropic' | 'openai';   // Override default
  model?: string;                        // Override default model
}

// Flow:
// 1. Get or create conversation for this signal
// 2. Load signal's raw_scraped_content as system context
// 3. Load conversation history
// 4. Send to AI provider (streaming response)
// 5. Save user message and AI response to database
// 6. Return AI response (streamed)

// The system prompt includes the signal's scraped content so the AI
// always has full context about what this signal contains.
```

### GET /api/signals/[id]/chat
**Get conversation history for a signal.**

### POST /api/scrape
**Scrape a URL without creating a signal.** Useful for preview.

```typescript
// Request: { url: string }
// Response: { content: string, title: string, source: string }
```

### POST /api/analyze
**AI analysis without creating a signal.** Useful for re-analysis.

```typescript
// Request: { content: string, url: string }
// Response: { title, summary, category, tags, contentType, extractedContent, keyTakeaway, actionable }
```

### GET /api/export
**Export signals.**

```typescript
// Query params:
// ?format=obsidian|json|markdown
// ?ids=id1,id2,id3            (specific signals, or omit for all)
// ?category=coding             (filter)
// ?status=starred              (filter)

// For Obsidian: generates .md files with YAML frontmatter, saves to configured vault path
// For JSON: returns full data export
// For Markdown: returns formatted markdown document
```

---

## 5. AI Integration Layer

### Provider Abstraction

```typescript
// src/lib/ai/provider.ts
interface AIProvider {
  summarize(content: string, url: string): Promise<SignalAnalysis>;
  chat(messages: Message[], systemContext: string): AsyncGenerator<string>;
  getModelName(tier: 'fast' | 'deep'): string;
}

// Both AnthropicProvider and OpenAIProvider implement this interface.
// The active provider is determined by settings + can be overridden per-request.
```

### System Prompts

```typescript
// SUMMARIZATION PROMPT (used in capture flow)
const SUMMARIZE_PROMPT = `You are a knowledge curator. Analyze the following web content and return ONLY a JSON object with these fields:
{
  "title": "Clear, descriptive title (max 80 chars)",
  "summary": "2-3 sentences explaining what this content is and why it might be valuable",
  "keyTakeaway": "The single most important insight or technique from this content",
  "category": "one of: prompts, coding, ai-art, video, tools, philosophy, music, lifestyle, learning, other",
  "contentType": "one of: tutorial, prompt, discussion, tool, showcase, thread, article, video",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "extractedContent": "If there is a specific prompt, code snippet, technique, or quote that is the core value of this content, extract it here exactly as written. If no specific extractable content, set to null.",
  "extractedContentType": "one of: prompt, code, technique, quote, none",
  "actionable": true/false
}

Rules:
- Tags should be specific and useful for clustering (e.g., "midjourney", "nano-banana", "claude-code", "three-js")
- extractedContent should be the EXACT text someone would want to copy-paste
- Be precise about categories — prompts for image/text generation go in "prompts", coding tutorials in "coding"
- Return ONLY the JSON, no markdown fences, no preamble`;

// CHAT SYSTEM PROMPT (used in per-signal conversations)
const CHAT_SYSTEM_PROMPT = `You are a knowledgeable AI assistant helping the user understand, learn from, and build upon a specific piece of content they saved.

Here is the content they want to discuss:

---
{scraped_content}
---

Source URL: {url}
Category: {category}
User's note: {note}

Be helpful, educational, and practical. If they ask you to explain something, adapt to their level. If they want to build on an idea, be creative and specific. If they want your honest take, give it. Reference specific parts of the content when relevant.`;
```

---

## 6. Scraping Pipeline

### Primary: Jina Reader

```typescript
// src/lib/scraper/jina.ts
async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Accept': 'application/json',
      // Optional: 'Authorization': 'Bearer {JINA_API_KEY}' for higher rate limits
    }
  });

  const data = await response.json();

  return {
    title: data.title,
    content: data.content,          // Clean markdown
    description: data.description,
    url: data.url,
    siteName: data.siteName,
  };
}
```

### Fallback: Basic Metadata Extraction
For URLs that Jina can't handle (rare), fall back to fetching the page HTML and extracting Open Graph meta tags (og:title, og:description, og:image).

### Source-Specific Handling
- **X/Twitter**: Jina works well for public tweets. The scraped content includes tweet text, author, date, and quoted tweets.
- **GitHub**: Returns README content plus repo description. For code files, returns the code.
- **YouTube**: Returns video title and description. Does not include transcript (future: add YouTube transcript API).
- **Medium/Substack/Blog**: Returns full article text in clean markdown.

---

## 7. Obsidian Export Format

Each exported signal becomes a `.md` file with YAML frontmatter:

```markdown
---
title: "Nano Banana Pro Cinematic Grid Prompts"
url: "https://x.com/underwoodxie96/status/2030225124029259904"
source: "X/Twitter"
category: "prompts"
content_type: "prompt"
tags:
  - nano-banana
  - image-generation
  - cinematic
  - midjourney
status: "starred"
created: 2026-03-12
---

## Summary
Technique for generating cinematic grid frames from a single image using Nano Banana Pro, with prompts optimized for coherent scene continuity rather than random camera angles.

## Key Takeaway
Updated prompt setup expands keyframes based on same scene + storyline for better continuity in video clips.

## Extracted Prompt
```
{the actual extracted prompt text}
```

## My Notes
{user's personal notes}

## AI Conversation
{exported conversation if exists}
```

File naming: `{date}_{category}_{slugified-title}.md`
Example: `2026-03-12_prompts_nano-banana-cinematic-grid.md`

---

## 8. Environment Variables

```bash
# .env.local

# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional: Jina API key for higher rate limits (free tier works for casual use)
JINA_API_KEY=

# Obsidian vault path (for export feature)
OBSIDIAN_VAULT_PATH=/Users/yourname/Documents/ObsidianVault/Nexus

# App
DATABASE_PATH=./data/nexus.db
PORT=3000
```

---

## 9. Performance Considerations

- **SQLite is single-threaded**: For a single-user local app this is actually perfect. No connection pool needed.
- **3D rendering**: The force-directed graph should handle 200-500 nodes comfortably. For 500+ signals, implement level-of-detail (LOD) — distant nodes become simple points.
- **AI calls are the bottleneck**: Scrape + analyze takes 3-8 seconds per URL. Show progress UI. For bulk import, process sequentially with a progress bar.
- **Streaming chat responses**: Use Server-Sent Events (SSE) from the chat API route so responses appear word-by-word.
- **Scraping rate limits**: Jina free tier allows ~20 req/min. For bulk import of 50 URLs, batch with delays. Show estimated time.

---

## 10. Migration Path to Cloud (V2)

When ready to go online:
1. Replace `better-sqlite3` with `@vercel/postgres` or Supabase client
2. Move Drizzle schema to PostgreSQL dialect (minimal changes)
3. Add authentication (NextAuth.js or Supabase Auth)
4. Deploy to Vercel
5. Move database to Supabase/Neon
6. Add real-time sync for multi-device

The API routes and frontend remain identical. Only the database layer changes.
