# NEXUS — UX Overhaul: Feed Redesign

> This replaces the current Grid view + Timeline view + right-side Detail Panel with a single unified Feed view. The feed is a vertical scrollable list of signal cards, grouped by date, with inline expand for details. No right panel.

---

## 1. What Changes

### REMOVE:
- Grid view (the 3-column card grid — overwhelming, too much info per card)
- Right-side Detail Panel (awkward to read, wastes screen real estate)
- Redundant category legend in Universe view (already in sidebar)

### REPLACE WITH:
- **Feed view** — single-column, centered, vertical scroll with date separators
- **Inline expand** — click a card to expand it in-place showing full details + actions + chat teaser
- Feed becomes the DEFAULT view (replaces Grid as the primary view)

### KEEP UNCHANGED:
- Universe view (3D) — separate view, fix navigation issues
- Triage view — separate view, works as-is
- Sidebar — categories, filters, stats (unchanged)
- All API routes — no backend changes needed

---

## 2. Feed Card Design — Collapsed State

Each card shows ONLY essential info. Minimal. Breathable.

```
┌────────────────────────────────────────────────────────────┐
│ ● [source icon]  Title of the signal                    2h │
│                                                            │
│ One-line summary that gives you just enough context to     │
│ know what this is without overwhelming...                  │
│                                                            │
│ #tag1  #tag2  #tag3                                        │
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- Left border: 3px solid, colored by CATEGORY (philosophy=#7b8aff, prompts=#ff6bff, coding=#00d4ff, etc.)
- Category dot: 6px circle matching category color
- Source icon: 20x20px — use actual logos/icons:
  - X/Twitter: X logo SVG
  - GitHub: GitHub octocat SVG
  - Brain dump: 🧠 emoji
  - Web: 🌐 globe
  - YouTube: ▶ play icon
  - Reddit: Reddit icon
  - Default: ◇ diamond
- Title: 14px, white, semi-bold, single line with ellipsis overflow
- Time: relative ("2h", "3d", "1w") — right-aligned, muted
- Summary: 13px, gray (#666), max 2 lines with line-clamp
- Tags: 10px monospace, very muted (#555), no background/border — just text

**What's NOT on the collapsed card:**
- No status badge (Inbox/Active/Starred) — that's what sidebar filters are for
- No "Brain dump" or "X/Twitter" text label — the icon tells you
- No content type label (article, prompt, tool) — unnecessary clutter
- No extracted content preview — save it for expanded state

---

## 3. Feed Card Design — Expanded State

Click a card → it expands in-place. Other cards stay visible above/below.

```
┌────────────────────────────────────────────────────────────┐
│ ● [source icon]  Title of the signal                    2h │
│                                                            │
│ Full summary text, no longer truncated. Can be multiple    │
│ lines now that we have the space.                          │
│                                                            │
│ #tag1  #tag2  #tag3  #tag4  #tag5                          │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ KEY TAKEAWAY                                               │
│ The most important insight from this signal, displayed     │
│ in the category accent color.                              │
│                                                            │
│ EXTRACTED CONTENT                                    Copy  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ The actual prompt/code/quote in a code-style block     │ │
│ │ with a left accent border and copy button              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ORIGINAL THOUGHT (for brain dumps)                         │
│ The full text of what the user typed...                    │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💬 Chat with AI about this signal...                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ★ Star   📦 Archive   ↻ Re-analyze   ↗ Export   🗑 Delete │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Expand animation:** Smooth height transition (300ms ease). Card gets a highlighted left border (brighter category color) and slightly darker background.

**Content sections (only show if data exists):**
1. Key takeaway — in category accent color
2. Extracted content — monospace block with left accent border + copy button
3. Original thought (brain dumps only) — the raw input text
4. "Chat with AI" teaser bar — click to open a chat modal or inline chat
5. Action buttons — Star, Archive, Re-analyze, Export, Delete

**Click again or press Esc** → card collapses back to minimal state.

---

## 4. Date Separators

Signals are grouped by date with thin separator lines:

```
─────── today ───────

[card]
[card]
[card]

─────── march 14 ───────

[card]
[card]

─────── march 13 ───────

[card]
```

