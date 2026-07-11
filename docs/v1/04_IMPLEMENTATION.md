# NEXUS — Implementation Guide

> Step-by-step build order optimized for a coding agent (Cursor, Windsurf, or Claude Code). Each phase produces a working, testable milestone.

---

## Build Philosophy

- **Each phase must be runnable and testable before moving to the next**
- **Start with data flow, then add UI polish** — ugly but working > pretty but broken
- **AI integration from Day 1** — the AI is the soul of this app, not a bolt-on
- **3D visualization is Phase 3** — get the data pipeline right first, then make it beautiful

---

## Phase 1: Foundation (Estimated: 2-4 hours)

### 1.1 Project Setup

```bash
npx create-next-app@latest nexus --typescript --tailwind --app --src-dir
cd nexus
npm install better-sqlite3 drizzle-orm @anthropic-ai/sdk openai zustand
npm install @react-three/fiber @react-three/drei three d3-force-3d
npm install react-markdown lucide-react date-fns react-hot-toast
npm install -D @types/better-sqlite3 @types/three drizzle-kit
```

### 1.2 Database Setup

1. Create `src/lib/db/schema.ts` with the Drizzle ORM schema matching the SQL definitions in `02_ARCHITECTURE.md` Section 3
2. Create `src/lib/db/index.ts` — singleton database connection:
   - Check if `./data/` directory exists, create if not
   - Initialize better-sqlite3 with `./data/nexus.db`
   - Enable WAL mode for better concurrent reads
   - Run migrations on startup
3. Create `drizzle.config.ts` pointing to the schema
4. Run `npx drizzle-kit generate` to create migration files
5. Create `src/lib/db/queries.ts` with basic CRUD functions:
   - `getAllSignals(filters)` — with category, status, search, sort, pagination
   - `getSignalById(id)` — single signal with tags
   - `createSignal(data)` — insert signal + tags
   - `updateSignal(id, data)` — partial update
   - `deleteSignal(id)` — cascade delete
   - `getConversation(signalId)` — get or create conversation + messages
   - `addMessage(conversationId, role, content)` — append message

**Test:** Run the app. SQLite file should be created at `./data/nexus.db`.

### 1.3 Environment & Configuration

1. Create `.env.local` with all variables from `02_ARCHITECTURE.md` Section 8
2. Create `.gitignore` entries: `data/`, `.env.local`, `exports/`
3. Create `src/lib/utils/categories.ts` — category definitions with ids, labels, icons, colors

### 1.4 AI Provider Layer

1. Create `src/lib/ai/provider.ts` — the `AIProvider` interface
2. Create `src/lib/ai/anthropic.ts`:
   - `summarize(content, url)` → calls Claude with summarization prompt, returns structured analysis
   - `chat(messages, systemContext)` → async generator that yields streamed tokens
3. Create `src/lib/ai/openai.ts` — same interface, OpenAI implementation
4. Create `src/lib/ai/prompts.ts` — system prompts for summarization and chat (exact prompts in `02_ARCHITECTURE.md` Section 5)
5. Create provider factory function that returns the correct provider based on settings

**Test:** Write a simple script or API route that calls `summarize()` with a test string and logs the result.

### 1.5 Scraper

1. Create `src/lib/scraper/jina.ts`:
   - `scrapeUrl(url)` → fetch `https://r.jina.ai/{url}`, return cleaned markdown + metadata
   - Handle errors gracefully (timeout, 404, rate limit)
   - Detect source from URL (X, GitHub, YouTube, etc.)
2. Create `src/lib/scraper/fallback.ts`:
   - Basic HTML fetch + Open Graph tag extraction for when Jina fails

**Test:** Call scraper with one of the example X URLs from the vision doc. Should return clean markdown content.

---

## Phase 2: API Routes & Core Pipeline (Estimated: 2-3 hours)

### 2.1 Signal CRUD API

Create these Next.js API routes:

1. **POST `/api/signals`** — The main capture flow:
   ```
   Receive URL → Check duplicate → Scrape with Jina → Analyze with AI → Save to DB → Return signal
   ```
   - Accept optional `note`, `category` override, `skipAnalysis` flag
   - For `skipAnalysis`: still scrape, but skip AI. Store raw content for later analysis.

2. **GET `/api/signals`** — List with filters (query params: status, category, search, sort, limit, offset)

3. **GET `/api/signals/[id]`** — Single signal with tags and conversation existence check

4. **PUT `/api/signals/[id]`** — Update any field (status, category, note, etc.)

5. **DELETE `/api/signals/[id]`** — Hard delete with cascade

