# NEXUS — Amendment: API Enrichment Layer

> This document amends the Nexus spec with a comprehensive free API integration layer. It adds gamification, dynamic aesthetics, data enrichment, ambient content, and personality features that transform Nexus from a productivity tool into a living, breathing knowledge environment.

> **READ DOCUMENTS 01–05 FIRST.** This document describes additions only. Nothing here replaces existing functionality — all features degrade gracefully if an API is down or rate-limited.

---

## 1. Architecture: The Enrichment Plugin System

All API integrations live in a new `src/lib/enrichment/` directory with a plugin-like structure. Each enrichment is independently toggleable from Settings.

### Directory Structure (ADD to existing project structure)

```
src/
├── lib/
│   ├── enrichment/
│   │   ├── index.ts              # Plugin registry, toggle manager
│   │   ├── quotes.ts             # Kanye, Zen, Programming, Stoicism quotes
│   │   ├── facts.ts              # Random useless facts, fun facts
│   │   ├── dictionary.ts         # Free Dictionary API lookups
│   │   ├── colors.ts             # Colormind palette generation
│   │   ├── favicon.ts            # Icon Horse favicon fetcher
│   │   ├── github-stats.ts       # GitHub repo metadata enrichment
│   │   ├── openlibrary.ts        # Book detection and metadata
│   │   ├── poetry.ts             # PoetryDB semantic matching
│   │   ├── nasa-apod.ts          # NASA Astronomy Picture of the Day
│   │   ├── weather-fx.ts         # Weather-reactive visual effects
│   │   ├── bored.ts              # Bored API for empty states
│   │   ├── http-animals.ts       # HTTP Cat/Dog for error states
│   │   ├── emoji.ts              # EmojiHub contextual emoji assignment
│   │   ├── meme.ts               # Imgflip meme easter eggs
│   │   ├── qrcode.ts             # QR code generation for signals
│   │   └── rss.ts                # RSS feed subscription manager
│   └── ...existing modules
├── components/
│   ├── enrichment/
│   │   ├── QuoteDisplay.tsx       # Rotating quote component (loading, idle)
│   │   ├── FactStar.tsx           # Floating fact "shooting star" in 3D
│   │   ├── WeatherEffects.tsx     # Rain/snow/sun particle effects overlay
│   │   ├── NasaBackground.tsx     # Daily APOD background layer
│   │   ├── BoredSuggestion.tsx    # Empty state activity suggestion
│   │   ├── ErrorAnimal.tsx        # HTTP Cat/Dog error display
│   │   ├── BookCard.tsx           # Inline book reference card
│   │   ├── PoetryMatch.tsx        # Semantically matched poem display
│   │   ├── QRCodePanel.tsx        # QR code for signal URLs
│   │   └── MemePopup.tsx          # Rare meme easter egg on discard
│   └── ...existing components
```

### Plugin Interface

```typescript
// src/lib/enrichment/index.ts
interface EnrichmentPlugin {
  id: string;
  name: string;
  description: string;
  category: 'gamification' | 'aesthetics' | 'data' | 'ambient' | 'utility';
  enabled: boolean;                    // Toggle from settings
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  rateLimit?: { requests: number; perSeconds: number };
}

// Registry of all plugins — checked at runtime
const ENRICHMENT_PLUGINS: EnrichmentPlugin[] = [
  { id: 'quotes', name: 'Quotes Engine', category: 'gamification', enabled: true, requiresApiKey: false },
  { id: 'favicon', name: 'Site Favicons', category: 'data', enabled: true, requiresApiKey: false },
  // ... all others
];
```

### Database Addition — Enrichment Metadata

**DO NOT clutter the main `signals` table.** Add a dedicated table for enrichment data:

```sql
CREATE TABLE signal_enrichments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  enrichment_type TEXT NOT NULL,       -- 'favicon' | 'github_stats' | 'book_ref' | 'poem_match' | 'og_image' | 'emoji'
  data TEXT NOT NULL,                  -- JSON blob of enrichment-specific data
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                 -- Optional TTL for re-fetching stale data
  UNIQUE(signal_id, enrichment_type)
);

-- App-level enrichment cache (quotes, APOD, weather, etc.)
CREATE TABLE enrichment_cache (
  key TEXT PRIMARY KEY,                -- 'apod_today' | 'weather_current' | 'daily_palette'
  data TEXT NOT NULL,                  -- JSON blob
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
```

**Storage examples:**

