# NEXUS — UI/UX Design Specification

> A dark, minimal, cyberpunk-inflected interface that feels like navigating a personal knowledge universe.

---

## 1. Design Philosophy

- **Dark-first**: Background #08080d, no light mode for V1. This is a tool for night owls and deep workers.
- **Terminal meets cosmos**: JetBrains Mono for data, Outfit or Space Grotesk for headings. The UI should feel like a mission control dashboard for your mind.
- **Glow, not flash**: Use subtle luminance (glowing edges, soft radial gradients) rather than loud colors. The 3D universe should feel like floating through a constellation.
- **Information density when needed, breathing room when not**: The 3D view is spacious and exploratory. Detail panels are dense and functional.
- **Everything one click away**: No buried menus. Core actions are always visible.

---

## 2. Color System

```css
:root {
  /* Backgrounds */
  --bg-void: #08080d;          /* Deepest background, 3D scene */
  --bg-surface: #0d0d14;       /* Cards, panels */
  --bg-elevated: #12121e;      /* Hover states, modals */
  --bg-overlay: rgba(8,8,13,0.85);  /* Overlays on 3D scene */

  /* Borders */
  --border-subtle: #1a1a2e;
  --border-active: #2a2a4e;

  /* Text */
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --text-muted: #555;
  --text-ghost: #333;

  /* Accent Colors — one per category */
  --accent-primary: #00ffa3;     /* Main accent, fresh signals, CTAs */
  --accent-prompts: #ff6bff;     /* Prompts category — magenta */
  --accent-coding: #00d4ff;      /* Coding — cyan */
  --accent-ai-art: #a855f7;      /* AI Art — purple */
  --accent-video: #ff4444;       /* Video — red */
  --accent-tools: #ffa500;       /* Tools — orange */
  --accent-philosophy: #7b8aff;  /* Philosophy — indigo */
  --accent-music: #00ffcc;       /* Music — teal */
  --accent-lifestyle: #ffcc00;   /* Lifestyle — gold */
  --accent-learning: #4ade80;    /* Learning — green */
  --accent-other: #666;          /* Other — grey */

  /* Status Colors */
  --status-fresh: #00ffa3;
  --status-active: #7b8aff;
  --status-starred: #ffd700;
  --status-archived: #444;
  --status-playground: #ff6bff;

  /* Semantic */
  --danger: #ff4444;
  --success: #00ffa3;
  --warning: #ffd700;
}
```

---

## 3. Typography

```css
/* Data, labels, code, URLs, tags */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Headings, titles, UI elements */
font-family: 'Outfit', 'Space Grotesk', sans-serif;

/* Size scale */
--text-xs: 10px;    /* Tags, metadata */
--text-sm: 12px;    /* Labels, secondary info */
--text-base: 14px;  /* Body text, summaries */
--text-lg: 16px;    /* Card titles */
--text-xl: 20px;    /* Section headers */
--text-2xl: 28px;   /* Page titles */
```

---