**Test:** Use curl or a REST client:
```bash
# Capture a signal
curl -X POST http://localhost:3000/api/signals \
  -H "Content-Type: application/json" \
  -d '{"url": "https://x.com/underwoodxie96/status/2030225124029259904"}'

# List all signals
curl http://localhost:3000/api/signals

# Filter by category
curl "http://localhost:3000/api/signals?category=prompts"
```

### 2.2 Chat API

1. **POST `/api/signals/[id]/chat`** — Send a message, get AI response:
   - Load signal's `raw_scraped_content` as system context
   - Load existing conversation messages
   - Send to AI provider (streaming via SSE/ReadableStream)
   - Save both user message and AI response to DB
   - Return streamed response

2. **GET `/api/signals/[id]/chat`** — Get full conversation history

**Test:** Capture a signal first, then send a chat message about it. Verify the AI response references the signal's content.

### 2.3 Export API

1. **GET `/api/export`** — Export signals in various formats:
   - `?format=obsidian` → Generate `.md` files with YAML frontmatter. If `OBSIDIAN_VAULT_PATH` is set, write directly. Otherwise, return as downloadable zip.
   - `?format=json` → Full JSON export of all data
   - `?format=markdown` → Single formatted markdown document

### 2.4 Bulk Import

Extend POST `/api/signals` to accept an array of URLs:
```json
{
  "urls": ["https://...", "https://...", "https://..."],
  "skipAnalysis": true
}
```
Process sequentially with a 1-second delay between Jina calls to respect rate limits.

---

## Phase 3: Basic Frontend — Grid View (Estimated: 3-4 hours)

Build a functional (not yet beautiful) UI that exercises all API routes.

### 3.1 Layout Shell

1. `src/app/layout.tsx` — Dark theme, font imports (JetBrains Mono + Outfit from Google Fonts), Toaster component
2. `src/app/page.tsx` — Main page with three-panel layout (sidebar, main, detail)
3. `src/stores/signalStore.ts` — Zustand store:
   - `signals[]`, `selectedSignalId`, `filters`, `loading` states
   - Actions: `fetchSignals()`, `captureSignal(url)`, `updateSignal()`, `deleteSignal()`
4. `src/stores/uiStore.ts` — Zustand store:
   - `viewMode` ('universe' | 'grid' | 'timeline' | 'triage')
   - `detailPanelOpen`, `sidebarOpen`, `captureModalOpen`

### 3.2 Sidebar Component

Build `src/components/layout/Sidebar.tsx`:
- View mode switchers (Universe, Grid, Timeline, Triage)
- Category list with counts (fetched from signal data)
- Collection list (hardcoded for now, CRUD later)
- Stats summary
- Clicking a category updates the filter in signalStore

### 3.3 Header Component

Build `src/components/layout/Header.tsx`:
- Search input (updates signalStore.filters.search)
- "+ Add URL" button (opens capture modal)
- View mode toggles (icon buttons)
- Settings gear icon

### 3.4 Capture Flow

Build `src/components/capture/URLInput.tsx`:
- Modal with URL input, optional category select, optional note
- "Capture Signal" button triggers `captureSignal()` store action
- Progress states: idle → scraping → analyzing → captured
- Bulk import tab: textarea for multiple URLs, import button with progress

### 3.5 Grid View

Build `src/components/signals/SignalCard.tsx`:
- Card component showing: category icon + color, title, summary excerpt (2 lines), tags, age badge, status indicator
- Left border colored by category
- Click opens detail panel

Build the grid layout in the main viewport:
- CSS Grid, 1-3 columns depending on viewport width
- Cards sorted by current sort setting
- Category/status filter applied
- Search filter applied across title, summary, tags, notes

### 3.6 Detail Panel

Build `src/components/signals/SignalDetail.tsx`:
- Full signal information display
- Extracted content block with prominent "Copy" button
- Status toggle buttons (star, archive, delete)
- Note editor (click to edit, save on blur/enter)
- Category reassignment dropdown
- "Open Original" link
- "Export to Obsidian" button

### 3.7 AI Chat Panel

Build `src/components/chat/ChatPanel.tsx`:
- Integrated into the bottom of the detail panel
- Message history display
- Input field with send button
- AI provider toggle (Claude / OpenAI dropdown)
- Streaming response display (text appears word by word)
- Copy button on AI responses

**Milestone Test:** You should now be able to:
1. Paste a URL → get AI analysis → see it in grid
2. Click a card → see full details
3. Chat with AI about the signal
4. Star, archive, delete signals
5. Search and filter
6. Export to Obsidian

---

## Phase 4: 3D Universe (Estimated: 4-6 hours)