```json
// signal_enrichments: favicon
{ "enrichment_type": "favicon", "data": "{\"url\":\"https://icon.horse/icon/github.com\",\"source\":\"github.com\"}" }

// signal_enrichments: github_stats
{ "enrichment_type": "github_stats", "data": "{\"stars\":4521,\"lastCommit\":\"2026-03-01\",\"language\":\"TypeScript\",\"isOutdated\":false}" }

// signal_enrichments: book_ref
{ "enrichment_type": "book_ref", "data": "{\"title\":\"Thinking Fast and Slow\",\"author\":\"Daniel Kahneman\",\"coverId\":\"8091016\",\"key\":\"/works/OL15042185W\"}" }

// signal_enrichments: poem_match
{ "enrichment_type": "poem_match", "data": "{\"title\":\"Invictus\",\"author\":\"William Ernest Henley\",\"lines\":[\"...\"],\"similarity\":0.73}" }

// enrichment_cache: apod_today
{ "key": "apod_today", "data": "{\"url\":\"https://apod.nasa.gov/...\",\"title\":\"Nebula X\",\"hdurl\":\"...\"}", "expires_at": "2026-03-13T00:00:00Z" }

// enrichment_cache: daily_palette
{ "key": "daily_palette", "data": "{\"colors\":[\"#1a1a2e\",\"#16213e\",\"#0f3460\",\"#e94560\",\"#533483\"]}", "expires_at": "2026-03-13T00:00:00Z" }
```

### Frontend vs Backend Decision Matrix

| Feature | Side | Reason |
|---------|------|--------|
| Quote fetching | **Backend** → cached | Rate limits, cache in enrichment_cache table |
| Favicon fetching | **Backend** → during capture pipeline | Store URL in signal_enrichments, serve to frontend |
| GitHub stats | **Backend** → during capture pipeline | Needs server-side fetch, may need API key |
| Colormind palette | **Backend** → daily cron/on-load | Cache palette in enrichment_cache, serve to frontend via CSS vars |
| NASA APOD | **Backend** → daily cache | One fetch/day, cache in enrichment_cache |
| Weather effects | **Backend** → fetch weather data | Frontend applies visual effects based on weather JSON |
| Dictionary lookups | **Frontend** → on-demand | User triggers in chat/detail panel, direct CORS-friendly API |
| Open Library | **Backend** → during capture analysis | AI detects book refs, backend fetches metadata |
| PoetryDB matching | **Backend** → pre-compute on embed | Match against cached poetry embeddings |
| Bored API | **Frontend** → on-demand | Triggered by button click, lightweight |
| HTTP Cat/Dog | **Frontend** → on error | Triggered by error states, just an image URL |
| QR Code | **Frontend** → on-demand | Generated client-side or via free API on click |
| Meme popup | **Frontend** → rare trigger | Random chance on discard action |
| RSS feeds | **Backend** → background job | Periodic polling, server-side scraping |
| EmojiHub | **Backend** → during capture | Assign emoji during AI analysis step |

---

## 2. API Reference — Every Integration Specified

### 2.1 QUOTES ENGINE (Gamification)

**APIs Used:**
- **Kanye.rest**: `GET https://api.kanye.rest` → `{ "quote": "..." }` — No auth, free, CORS enabled
- **Zen Quotes**: `GET https://zenquotes.io/api/random` → `[{ "q": "...", "a": "author" }]` — No auth, free
- **Programming Quotes**: `GET https://programming-quotesapi.vercel.app/api/random` — No auth, free
- **Stoicism Quotes**: `GET https://stoic.tekloon.net/stoic-quote` — No auth, free
- **Quotable**: `GET https://api.quotable.io/random` → `{ "content": "...", "author": "..." }` — No auth, free

**Where it shows:**
1. **Loading states** — While scraping + analyzing a new signal (3-8 seconds), display a rotating quote instead of a spinner. Cycle through providers randomly.
2. **3D Universe idle state** — When camera is auto-orbiting and user hasn't interacted for 30+ seconds, fade in a quote at the bottom of the viewport.
3. **Triage completion** — When all inbox items are triaged, show a congratulatory quote.
4. **Daily greeting** — On first load of the day, show a featured quote in the header area.

**Implementation:**
```typescript
// src/lib/enrichment/quotes.ts
const QUOTE_SOURCES = [
  { id: 'kanye', url: 'https://api.kanye.rest', parse: (d) => ({ text: d.quote, author: 'Kanye West', source: 'kanye' }) },
  { id: 'zen', url: 'https://zenquotes.io/api/random', parse: (d) => ({ text: d[0].q, author: d[0].a, source: 'zen' }) },
  { id: 'programming', url: 'https://programming-quotesapi.vercel.app/api/random', parse: (d) => ({ text: d.quote, author: d.author, source: 'programming' }) },
  { id: 'stoic', url: 'https://stoic.tekloon.net/stoic-quote', parse: (d) => ({ text: d.quote, author: d.author, source: 'stoic' }) },
];

async function getRandomQuote(preferredCategory?: string): Promise<Quote> {
  // If user has mostly philosophy signals, weight toward stoic/zen
  // If user has mostly coding signals, weight toward programming quotes
  // Otherwise random
}
```