- "today" and "yesterday" as relative labels
- Older dates as "march 14" (lowercase, minimal)
- Light horizontal rules (#1a1a2e) with date text centered
- Signal count badge optional: "march 14 · 3 signals"

---

## 5. Feed Layout

```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│ SIDEBAR  │            FEED (centered)               │
│          │                                          │
│ (240px)  │   max-width: 680px                       │
│          │   margin: 0 auto                         │
│          │   padding: 0 24px                        │
│          │                                          │
│          │   Scrollable, full height                │
│          │                                          │
│          │                                          │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Feed is centered in the main viewport with max-width ~680px
- Generous whitespace on left/right (like reading a blog post or X feed)
- Full viewport height, scrollable
- No right panel at all

---

## 6. Chat Interaction

When the user clicks "Chat with AI about this signal..." in an expanded card:

**Option A (simpler, recommended for now):** Open a modal/overlay chat panel
- Dark modal centered on screen
- Shows conversation history + input field
- Can be closed to return to feed
- Chat data persists (stored in DB as before)

**Option B (future):** Inline chat within the expanded card
- Chat messages appear below the card content
- Input field at the bottom
- Card grows taller to accommodate
- More integrated but more complex to implement

Start with Option A. It's cleaner and doesn't fight the feed scroll.

---

## 7. Sidebar Changes

### Remove:
- "Grid" from the VIEWS list (replaced by Feed)

### Rename:
- "Timeline" → remove (Feed IS the timeline now)

### Final VIEWS list:
```
VIEWS
  ◈ Feed          (default, the new unified view)
  ◈ Universe      (3D space)
  ≋ Triage (16)   (inbox processor)
```

Three views. That's it. Each does one thing well.

---

## 8. Source Icons

Replace text labels ("X/Twitter", "GitHub", "Web") with recognizable small icons.

Define in a utility file (e.g., src/lib/utils/sourceIcons.tsx):

```typescript
const SOURCE_ICONS = {
  'X/Twitter': XLogoSVG,         // The X logo, 12x12
  'GitHub': GitHubLogoSVG,       // Octocat, 12x12
  'YouTube': YouTubeIconSVG,     // Play triangle, 12x12
  'Reddit': RedditIconSVG,       // Reddit alien, 12x12
  'Medium': MediumIconSVG,       // M logo, 12x12
  'brain_dump': '🧠',            // Emoji for brain dumps
  'web': '🌐',                   // Emoji for generic web
  'default': '◇',                // Diamond for unknown
};
```

Icons should be 20x20px container with 12x12px icon centered, subtle dark background (#1a1a2e rounded).

---

## 9. Implementation Checklist

### Step 1: Create FeedView component
- [ ] New component: `src/components/feed/FeedView.tsx`
- [ ] Fetches all signals sorted by date (newest first)
- [ ] Groups signals by date
- [ ] Renders date separators between groups
- [ ] Max-width 680px, centered, scrollable

### Step 2: Create FeedCard component
- [ ] New component: `src/components/feed/FeedCard.tsx`
- [ ] Collapsed state: source icon, title, summary (2 lines), tags, time
- [ ] Left border colored by category
- [ ] Click to expand/collapse (local state)
- [ ] Hover: subtle background change

### Step 3: Create FeedCardExpanded section
- [ ] Within FeedCard, conditionally render expanded content
- [ ] Key takeaway (accent color)
- [ ] Extracted content block (monospace, copy button, left border)
- [ ] Original thought section (brain dumps only)
- [ ] Chat teaser bar
- [ ] Action buttons row (Star, Archive, Re-analyze, Export, Delete)
- [ ] Smooth height animation on expand/collapse

### Step 4: Source icons
- [ ] Create source icon components/utility
- [ ] X, GitHub, YouTube, Reddit, Medium, brain_dump, web, default
- [ ] Small (20x20 container), recognizable, muted colors

### Step 5: Update navigation
- [ ] Sidebar: Replace "Grid" and "Timeline" with "Feed"
- [ ] Make Feed the default view
- [ ] Remove Grid view component references
- [ ] Remove Timeline view component references  
- [ ] Keep the old components in codebase (don't delete) but remove from navigation

### Step 6: Remove right detail panel
- [ ] Remove or hide the right-side detail panel from the main layout
- [ ] The page.tsx layout becomes: sidebar + main viewport (no third column)
- [ ] Chat opens as a modal when triggered from expanded card

### Step 7: Chat modal
- [ ] Create a ChatModal component
- [ ] Dark overlay, centered panel, max-width 600px
- [ ] Shows conversation history + input
- [ ] Triggered from "Chat with AI" in expanded card
- [ ] Can be closed with X or Esc
- [ ] Persists chat to DB as before

---

## 10. Files to Change

| File | Change |
|------|--------|
| `src/components/feed/FeedView.tsx` | NEW — main feed component |
| `src/components/feed/FeedCard.tsx` | NEW — individual card with expand |
| `src/components/feed/DateSeparator.tsx` | NEW — date group header |
| `src/components/feed/ChatModal.tsx` | NEW — modal chat overlay |
| `src/lib/utils/sourceIcons.tsx` | NEW — source icon definitions |
| `src/app/page.tsx` | Remove right panel column, update default view |
| `src/components/layout/Sidebar.tsx` | Replace Grid/Timeline with Feed in nav |
| `src/stores/uiStore.ts` | Update viewMode options, default to 'feed' |
| Keep but don't delete: SignalCard.tsx, SignalDetail.tsx, timeline components |

---

## 11. What This Does NOT Cover (Future Sessions)

- Universe view fixes (navigation, recenter button, zoom limits) — separate prompt
- DeepCrawl integration for better scraping/images — separate investigation
- Bulk import progress feedback — separate prompt
- Triage view improvements — separate prompt
- 3D cube scroll effect — future experiment after feed is solid

---

*The goal: a feed that feels like scrolling X or a well-designed RSS reader — minimal, scannable, click to dive deeper. No information overload.*