## 4. Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER BAR                                              │
│  [☰] NEXUS    [🔍 Search...]   [+ Add URL]   [⚙]      │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│ SIDEBAR  │     MAIN VIEWPORT            │  DETAIL       │
│          │                              │  PANEL        │
│ Categories│  (3D Universe / Grid /       │  (Signal info │
│ Status    │   Timeline / Triage)         │   + AI Chat)  │
│ Collections│                             │               │
│ Stats     │                              │               │
│          │                              │               │
│          │                              │               │
│          │                              │               │
│          │                              │               │
├──────────┴──────────────────────────────┴───────────────┤
│  STATUS BAR: 142 signals · 12 fresh · Claude active     │
└─────────────────────────────────────────────────────────┘
```

- **Sidebar** (240px, collapsible): Navigation, filters, collections, stats
- **Main Viewport** (flex): 3D Universe, Grid View, Timeline, or Triage (switchable)
- **Detail Panel** (400px, slides in from right): Opens when a signal is selected. Contains full signal info + AI chat.

---

## 5. View Modes

### 5.1 Universe View (Default — 3D)

The hero feature. A Three.js scene showing all active signals as glowing spheres floating in dark space.

**Node Appearance:**
- Each signal is a sphere (icosahedron for visual interest)
- Size: Based on status — starred nodes are largest, fresh are medium, archived are smallest
- Color: Matches category accent color
- Glow: A `PointLight` or emissive material on each node. Brightness = freshness. New signals pulse gently. Week-old signals have a dim steady glow. Archived signals are barely visible.
- On hover: Node brightens, a tooltip shows title + category
- On click: Camera smoothly flies to the node, detail panel opens

**Clustering:**
- Use `d3-force-3d` to simulate physics
- Nodes in the same category attract each other (force toward cluster center)
- All nodes gently repel each other to prevent overlap
- Nodes with shared tags form visible edges (thin glowing lines)
- Category cluster centers are labeled with floating 3D text using Drei's `<Text>` component

**Camera:**
- Default: Orbital camera centered on the centroid of all nodes
- Auto-orbit: Slow, gentle rotation when idle (stops on mouse interaction)
- Fly-to: When clicking a node, camera smoothly animates to position in front of it
- Scroll-to-zoom, drag-to-orbit, right-drag-to-pan

**Background:**
- Deep black (#08080d) with a very subtle particle field (tiny dots, like distant stars)
- Optional: Subtle fog effect to create depth perception

**Performance:**
- Up to 200 nodes: Full sphere geometry per node
- 200-500: Switch to `<Instance>` for instanced rendering
- 500+: LOD system — distant nodes become `<Points>` particles

### 5.2 Grid View (List Fallback)

A traditional card grid for when you want to scan quickly.

- Cards arranged in a masonry or column layout
- Each card shows: category icon, title, summary excerpt, tags, age, status badge
- Left border colored by category
- Freshness glow on new cards
- Click to open detail panel
- Drag-to-reorder within a category (optional)

### 5.3 Timeline View

A vertical timeline sorted by date.

- Grouped by day: "March 12, 2026", "March 11, 2026", etc.
- Each day shows signal cards in a horizontal scroll or stacked list
- Visual density shows at a glance: "I saved a lot on March 10" (tall section) vs "nothing on March 8" (empty)
- Good for the "what did I find recently?" question

### 5.4 Triage View

The rapid-fire inbox processor.

- Full-screen, one signal at a time
- Large card in center showing: title, AI summary, extracted content preview, tags
- Three large buttons at the bottom:
  - **Keep** (green, left — or swipe left) → Status: active, enters vault
  - **Do Today** (purple, center) → Status: playground, enters short-term queue
  - **Discard** (red, right — or swipe right) → Deleted
- Keyboard shortcuts: ← Keep, ↓ Do Today, → Discard
- Progress bar at top: "7 of 23 signals triaged"
- Animation: Card flies off screen in the direction of the action

---

## 6. Component Specifications

### 6.1 Header Bar

```
[☰]  ◈ NEXUS          [🔍 Search signals...]     [+ Add URL]  [◈ 🗂️ 📅 ▦]  [⚙]
 │                          │                          │         │              │
 │                          │                          │         │              └─ Settings
 │                          │                          │         └─ View toggles
 │                          │                          └─ Opens URL input (Cmd+N)
 │                          └─ Global search (Cmd+K)
 └─ Toggle sidebar
```

- Search is a command palette: type to search signals, or prefix with commands:
  - `/tag:midjourney` — filter by tag
  - `/cat:prompts` — filter by category
  - `/status:starred` — filter by status
  - `/add https://...` — quick add URL

### 6.2 Sidebar

```
╔══════════════════════╗
║  ◈ NEXUS             ║
╠══════════════════════╣
║                      ║
║  VIEWS               ║
║  ◈ Universe          ║
║  ▦ Grid              ║
║  📅 Timeline         ║
║  📥 Inbox (7)        ║
║  ⚡ Playground (3)   ║
║                      ║
╠══════════════════════╣
║                      ║
║  CATEGORIES          ║
║  ✦ Prompts     12    ║
║  ⟨⟩ Coding      8    ║
║  ◐ AI Art       5    ║
║  ▶ Video        3    ║
║  ⚙ Tools        6    ║
║  ∞ Philosophy   4    ║
║  ♫ Music        2    ║
║  ◉ Lifestyle    3    ║
║  📚 Learning    5    ║
║  ◇ Other        2    ║
║                      ║
╠══════════════════════╣
║                      ║
║  COLLECTIONS         ║
║  + New collection    ║
║  💎 Gold Nuggets  8  ║
║  🔬 Deep Dives    3  ║
║  🎯 This Week     5  ║
║                      ║
╠══════════════════════╣
║                      ║
║  STATS               ║
║  142 total signals   ║
║   12 fresh today     ║
║    8 starred gems    ║
║   23 conversations   ║
║                      ║
║  [Export All ↓]      ║
║  [Settings ⚙]       ║
╚══════════════════════╝
```