**Cache strategy:** Fetch a batch of 10 quotes on app load, store in enrichment_cache with 1-hour TTL. Rotate through them client-side. Refetch when depleted.

**Semantic matching (BONUS):** Pre-embed a batch of quotes using Gemini. When showing a quote during signal loading, pick the quote whose embedding is closest to the signal being processed. A coding signal shows a programming quote. A philosophy signal shows a Stoic quote. This is the magic touch.

---

### 2.2 FAVICON & SOURCE LOGOS (Data Enrichment)

**APIs Used:**
- **Icon Horse**: `GET https://icon.horse/icon/{domain}` — No auth, free, returns image directly
- **Clearbit Logo (free tier)**: `GET https://logo.clearbit.com/{domain}` — No auth for basic usage
- **Google Favicon**: `GET https://www.google.com/s2/favicons?domain={domain}&sz=64` — No auth, free fallback

**Where it shows:**
- Signal cards (Grid View): Small 16px favicon next to the source label
- Signal nodes (3D Universe): Favicon texture mapped onto node surface (optional, performance-dependent)
- Detail panel: 32px favicon next to the source URL
- Triage cards: 24px favicon in the header

**Implementation:**
```typescript
// src/lib/enrichment/favicon.ts
// Called during the capture pipeline, AFTER scraping, BEFORE saving
async function fetchFavicon(url: string): Promise<string> {
  const domain = new URL(url).hostname;

  // Try Icon Horse first (best quality)
  const iconHorseUrl = `https://icon.horse/icon/${domain}`;

  // Fallback chain: Icon Horse → Clearbit → Google Favicon
  // Store the working URL in signal_enrichments
  return iconHorseUrl; // Store URL, don't download the image
}
```

**Integration point:** Add to the signal capture pipeline in `POST /api/signals`:
```
URL → Scrape → AI Analyze → Generate Embedding → Fetch Favicon → Save All
```

---

### 2.3 GITHUB REPO STATS (Data Enrichment)

**API Used:**
- **GitHub REST API**: `GET https://api.github.com/repos/{owner}/{repo}` — No auth for public repos (60 req/hr), with token (5000 req/hr)

**Where it shows:**
- Signal detail panel: Star count, fork count, primary language, last commit date
- **Outdated warning**: If `pushed_at` is older than 2 years, display a red "⚠ Possibly Outdated" badge
- Signal card: Small star count badge (like "★ 4.5k")

**Implementation:**
```typescript
// src/lib/enrichment/github-stats.ts
// Only triggered when source URL matches github.com/{owner}/{repo}
async function fetchGitHubStats(url: string): Promise<GitHubStats | null> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;

  const [, owner, repo] = match;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: process.env.GITHUB_TOKEN
      ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}
  });

  if (!response.ok) return null;
  const data = await response.json();

  const lastPush = new Date(data.pushed_at);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  return {
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    lastCommit: data.pushed_at,
    description: data.description,
    isOutdated: lastPush < twoYearsAgo,
    openIssues: data.open_issues_count,
  };
}
```

**Integration point:** Same capture pipeline, only for GitHub URLs. Store in signal_enrichments as `github_stats`.

---

### 2.4 COLORMIND PALETTE (Dynamic Aesthetics)

**API Used:**
- **Colormind**: `POST http://colormind.io/api/` with body `{"model":"default"}` — No auth, free

**Where it shows:**
1. **Daily accent refresh**: On first app load each day, fetch a new 5-color palette. Apply it as CSS variable overrides for the current session. The accent colors subtly shift each day, making the app feel fresh.
2. **Collection colors**: When creating a new collection, auto-generate a unique palette using Colormind.
3. **Signal node tinting (3D)**: Optionally tint node emissive colors using the daily palette instead of the fixed category colors.

