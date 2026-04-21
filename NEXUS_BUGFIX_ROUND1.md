# Bug Fix Round — Post Brain Dump Testing

> These are bugs found during testing. Fix them all in one pass. Test each fix before moving to the next.

## Bug 1: Grid view shows "no signals" despite 6 signals existing

The grid view shows "No signals yet" but the Inbox quick filter shows 6 signals. The grid is likely filtering to only show signals with status 'active' or 'triaged', excluding 'inbox' signals.

**Fix:** The default grid view (with no filters applied) should show ALL signals regardless of status. The Quick Filters (Inbox, Playground) narrow the view, but the base Grid/Timeline views should display everything. Check the signal fetching logic in the grid view component and the GET /api/signals route — if there's a default status filter being applied, remove it so all signals show by default.

## Bug 2: Category counts in sidebar all show 0

The sidebar category list (Prompts 0, Coding 0, Philosophy 0, etc.) shows zero counts even though signals exist with those categories assigned. This is likely the same filtering issue as Bug 1 — the category counts query is excluding inbox-status signals.

**Fix:** Category counts should count ALL signals (inbox, active, triaged, starred, playground — everything except archived and deleted). Check wherever category counts are computed — likely in the sidebar component or the signal store — and ensure the count query includes inbox signals.

## Bug 3: Timeline view shows no signals

Same root cause as Bugs 1 and 2 — the timeline query is filtering out inbox signals.

**Fix:** Same as Bug 1. Timeline should show all non-archived signals by default.

## Bug 4: Universe view broken — white canvas with only a triangle visible

The universe view shows "6 nodes" in the top right but renders only a small triangle shape. The canvas is mostly white/empty. Cannot orbit, zoom, or interact with nodes. OrbitControls may not be initializing.

**Investigate and fix:**
- Check if OrbitControls are properly attached to the canvas
- Check if the camera position is too far away or facing the wrong direction (the triangle might be 6 tiny nodes clustered together viewed from very far away)
- Check if the UMAP positions are valid numbers (not NaN or all zeros) — run a quick DB query to check: `SELECT id, pos_x, pos_y, pos_z FROM signals LIMIT 10`
- If positions are all clustered in a tiny range (like 0.001 to 0.003), the scale factor in UMAP computation may be too small — the nodes exist but are microscopic
- Check if the Three.js scene background is set correctly (#08080d, not white)
- Make sure the Canvas component has proper sizing (width: 100%, height: 100% of its container)
- Check console for any Three.js or React Three Fiber errors

**Common fix:** If UMAP positions are too tightly clustered, increase the scale multiplier in the UMAP position computation (e.g., multiply by 100 instead of 50). Or add a normalization step that spreads positions across a -50 to +50 range regardless of raw UMAP output.

## Bug 5: Missing tooltips on detail panel action buttons

The star (★), archive (◫), and delete (🗑) buttons in the signal detail panel header have no tooltips. Users don't know what each icon does.

**Fix:** Add `title` attributes to each button:
- Star button: `title="Star this signal"` (or "Unstar" if already starred)
- Archive button: `title="Archive this signal"`
- Delete button: `title="Delete this signal"`
- Re-analyze button: `title="Re-analyze with AI"`
- Back arrow: `title="Close detail panel"`

## Bug 6: Missing pointer cursor on clickable elements

The hamburger menu (☰), settings gear (⚙), and modal close buttons don't show a pointer cursor on hover. Makes them feel unclickable.

**Fix:** Add `cursor: pointer` to these elements. Do a quick audit of ALL clickable elements (buttons, icons, sidebar items, card components) and ensure they all have `cursor: pointer`. This is likely a global fix — check if there's a Tailwind class like `cursor-pointer` that should be on all interactive elements. Key places to check:
- Hamburger menu toggle button
- Settings gear icon
- Modal/panel close (×) buttons  
- Sidebar view items (Universe, Grid, Timeline, Triage)
- Sidebar category items
- Any icon-only buttons throughout the app

## Bug 7: Start.bat needs updating

The start.bat file needs to launch the correct build on the correct port. Create or update start.bat in the project root:

```bat
@echo off
echo Starting Nexus (Claude Build)...
echo.
cd /d "%~dp0"
call npm run dev -- -p 3001
```

If start.bat doesn't exist, create it. If it exists, update the port and path as needed.

---

## Priority order

Fix Bugs 1-3 first (they're the same root cause — status filtering). Then Bug 4 (universe). Then 5-7 (polish). Test the grid view after fixing the filter — all 6 signals should appear.