- Category counts update in real-time
- Clicking a category filters the main viewport (both 3D and grid views)
- Inbox badge glows when there are untriaged signals
- Collections can be created, renamed, deleted; signals can belong to multiple collections

### 6.3 Detail Panel (Right Side)

Slides in from the right when a signal is selected. 400px wide. Two sections: Signal Info (top) and AI Chat (bottom, expandable).

```
╔════════════════════════════════════╗
║  [← Back]              [★] [◫] [🗑]║
╠════════════════════════════════════╣
║                                    ║
║  ✦ PROMPTS · tutorial              ║
║  ─────────────────────             ║
║  Nano Banana Pro Cinematic         ║
║  Grid Prompts                      ║
║                                    ║
║  Source: X/Twitter · 2d ago        ║
║  Status: ★ Starred                 ║
║                                    ║
║  SUMMARY                           ║
║  Technique for generating          ║
║  cinematic grid frames from...     ║
║                                    ║
║  KEY TAKEAWAY                      ║
║  Updated prompt setup expands      ║
║  keyframes based on same scene...  ║
║                                    ║
║  EXTRACTED CONTENT          [Copy] ║
║  ┌─────────────────────────────┐   ║
║  │ Keep the subject's facial   │   ║
║  │ features and outfit from... │   ║
║  └─────────────────────────────┘   ║
║                                    ║
║  TAGS                              ║
║  #nano-banana #cinematic #prompts  ║
║                                    ║
║  MY NOTES                   [Edit] ║
║  Great technique for album covers  ║
║                                    ║
║  [Open Original ↗] [Export to Obs] ║
║                                    ║
╠════════════════════════════════════╣
║  AI CHAT              [Claude ▼]   ║
║  ───────────────────               ║
║  💬 You: How could I adapt this    ║
║     for album cover art?           ║
║                                    ║
║  🤖 Claude: Here are three ways... ║
║                                    ║
║  💬 You: Make it more cyberpunk    ║
║                                    ║
║  🤖 Claude: ...                    ║
║                                    ║
║  ┌──────────────────────┐  [Send]  ║
║  │ Ask about this signal│          ║
║  └──────────────────────┘          ║
╚════════════════════════════════════╝
```

**Key interactions:**
- ★ toggles starred status
- ◫ archives the signal
- 🗑 deletes (with confirmation)
- Copy button on extracted content = one-click clipboard
- AI provider dropdown (Claude ▼ / OpenAI ▼) switches in real-time
- Chat messages stream in word-by-word
- Entire panel is scrollable; chat section expands to fill available space

### 6.4 URL Input / Capture Flow

When the user clicks "+ Add URL" or presses Cmd+N:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│  CAPTURE NEW SIGNAL                               │
│                                                   │
│  ┌─────────────────────────────────────────┐     │
│  │ https://x.com/underwoodxie96/status/... │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│  Category: [Auto-detect ▼]  │  [+ Bulk Import]   │
│                                                   │
│  Note (optional):                                 │
│  ┌─────────────────────────────────────────┐     │
│  │ Cool prompting technique for grids      │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│            [Cancel]   [◈ Capture Signal]          │
│                                                   │
└─────────────────────────────────────────────────┘
```

After clicking "Capture Signal":
1. Input area shows a subtle shimmer animation
2. Status text appears: "Scraping content..." → "Analyzing with Claude..." → "Captured!"
3. The new signal appears in the 3D universe with a brief "birth" animation (scale from 0 to 1 with a flash)
4. If in grid view, card slides in at the top

**Bulk Import Modal:**
```
┌─────────────────────────────────────────────────┐
│                                                   │
│  BULK IMPORT                                      │
│                                                   │
│  Paste URLs (one per line):                       │
│  ┌─────────────────────────────────────────┐     │
│  │ https://x.com/...                       │     │
│  │ https://github.com/...                  │     │
│  │ https://medium.com/...                  │     │
│  │                                         │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│  23 URLs detected                                 │
│  ☐ Run AI analysis (slower, ~5s each)            │
│  ☑ Quick capture (fast, analyze later)            │
│                                                   │
│  ████████████░░░░░░░░  12/23 captured             │
│                                                   │
│            [Cancel]   [Import All]                 │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 7. 3D Universe — Visual Reference

