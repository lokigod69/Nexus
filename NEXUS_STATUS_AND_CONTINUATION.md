# NEXUS — Project Status & Continuation Prompt

> Use this as the starting context for a new chat. It captures everything built so far, what works, what doesn't, and the feature vision going forward.

---

## Current State (March 14, 2026)

### Two parallel builds exist:
- **Claude build (Green)** — Port 3001 — `D:\CODING\Nexus-Claude` (or wherever it lives)
- **Codex build (Blue)** — Port 3004 — `D:\CODING\Nexus-Codex`

Both have been through 6+ rounds of implementation and testing. Neither is production-ready but both are functional prototypes.

### What's been built (both builds):

**Core Pipeline (Working):**
- Next.js 14 + TypeScript + Tailwind dark theme
- SQLite database (better-sqlite3 + Drizzle ORM) with 10+ tables
- URL capture: paste URL → Jina scrape → AI analysis (Claude Haiku) → Gemini embedding → UMAP 3D positioning → save
- AI summarization produces: title, summary, key takeaway, extracted content, category, tags, content type
- Per-signal AI chat with streaming responses (SSE)
- Semantic search via Gemini embeddings + cosine similarity
- Related signals detection (nearest embedding neighbors)
- Export to Obsidian/JSON/Markdown
- Zustand state management

**Views (Working):**
- Grid view — signal cards with category colors, tags, summaries
- Universe view — 3D Three.js scene with positioned nodes (UMAP coordinates)
- Timeline view — date-grouped vertical timeline
- Triage view — card stack with Keep/Do Today/Discard
- Detail panel — full signal info + AI chat
- Settings panel — AI config, enrichment toggles, cache management
- Command palette (Ctrl+K)

**Enrichment Layer (Built, varies in quality):**
- 16 enrichment plugins: favicons, GitHub stats, quotes, HTTP Cat/Dog errors, Bored API empty states, QR codes, book detection (Open Library), dictionary lookups, emoji assignment, meme easter eggs, Colormind daily palette, NASA APOD background, weather effects, poetry matching, random facts, RSS feeds
- Plugin registry with per-plugin toggle in settings
- Two dedicated DB tables (signal_enrichments, enrichment_cache)
- Non-blocking enrichment pass in capture pipeline (Promise.allSettled)

**3D Universe (Latest state):**
- Bloom/glow post-processing (postprocessing library)
- Category-colored emissive nodes with point lights
- Star field background (multi-layer, twinkling)
- Fog for depth perception
- Cluster labels (floating billboard text)
- Colored connection edges between semantically similar signals
- Fresh node pulse animation, starred node golden aura
- OrbitControls with auto-rotate on idle

### What's still problematic:

**Claude build:**
- AI analysis has been inconsistent — sometimes produces clean summaries, sometimes raw scraped text leaks through
- Node sizes were overcorrected from too big to too small
- Camera behavior needs polish
- Node click → detail panel connection may still be flaky

**Codex build:**
- Had infinite canvas growth bug (reported fixed)
- Related signals was showing duplicates (reported fixed)
- Port changed to 3004 due to conflicts
- FPS in 3D universe was 16-20 in headless testing (needs real GPU verification)

**Both builds:**
- No image previews — OG image extraction was added but X/Twitter blocks OG images, so most social media captures are text-only
- The 3D universe still feels sparse with few signals — needs 20-50+ signals to feel like a "constellation"
- No visual thumbnails or screenshots of captured pages
- The overall experience is functional but not yet "magical" — it's a smart bookmark manager, not yet a knowledge universe

### Tech Stack:
- Framework: Next.js 14 (App Router) + TypeScript + Tailwind
- DB: better-sqlite3 + drizzle-orm (local SQLite)
- 3D: @react-three/fiber + @react-three/drei + three.js + postprocessing (bloom)
- AI Chat: @anthropic-ai/sdk (Claude Haiku 4.5) + openai (GPT-4o-mini)
- Embeddings: @google/genai (gemini-embedding-001, 768-dim)
- Scraping: Jina Reader API
- State: Zustand

### Models (cheap tier for development):
- Anthropic: `claude-haiku-4-5-20251001` for both fast and deep
- OpenAI: `gpt-4o-mini` for both tiers
- Embeddings: `gemini-embedding-001` at 768 dimensions

### API costs so far: ~$0.13 total (negligible)

### Documentation in project root:
- 01_VISION.md — Philosophical north star
- 02_ARCHITECTURE.md — Tech stack, schema, API specs
- 03_UI_DESIGN.md — Visual design, components, 3D specs
- 04_IMPLEMENTATION.md — Build phases
- 05_EMBEDDING_AMENDMENT.md — Semantic embedding layer
- 06_API_ENRICHMENT_LAYER.md — Enrichment plugins
- CLAUDE.md / AGENTS.md — Agent instructions