**Implementation:**
```typescript
// src/lib/enrichment/colors.ts
async function generatePalette(seedColor?: [number, number, number]): Promise<string[]> {
  const body = seedColor
    ? { input: [seedColor, "N", "N", "N", "N"], model: "default" }
    : { model: "default" };

  const response = await fetch('http://colormind.io/api/', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const data = await response.json();
  // data.result = [[44,43,44],[90,83,82],...]
  return data.result.map(([r, g, b]) => `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
}
```

**Cache:** Store in enrichment_cache as `daily_palette`, TTL = midnight. Apply on load via CSS custom properties override.

**NOTE:** Colormind is HTTP only (not HTTPS). Call from the **backend** API route, not the browser.

---

### 2.5 NASA APOD BACKGROUND (Dynamic Aesthetics)

**API Used:**
- **NASA APOD**: `GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` — Free with DEMO_KEY (30 req/hr) or register for free API key (1000 req/hr)

**Where it shows:**
- 3D Universe background layer: Instead of pure #08080d black, show the APOD image at very low opacity (5-10%) as a subtle texture behind the star field. The universe literally has a different cosmic backdrop every day.
- Settings panel: Show today's APOD with title and explanation as a fun detail.

**Implementation:**
```typescript
// src/lib/enrichment/nasa-apod.ts
async function fetchAPOD(): Promise<APODData> {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY';
  const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}`);
  const data = await response.json();

  return {
    url: data.url,           // Regular resolution
    hdurl: data.hdurl,       // High resolution
    title: data.title,
    explanation: data.explanation,
    mediaType: data.media_type, // 'image' or 'video'
  };
}
```

**Cache:** Store in enrichment_cache as `apod_today`, TTL = midnight. Fetch once per day.

**Frontend:** In the `NexusScene.tsx`, add an optional background plane behind the star particles with the APOD image as a texture at very low opacity. Only use `media_type === 'image'` results; skip videos.

**Environment variable (ADD):**
```bash
NASA_API_KEY=DEMO_KEY  # Or register free at https://api.nasa.gov
```

---

### 2.6 WEATHER-REACTIVE EFFECTS (Dynamic Aesthetics)

**API Used:**
- **OpenWeatherMap**: `GET https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}` — Free tier: 1000 calls/day
- **Alternative (no key)**: `GET https://wttr.in/{location}?format=j1` — Free, no auth

**Where it shows:**
- 3D Universe: Particle effects overlay based on real weather conditions:
  - **Rain** → Soft blue particle streams falling through the scene
  - **Snow** → Gentle white particles drifting
  - **Clear/Sunny** → Warm golden ambient light boost, subtle lens flare
  - **Cloudy** → Slightly dimmed scene, fog density increase
  - **Thunderstorm** → Occasional bright flash (screen-space), subtle purple tint
- Status bar: Tiny weather icon + temp next to signal count

**Implementation:**
```typescript
// src/lib/enrichment/weather-fx.ts
interface WeatherState {
  condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'fog' | 'other';
  temp: number;
  icon: string;
  description: string;
}

// Use wttr.in as free fallback (no API key needed)
async function fetchWeather(lat?: number, lon?: number): Promise<WeatherState> {
  // If lat/lon provided, use OpenWeatherMap (needs key)
  // Otherwise, use wttr.in with IP-based geolocation
  const response = await fetch('https://wttr.in/?format=j1');
  const data = await response.json();
  // Parse and normalize to WeatherState
}
```

**Cache:** enrichment_cache as `weather_current`, TTL = 30 minutes.

**Frontend:** New `WeatherEffects.tsx` component renders as an overlay ABOVE the 3D canvas but BELOW the UI. Uses CSS animations or a lightweight particle system (not Three.js — keep it separate for performance).

**Environment variable (ADD — optional):**
```bash
OPENWEATHER_API_KEY=             # Optional, falls back to wttr.in
```

---

### 2.7 OPEN LIBRARY — BOOK ENRICHMENT (Data Enrichment)

**API Used:**
- **Open Library Search**: `GET https://openlibrary.org/search.json?q={title}&limit=1` — No auth, free
- **Open Library Covers**: `GET https://covers.openlibrary.org/b/id/{coverId}-M.jpg` — No auth, free

**Where it shows:**
- Signal detail panel: When AI analysis detects a book reference (title or author mention), show a rich `BookCard` with cover image, author, first publish year, and link to Open Library.
- Future "Books" collection: Auto-populated from detected book references across all signals.
- Related signals section: "Books mentioned in your signals" widget.

**Implementation:**
```typescript
// src/lib/enrichment/openlibrary.ts
// Called AFTER AI analysis, which extracts book titles/authors from content
async function fetchBookData(title: string, author?: string): Promise<BookData | null> {
  const query = author ? `${title} ${author}` : title;
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`
  );
  const data = await response.json();

  if (!data.docs?.length) return null;
  const book = data.docs[0];

  return {
    title: book.title,
    author: book.author_name?.[0],
    firstPublishYear: book.first_publish_year,
    coverId: book.cover_i,
    coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
    openLibraryKey: book.key,
    subjects: book.subject?.slice(0, 5),
  };
}
```

**AI prompt amendment:** Add to the summarization prompt in `src/lib/ai/prompts.ts`:
```
Also detect any book references (titles, authors) mentioned in the content. Add a field:
"bookReferences": [{"title": "Book Title", "author": "Author Name"}, ...] or empty array if none.
```

Store results in signal_enrichments as `book_ref`.

---

### 2.8 POETRYDB — SEMANTIC POETRY MATCHING (Ambient)

**API Used:**
- **PoetryDB**: `GET https://poetrydb.org/random/20` — No auth, free, CORS enabled