### Node States

| State | Size | Glow Intensity | Pulse | Opacity |
|-------|------|----------------|-------|---------|
| Fresh (< 24h) | 1.2x | High | Gentle pulse | 100% |
| Active | 1.0x | Medium | None | 100% |
| Starred | 1.4x | High | Slow warm pulse | 100% |
| Playground | 1.0x | Medium-high | Quick pulse | 100% |
| Reviewed | 0.9x | Low | None | 80% |
| Archived | 0.6x | Minimal | None | 40% |

### Cluster Layout

Categories form loose clusters in 3D space. Think of it as a galaxy with distinct nebulae:
- Each category has a gravitational center
- Centers are spread out in a rough sphere arrangement
- A floating translucent label identifies each cluster
- When filtering by category, non-matching nodes fade to 10% opacity and the camera orbits the selected cluster

### Edge Connections

Signals with 2+ shared tags form a visible connection:
- Thin glowing line (category color, low opacity)
- Line thickness increases with number of shared tags
- On hover of a node: only that node's connections brighten; others fade

### Interaction Flow

1. **Idle**: Camera slowly auto-orbits. All nodes gently float with subtle Brownian motion.
2. **Mouse enter scene**: Auto-orbit stops. User has control.
3. **Hover node**: Node brightens. Tooltip appears (title, category, age). Connected edges highlight.
4. **Click node**: Camera smoothly flies to node. Detail panel slides open. Other nodes dim.
5. **Click empty space / press Esc**: Camera returns to default orbit. Detail panel closes. All nodes return to normal.
6. **Filter applied** (sidebar category click): Non-matching nodes fade to ghost opacity. Camera focuses on remaining cluster.

---

## 8. Animations & Micro-interactions

- **Signal captured**: New node spawns with scale 0→1 + bright flash that fades
- **Signal deleted**: Node shrinks to 0 with red flash, then removed from scene
- **Signal starred**: Brief golden particle burst around node
- **Status change**: Smooth size/glow transition (300ms ease)
- **Panel slide**: Detail panel slides from right with spring physics (not linear)
- **Triage swipe**: Card accelerates off-screen in swipe direction
- **Chat message**: Typing indicator dots, then text streams in character-by-character
- **Toast notifications**: Slide down from top-right, auto-dismiss after 3s
- **View switch**: Crossfade between Universe/Grid/Timeline (300ms)

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | Open URL capture |
| Cmd+K | Open search / command palette |
| Cmd+1 | Switch to Universe view |
| Cmd+2 | Switch to Grid view |
| Cmd+3 | Switch to Timeline view |
| Cmd+4 | Switch to Triage view |
| Esc | Close panel / deselect node |
| ← / → | Navigate between signals (in grid/timeline) |
| S | Star selected signal |
| A | Archive selected signal |
| D | Delete selected signal (with confirm) |
| E | Edit note on selected signal |
| C | Open chat for selected signal |
| Cmd+Shift+E | Export selected to Obsidian |

---

## 10. Responsive Behavior

This is primarily a desktop application (local dev server), but basic mobile support is nice to have:

- **< 768px**: Sidebar collapses to hamburger. 3D view is touch-enabled. Detail panel becomes full-screen overlay.
- **768-1200px**: Sidebar collapsible. Grid view in 2 columns.
- **> 1200px**: Full layout as described. Grid view in 3-4 columns.

---

## 11. Settings Panel

Accessible via ⚙ icon. Slides in as an overlay.

```
SETTINGS
────────

AI Configuration
  Provider: [Claude ▼] / [OpenAI ▼]
  Fast model: [claude-3-5-haiku ▼]
  Deep model: [claude-sonnet-4 ▼]
  API Key (Anthropic): [••••••••••] [Show]
  API Key (OpenAI): [••••••••••] [Show]

Storage
  Database: ./data/nexus.db (2.3 MB)
  Signals: 142 · Conversations: 23

Export
  Obsidian vault path: [/path/to/vault ▼] [Browse]
  [Export All to Obsidian]
  [Export All to JSON]
  [Export All to Markdown]

Data Management
  [Backup Database]
  [Restore from Backup]
  [⚠ Clear All Data]

About
  Nexus v1.0.0
  Local-first knowledge reactor
```