This is the centerpiece. Reference `03_UI_DESIGN.md` Section 5.1 and Section 7 for detailed specs.

### 4.1 Scene Foundation

Build `src/components/universe/NexusScene.tsx`:
- `<Canvas>` with dark background (#08080d)
- Orbit controls (zoom, rotate, pan)
- Ambient light + subtle point lights
- Background star particles (a `<Points>` component with 500 random positions)
- Performance: `frameloop="demand"` to save CPU when nothing moves

### 4.2 Force-Directed Graph

Create `src/lib/graph/physics.ts`:
- Initialize d3-force-3d simulation
- Forces:
  - `forceManyBody()` — gentle repulsion between all nodes (strength: -30)
  - `forceCenter()` — keep everything roughly centered
  - Custom category clustering force: each node pulls toward its category's center point
  - `forceLink()` — connect nodes that share 2+ tags
  - `forceCollide()` — prevent overlap (radius based on node size)
- Category centers arranged in a sphere: compute positions using fibonacci sphere distribution
- Simulation runs on signal data change, settles after ~300 ticks, then nodes gently float

### 4.3 Signal Nodes

Build `src/components/universe/SignalNode.tsx`:
- Mesh: `<icosahedronGeometry>` (more interesting than sphere)
- Material: `<meshStandardMaterial>` with emissive color matching category
- Emissive intensity tied to freshness (new = bright, old = dim)
- Scale tied to status (starred = 1.4, active = 1.0, archived = 0.6)
- Hover state: brighten + scale up slightly + show tooltip
- Click handler: dispatch `selectSignal(id)` + animate camera
- Optional: gentle floating animation (sin wave on Y position)

### 4.4 Edges

Build `src/components/universe/NodeEdge.tsx`:
- `<Line>` component from Drei connecting nodes with shared tags
- Color: blend of the two connected nodes' category colors
- Opacity: low by default (0.1), brightens when either node is hovered (0.5)
- Width: 1px base, 2px when highlighted

### 4.5 Cluster Labels

Build `src/components/universe/ClusterLabel.tsx`:
- Drei's `<Text>` component positioned at each category's cluster center
- Shows category name + icon
- Always faces camera (billboard mode)
- Semi-transparent, becomes more visible when that category is filtered

### 4.6 Camera Controller

Build `src/components/universe/CameraController.tsx`:
- Default: Slow auto-orbit (OrbitControls with autoRotate, slow speed)
- Fly-to animation: When a node is selected, smoothly move camera to position near it
  - Use `useFrame` to lerp camera position toward target
  - Duration: ~1 second
- Return-to-overview: When selection cleared, camera returns to default position
- Stop auto-orbit on mouse interaction, resume after 5s of inactivity

### 4.7 HUD Overlay

Build `src/components/universe/UniverseHUD.tsx`:
- Transparent HTML overlay on top of the Canvas
- Shows: category legend (color dots), active filter indicator, node count
- Minimap in corner (optional, nice-to-have): top-down 2D projection of node positions

### 4.8 Filter Integration

When a category filter is applied in the sidebar:
1. Non-matching nodes: set opacity to 0.1, scale to 0.3
2. Matching nodes: keep full visibility
3. Camera smoothly recenters on the matching cluster
4. Transition duration: 500ms

**Milestone Test:** You should now be able to:
1. See all signals as glowing 3D nodes in dark space
2. Orbit, zoom, pan the camera
3. Hover nodes to see tooltips
4. Click nodes to fly to them and open detail panel
5. See category clusters forming naturally
6. See connected nodes (shared tags) with edge lines
7. Filter by category → non-matching nodes fade

---

## Phase 5: Triage Interface (Estimated: 2-3 hours)

Build `src/app/triage/page.tsx` and supporting components.

### 5.1 Triage Stack

Build `src/components/triage/TriageStack.tsx`:
- Shows untriaged signals (status = 'inbox') one at a time
- Large centered card with: title, AI summary, extracted content, tags, source
- Three action buttons: Keep (green), Do Today (purple), Discard (red)
- Progress bar: "7 of 23 triaged"

### 5.2 Card Animations

- Card enters from bottom with slight bounce
- Keep: card flies left with green trail
- Do Today: card flies up with purple trail
- Discard: card flies right with red trail + fade
- Next card slides in immediately

### 5.3 Keyboard Support

- ← Arrow or `K`: Keep
- ↓ Arrow or `T`: Do Today
- → Arrow or `D`: Discard
- Space: Expand/collapse full content view

### 5.4 Batch Re-analyze

If signals were bulk-imported without AI analysis, the triage view should show a banner:
"15 signals need AI analysis. [Analyze All] [Analyze One-by-One]"

---

## Phase 6: Timeline View (Estimated: 1-2 hours)

Build a simple but functional timeline.

### 6.1 Timeline Layout

- Vertical scroll, grouped by date
- Date headers: "Today", "Yesterday", "March 10, 2026", etc.
- Under each date: horizontal row of signal cards (compact version)
- Empty dates are skipped
- Clicking a card opens detail panel

### 6.2 Visual Density Indicator

- Date headers show count badge: "March 10 (7 signals)"
- Optionally: a small heatmap bar showing activity density over the past 30 days

---

## Phase 7: Polish & Quality of Life (Estimated: 2-3 hours)

### 7.1 Command Palette

Build `src/components/layout/CommandPalette.tsx`:
- Triggered by Cmd+K
- Search across signals, or type commands (/add, /tag:, /cat:, /export)
- Recent signals shown by default
- Arrow keys to navigate, Enter to select

### 7.2 Keyboard Shortcuts

Implement global keyboard handler with all shortcuts from `03_UI_DESIGN.md` Section 9.

### 7.3 Toast Notifications

- Use react-hot-toast with dark theme styling
- Show on: capture success, delete, status change, export, error

### 7.4 Settings Panel

Build `src/components/layout/SettingsPanel.tsx`:
- AI provider configuration (keys are stored in .env, but display current provider)
- Runtime provider toggle (stored in DB settings table)
- Obsidian vault path configuration
- Database stats
- Backup/restore buttons
- Clear all data (with double confirmation)

### 7.5 Loading & Empty States

- Skeleton cards during data fetch
- Empty state illustrations for: no signals, no results, empty category
- Capture progress animation (shimmer bar)

### 7.6 Obsidian Export Polish

- "Export to Obsidian" button on individual signals
- "Export All" in settings
- If vault path is set: write files directly and show toast "Exported 5 signals to Obsidian"
- If no vault path: download as .zip file

---

## Phase 8: Advanced Features (Future)

These are NOT for V1 but documented for future reference:

### 8.1 Automated X Feed Scanning
- Twitter API v2 or scraping bookmarks
- Background job that checks periodically
- Auto-captures with status = 'inbox'

### 8.2 Multi-Signal Chat
- Select multiple signals
- AI receives all their content as context
- "Compare these three approaches" type conversations

### 8.3 Smart Suggestions
- Periodic background analysis: "You haven't looked at 5 coding signals from last week"
- Related signal suggestions when viewing one

### 8.4 X Post Drafting
- From any signal or conversation, "Draft X post about this"
- AI generates post draft based on your notes and takes
- Copy to clipboard

---

## Dependency Quick Reference

```json
{
  "dependencies": {
    "next": "^14",
    "@anthropic-ai/sdk": "latest",
    "openai": "latest",
    "better-sqlite3": "latest",
    "drizzle-orm": "latest",
    "@react-three/fiber": "^8",
    "@react-three/drei": "^9",
    "three": "^0.160",
    "d3-force-3d": "^4",
    "zustand": "^4",
    "react-markdown": "^9",
    "lucide-react": "latest",
    "date-fns": "^3",
    "react-hot-toast": "^2",
    "copy-to-clipboard": "^3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "latest",
    "@types/three": "latest",
    "drizzle-kit": "latest"
  }
}
```

---

## Coding Agent Instructions

When building this project, follow these principles:

1. **Build in order**: Phase 1 → Phase 7. Each phase builds on the last. Do NOT skip ahead to the 3D universe before the data pipeline works.

2. **Test after each sub-step**: Every section should produce something verifiable. Run the dev server, hit the API, check the database.

3. **Type everything**: Use TypeScript strictly. Define types in `src/types/index.ts` and import them everywhere.

4. **Error handling**: Every API route needs try/catch. Every fetch call needs error handling. Show user-friendly error toasts, log detailed errors to console.

5. **Streaming**: The chat API MUST stream responses. Use Next.js streaming patterns (ReadableStream). The frontend should display tokens as they arrive.

6. **State management**: Use Zustand for global state. Don't prop-drill. Components read from stores directly.

7. **Database writes**: Always use transactions for multi-table operations (e.g., creating a signal with tags).

8. **Responsive**: The app should be usable at 1024px+ width. Mobile is a nice-to-have, not a requirement.

9. **Dark theme**: Everything is dark. Use the CSS variables from `03_UI_DESIGN.md`. No light backgrounds anywhere.

10. **Performance**: The 3D scene should run at 60fps with 200 nodes. Use instancing if needed. Implement `frameloop="demand"` when nothing is animating.