**Where it shows:**
- Detail panel for philosophy/lifestyle/learning signals: "A poem that resonates" section showing a semantically matched poem.
- 3D Universe: When hovering a philosophy-category node, a faint poetry excerpt floats nearby.

**Implementation:**
```typescript
// src/lib/enrichment/poetry.ts

// SETUP: On first run, fetch 200 random poems, embed them with Gemini, cache in DB
// This creates a "poetry embedding corpus" for matching

async function buildPoetryCorpus(): Promise<void> {
  // Fetch poems in batches of 20
  for (let i = 0; i < 10; i++) {
    const response = await fetch('https://poetrydb.org/random/20');
    const poems = await response.json();

    for (const poem of poems) {
      const text = `${poem.title} by ${poem.author}. ${poem.lines.join(' ')}`;
      const embedding = await embeddingProvider.embed(text);
      // Store poem + embedding in a dedicated table or enrichment_cache
    }
  }
}

// MATCH: Given a signal's embedding, find the closest poem
async function findMatchingPoem(signalEmbedding: number[]): Promise<PoemMatch | null> {
  // Load poem embeddings from cache
  // Compute cosine similarity
  // Return best match above threshold (0.5)
}
```

**One-time corpus build:** Run on first app startup (takes ~2 minutes for 200 poems with Gemini free tier). Cache permanently.

---

### 2.9 FREE DICTIONARY (Data Enrichment — On Demand)

**API Used:**
- **Free Dictionary API**: `GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}` — No auth, free, CORS enabled

**Where it shows:**
- AI Chat panel: When chatting about a signal, user can type `/define {word}` to get an inline definition card.
- Signal detail panel: Highlight unfamiliar terms (detected by AI during analysis) with dotted underlines. Hover/click for definition tooltip.
- Learning category signals: Auto-generate a "Key Terms" section with definitions.

**Implementation:** Frontend-only. Direct API call from the chat component when `/define` command is detected. Render as an inline card with phonetics, definitions, and part of speech.

---

### 2.10 BORED API (Gamification — Empty States)

**API Used:**
- **Bored API**: `GET https://www.boredapi.com/api/activity` — No auth, free

**Where it shows:**
- Empty inbox state: "Nothing to triage! Maybe try: {activity}" with a refresh button.
- Empty playground/Do Today queue: "Free time! How about: {activity}"
- 3D Universe: A "Surprise Me" floating action button that spawns a temporary glowing bubble with a random activity. The bubble fades after 30 seconds.
- Optional: The activity becomes a capturable signal — click "Save this idea" to make it permanent.

**Implementation:** Frontend-only. Fetch on empty state render. Show as a friendly illustrated card.

---

### 2.11 HTTP CAT / HTTP DOG (Gamification — Error States)

**APIs Used:**
- **HTTP Cat**: `https://http.cat/{statusCode}` — Returns cat image directly
- **HTTP Dog**: `https://http.dog/{statusCode}.jpg` — Returns dog image

**Where it shows:**
- ANY error toast/state in the app: Instead of a generic error message, show the relevant status code animal.
  - `429 Too Many Requests` → Cat looking exhausted (rate limited by Jina/AI)
  - `404 Not Found` → Dog looking confused (URL scrape failed)
  - `500 Internal Server Error` → Distressed cat (AI provider error)
  - `408 Timeout` → Sleeping dog (scrape timeout)
- User can toggle preference: Cats vs Dogs vs Random in Settings.

**Implementation:** Frontend-only. In the global error handler / toast system, detect HTTP status codes and inject the animal image into the toast component.

---

### 2.12 EMOJIHUB (Data Enrichment)

**API Used:**
- **EmojiHub**: `GET https://emojihub.yurace.pro/api/random/group/{group}` — No auth, free

**Where it shows:**
- Signal cards: Auto-assigned contextual emoji badge alongside the category icon.
- Tag pills: Emoji prefix on tags (e.g., "🔥 trending", "⚡ quick-tip").
- 3D node labels: Emoji floats above nodes on hover.

**Implementation:** During AI analysis, have the AI also suggest 1-2 relevant emojis. Store in signal metadata. EmojiHub serves as fallback/variety source.