---

## NEW FEATURE IDEAS (Not yet implemented)

### 1. Brain Dump / Thought Capture Mode

A new capture mode beyond URL pasting. Instead of a URL, you write free-form text — thoughts, reflections, quotes from books, morning insights, concepts you're processing.

**How it could work:**
- New "Brain Dump" button alongside "Add URL"
- Opens a text editor (not a URL input)
- You type or paste your thought, quote, or book excerpt
- AI analyzes it the same way: generates title, summary, tags, category
- Gets embedded and positioned in the 3D universe alongside URL-based signals
- Has its own AI chat thread — you can discuss your own thoughts with the AI

**Categorization:**
- Could use existing categories (Philosophy, Learning, Lifestyle) or new ones:
  - "Reflections" — personal thoughts and processing
  - "Book Notes" — quotes and concepts from reading
  - "Morning Pages" — daily brain dumps
  - "Principles" — rules and mental models you want to internalize

**Key question:** Should brain dumps live in the same signal table (with a `source` field of "brain_dump" instead of "web") or a separate table? Same table is simpler and means they appear in the universe alongside web signals — a thought about discipline would cluster near a saved article about productivity. Separate table keeps them isolated but loses the semantic connections.

### 2. Book Integration

Upload an entire book (EPUB, PDF) and have Nexus:
- Extract chapters/sections
- AI-summarize each chapter
- Create signals for key concepts
- Let you chat with the book content
- Highlight and save specific passages as individual signals
- Could integrate with the existing Open Library enrichment for metadata

### 3. Daily Reminders / Spaced Repetition

Flag certain signals (quotes, principles, lessons) as "reminders":
- Set a schedule: daily, weekly, specific days
- Dashboard widget shows today's reminders
- "Read this again" prompt with the signal's key takeaway
- Spaced repetition logic: show less frequently as you interact with it more
- Purpose: burn important lessons into memory through repetition

### 4. Token Usage Tracker / Cost Dashboard

Monitor API costs across all providers:
- Log every API call: provider, model, input tokens, output tokens, timestamp, purpose (summarize/chat/embed)
- New DB table: `api_usage_log`
- Dashboard view showing:
  - Total tokens sent/received per model
  - Estimated cost based on current pricing
  - Daily/weekly/monthly breakdown
  - Per-signal cost (how much did it cost to capture and chat about each signal)
- Real-time counter in the status bar: "Today: 12.4k tokens · ~$0.02"

### 5. The Bigger Vision

Nexus should be the ONE place where everything you encounter and think about gets captured, connected, and revisited. Not just bookmarks — your entire intellectual life:

- URLs you find → captured and analyzed
- Thoughts you have → brain dumped and discussed with AI
- Books you read → chapters extracted and connected to your thoughts
- Lessons you learn → reminded daily until they're internalized
- Everything exists in one 3D space where related ideas cluster naturally
- You can orbit your knowledge universe and rediscover connections you forgot
- The AI isn't just a chatbot — it's your thinking partner that knows everything you've ever saved

---

## Recommended Next Steps

### Immediate (polish what exists):
1. Verify both builds work after latest visual transforms
2. Populate with 15-20 real signals to see the universe come alive
3. Fix any remaining camera/interaction issues
4. Decide which build to focus on going forward (or cherry-pick best of both)

### Short term (new features):
1. **Token tracker** — simple logging table + dashboard view
2. **Brain dump mode** — text input capture alongside URL capture
3. **Git init** — version control on the chosen build

### Medium term:
4. **Book integration** — EPUB/PDF upload and processing
5. **Daily reminders** — spaced repetition for important signals
6. **Image/screenshot previews** — either via screenshot API or better OG image handling

### Long term:
7. **Automated X feed scanning** — watch bookmarks/likes
8. **Multi-signal chat** — discuss multiple signals at once
9. **Collaborative sharing** — share collections with others
10. **Mobile companion** — quick capture from phone

---

## Starting the New Chat

When starting a new chat, reference this document and the project files. The agent should:
1. Read all spec docs (01-06) plus this status document
2. Understand what's built vs what's planned
3. Focus on the specific task you give it
4. Not rebuild what exists — iterate and improve

The project is at the stage where broad "build everything" prompts produce diminishing returns. What works better now: specific, focused tasks ("add brain dump text input to the capture modal", "create the token usage logging table and dashboard", "fix the camera fly-to animation so it doesn't snap").