---

### 2.13 IMGFLIP MEME (Gamification — Easter Egg)

**API Used:**
- **Imgflip**: `GET https://api.imgflip.com/get_memes` — No auth, free

**Where it shows:**
- **5% chance trigger**: When discarding a signal in Triage, there's a small random chance a meme pops up for 3 seconds. "You won't miss that one" energy.
- **Inbox Zero celebration**: When all signals are triaged, show a random triumphant meme.
- **Archive milestone**: "You just archived your 100th signal!" + meme.

**Implementation:** Frontend-only. Pre-fetch meme list on triage page load. Random trigger on discard action.

---

### 2.14 QR CODE (Utility)

**API Used:**
- **QR Code API**: `GET https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={url}` — No auth, free

**Where it shows:**
- Signal detail panel: Small QR icon button. Clicking it shows a QR code of the signal's source URL. Useful for quickly opening on mobile.
- Export: Include QR code in Obsidian export markdown (as image link).

**Implementation:** Frontend-only. Generate URL on demand when button clicked.

---

### 2.15 RSS FEED SUBSCRIPTIONS (Utility — V1.5 Feature)

**APIs/Approach:**
- **rss-to-json**: `GET https://api.rss2json.com/v1/api.json?rss_url={feedUrl}` — Free tier: 10,000 req/day
- **Alternative**: Parse RSS/Atom XML server-side with `rss-parser` npm package

**Where it shows:**
- Settings panel: "RSS Feeds" section where user can paste blog/newsletter RSS URLs.
- Background processing: Every 30 minutes (configurable), check subscribed feeds for new items.
- New items auto-enter the Inbox with status `inbox` for triage.
- Sidebar: RSS feed icon with unread count.

**Implementation:**
```sql
-- New table
CREATE TABLE rss_feeds (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  last_checked_at DATETIME,
  last_item_date DATETIME,            -- Track newest item seen
  check_interval_minutes INTEGER DEFAULT 30,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Backend:** API route `POST /api/rss/check` that iterates enabled feeds, fetches new items, and creates signals for each. Triggered by a client-side interval or cron-like mechanism.

---

## 3. Environment Variables (ALL ADDITIONS)

```bash
# ADD to .env.local alongside existing variables

# Enrichment API Keys (all optional — features degrade gracefully)
NASA_API_KEY=DEMO_KEY                  # Free at https://api.nasa.gov (DEMO_KEY = 30 req/hr)
OPENWEATHER_API_KEY=                   # Free at https://openweathermap.org (1000 req/day)
GITHUB_TOKEN=                          # Optional: raises GitHub API from 60 to 5000 req/hr

# Enrichment Toggles (override defaults — all default to true)
ENRICHMENT_QUOTES=true
ENRICHMENT_FAVICON=true
ENRICHMENT_GITHUB_STATS=true
ENRICHMENT_COLORMIND=true
ENRICHMENT_NASA_APOD=true
ENRICHMENT_WEATHER=false               # Default off — requires location consent
ENRICHMENT_OPEN_LIBRARY=true
ENRICHMENT_POETRY=true
ENRICHMENT_BORED=true
ENRICHMENT_HTTP_ANIMALS=true
ENRICHMENT_MEMES=true
ENRICHMENT_QR_CODE=true
ENRICHMENT_RSS=false                   # Default off — V1.5 feature
ENRICHMENT_DICTIONARY=true
ENRICHMENT_EMOJI=true
```

---

## 4. Phased Implementation Roadmap

### Phase 2A — Quick Wins (1-2 hours) — HIGH IMPACT, LOW EFFORT

These require zero API keys, no database changes beyond the two new tables, and can be wired into existing components with minimal refactoring.

| # | Feature | API | Effort | Notes |
|---|---------|-----|--------|-------|
| 1 | **Favicon on signals** | Icon Horse | 20 min | Add to capture pipeline, show in cards |
| 2 | **Quotes on loading** | Kanye.rest + Zen Quotes | 30 min | Replace spinner with QuoteDisplay component |
| 3 | **HTTP Cat/Dog errors** | http.cat / http.dog | 20 min | Swap into existing toast/error system |
| 4 | **Bored API empty states** | boredapi.com | 15 min | Add to existing empty state components |
| 5 | **QR code button** | qrserver.com | 15 min | Add button to detail panel |

**Prerequisites:** Create `signal_enrichments` and `enrichment_cache` tables.

### Phase 2B — Smart Data (2-3 hours) — HIGH IMPACT, MEDIUM EFFORT

These integrate into the AI analysis pipeline and add genuine intelligence.

| # | Feature | API | Effort | Notes |
|---|---------|-----|--------|-------|
| 6 | **GitHub repo stats** | GitHub API | 30 min | URL pattern match + fetch during capture |
| 7 | **Book detection + cards** | Open Library | 45 min | Amend AI prompt + fetch book metadata |
| 8 | **Free Dictionary** | dictionaryapi.dev | 30 min | `/define` command in chat + hover tooltips |
| 9 | **Emoji assignment** | EmojiHub + AI | 30 min | Add emoji field to AI analysis output |
| 10 | **Meme easter egg** | Imgflip | 20 min | Random trigger in triage discard flow |

### Phase 2C — Ambient Atmosphere (3-4 hours) — MEDIUM IMPACT, HIGHER EFFORT

These change how the app *feels* and require more frontend work.

| # | Feature | API | Effort | Notes |
|---|---------|-----|--------|-------|
| 11 | **Colormind daily palette** | Colormind | 45 min | Backend fetch + CSS var injection |
| 12 | **NASA APOD background** | NASA APOD | 45 min | Backend fetch + Three.js background texture |
| 13 | **Weather-reactive effects** | wttr.in / OpenWeather | 60 min | Backend fetch + CSS particle overlay |
| 14 | **Poetry matching** | PoetryDB + Gemini | 90 min | Build corpus + embedding matching |
| 15 | **Random fact shooting stars** | uselessfacts.jsph.pl | 45 min | Three.js floating text particles in universe |

### Phase 2D — Systems (2-3 hours) — UTILITY, FOUNDATION FOR V2

| # | Feature | API | Effort | Notes |
|---|---------|-----|--------|-------|
| 16 | **RSS feed subscriptions** | rss2json / rss-parser | 90 min | New DB table, background polling, inbox integration |
| 17 | **Enrichment settings panel** | None (internal) | 45 min | Toggle UI for all enrichment plugins |
| 18 | **Enrichment cache management** | None (internal) | 30 min | Cache invalidation, manual refresh, storage stats |

---

## 5. Capture Pipeline — Amended Flow

Original flow (from 05_EMBEDDING_AMENDMENT.md):
```
URL → Scrape → AI Analyze → Generate Embedding → Save → Recompute UMAP
```

New flow with enrichments:
```
URL → Scrape → AI Analyze (amended prompt) → Generate Embedding → Enrichment Pass → Save All → Recompute UMAP
                    ↓                                                    ↓
            Now also extracts:                                  Parallel fetches:
            - Book references                                   - Favicon (Icon Horse)
            - Suggested emoji                                   - GitHub stats (if GitHub URL)
            - Key terms for dictionary                          - Book metadata (if books detected)
                                                                - Poem match (if philosophy/learning)
```

The enrichment pass runs **in parallel** (Promise.allSettled) so a slow/failed enrichment never blocks the core capture. Each enrichment result is stored in `signal_enrichments` independently.

```typescript
// In POST /api/signals, after embedding generation:
const enrichmentResults = await Promise.allSettled([
  fetchFavicon(signal.url),
  isGitHubUrl(signal.url) ? fetchGitHubStats(signal.url) : null,
  signal.bookReferences?.length ? fetchBookData(signal.bookReferences[0]) : null,
  ['philosophy', 'learning', 'lifestyle'].includes(signal.category) ? findMatchingPoem(signal.embedding) : null,
]);

// Store whatever succeeded — ignore failures
for (const result of enrichmentResults) {
  if (result.status === 'fulfilled' && result.value) {
    await storeEnrichment(signal.id, result.value);
  }
}
```

---

## 6. Performance & Safety Considerations

### Rate Limits (Respect Them)

| API | Free Tier Limit | Our Expected Usage | Risk |
|-----|----------------|-------------------|------|
| Kanye.rest | Unlimited | ~20/day | None |
| Icon Horse | Unlimited | ~20/day | None |
| GitHub API | 60/hr (no token) | ~5-10/day | Low |
| Colormind | Unknown (generous) | 1/day | None |
| NASA APOD | 30/hr (DEMO_KEY) | 1/day | None |
| wttr.in | Unknown (generous) | 48/day (every 30min) | Low |
| Open Library | ~100/5min | ~5-10/day | None |
| PoetryDB | Unlimited | ~10 on first build | None |
| Free Dictionary | ~450/day | ~10-20/day | None |
| Bored API | Unlimited | ~5/day | None |
| Imgflip | Unlimited | 1 on page load | None |
| QR Server | Unlimited | ~5/day | None |

**Total new API calls per day for typical use: ~100-150. Well within all free tiers.**

### Graceful Degradation

Every enrichment MUST follow this pattern:
```typescript
try {
  const result = await fetchEnrichment(signal);
  if (result) await storeEnrichment(signal.id, type, result);
} catch (error) {
  console.warn(`Enrichment ${type} failed for signal ${signal.id}:`, error.message);
  // NEVER throw — NEVER block the capture pipeline
}
```

Frontend components that display enrichment data MUST handle `null` — show nothing if the enrichment doesn't exist. No broken UI.

### Storage Impact

| Data Type | Size per Signal | For 1000 Signals |
|-----------|----------------|-------------------|
| Favicon URL | ~100 bytes | ~100 KB |
| GitHub stats | ~200 bytes | ~50 KB (only GitHub URLs) |
| Book reference | ~300 bytes | ~30 KB (only signals with books) |
| Poem match | ~500 bytes | ~50 KB (only philosophy signals) |
| Daily palette | ~100 bytes | ~100 bytes (cached once) |
| APOD data | ~500 bytes | ~500 bytes (cached once) |
| Weather data | ~200 bytes | ~200 bytes (cached once) |
| **Total overhead** | | **~250 KB for 1000 signals** |

Negligible. SQLite handles this trivially.

---

## 7. Amended Settings Panel

Add a new section to Settings (from 03_UI_DESIGN.md Section 11):

```
ENRICHMENT PLUGINS
────────

  Gamification
    ☑ Loading quotes (Kanye, Zen, Programming)
    ☑ HTTP Cat/Dog error images
    ☑ Bored API empty states
    ☑ Meme easter eggs (5% chance on discard)
    Preferred error animal: [Cats ▼] / Dogs / Random

  Aesthetics
    ☑ Daily color palette (Colormind)
    ☑ NASA APOD background
    ☐ Weather-reactive effects
    Location for weather: [Auto-detect ▼] / Manual

  Data Enrichment
    ☑ Site favicons (Icon Horse)
    ☑ GitHub repo stats
    ☑ Book detection (Open Library)
    ☑ Contextual emoji
    ☑ Dictionary lookups

  Ambient
    ☑ Poetry matching (philosophy signals)
    ☐ Floating fact shooting stars

  Utility
    ☑ QR code generation
    ☐ RSS feed subscriptions [Configure →]

  Cache
    Enrichment data: 245 KB
    [Clear enrichment cache] [Refresh all enrichments]
```

---

## 8. Dependencies (ADD to package.json)

```bash
# No new npm dependencies required!
# All integrations use plain fetch() to free REST APIs.
# The only optional addition:
npm install rss-parser    # Only needed if RSS feature is enabled (Phase 2D)
```

This is a major advantage — zero dependency bloat. Everything is HTTP fetches with JSON parsing.

---

## 9. Summary of All Patches to Existing Docs

| Document | Section | Change |
|----------|---------|--------|
| `02_ARCHITECTURE.md` | Section 2 (Structure) | Add `src/lib/enrichment/` and `src/components/enrichment/` |
| `02_ARCHITECTURE.md` | Section 3 (Schema) | Add `signal_enrichments` and `enrichment_cache` tables, `rss_feeds` table |
| `02_ARCHITECTURE.md` | Section 8 (Env Vars) | Add NASA_API_KEY, OPENWEATHER_API_KEY, GITHUB_TOKEN, all ENRICHMENT_ toggles |
| `03_UI_DESIGN.md` | Section 6.3 (Detail Panel) | Add favicon display, GitHub stats badge, BookCard, PoetryMatch, QR button |
| `03_UI_DESIGN.md` | Section 5.1 (Universe) | Add APOD background layer, weather effects overlay, fact shooting stars |
| `03_UI_DESIGN.md` | Section 5.4 (Triage) | Add meme easter egg on discard, quote on completion |
| `03_UI_DESIGN.md` | Section 11 (Settings) | Add Enrichment Plugins section |
| `04_IMPLEMENTATION.md` | Phase 2 (API Routes) | Amend capture pipeline with enrichment pass |
| `04_IMPLEMENTATION.md` | Phase 7 (Polish) | Add Phase 2A-2D enrichment implementation |
| `05_EMBEDDING_AMENDMENT.md` | Section 5 (Capture Flow) | Add parallel enrichment fetches after embedding |
| `src/lib/ai/prompts.ts` | SUMMARIZE_PROMPT | Add bookReferences and suggestedEmoji extraction |

---

*This enrichment layer transforms Nexus from a knowledge management tool into a living, personalized environment. Every free API adds texture without adding dependency risk. The plugin architecture ensures nothing breaks if an API goes down — the core app is always rock solid, and the enrichments are delightful bonuses layered on top.*
