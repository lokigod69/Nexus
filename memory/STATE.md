# Current State
Last updated: 2026-07-12

## What this is
The front door to raw/: capture links/thoughts from any device → AI enrich + project-brain
routing suggestion → one-tap confirm → `npm run pull` delivers into `<project>/memory/raw/`.
Plus (v2.1) a Library over the full capture history and Ask Nexus, a one-shot AI Q&A scoped
to captures only. Still no embeddings, no 3D, no open-ended chat.

## Working now (verified via acceptance + Playwright screenshots 2026-07-12)
- LIVE at https://www.mynexus.lol (Vercel nexus-oz7q, login gate verified; user's domain
  via Porkbun, bare → www redirect).
- Full loop end-to-end: capture → enrich → route (multi-target) → pull → one raw/ file per
  target project.
- `scripts/acceptance.mjs`: 70/70 pass (canonical contract; see file header for the
  NEXUS_LOCAL_DB=1 requirement).
- Capture `/`: autofocus, paste-and-go, Ctrl/⌘+Enter, optimistic card, live enrichment with
  staggered "receive" animation, quick-route from the suggestion chip, compact multi-picker.
- Inbox `/inbox`: suggestion chip + reason, multi-select routing, archive, delete.
- Library `/library`: full history, instant SQL search (q= over title/summary/takeaway/tags/
  content), status chips, routed-to trails, delete + restore.
- Ask Nexus (`POST /api/ask`): SQL retrieval (no embeddings) + one completion → answer with
  grounded reference cards; 502 when AI unavailable, never fabricated. Verified with a real
  "where did X end up" question.
- Delete everywhere, inline morph confirm; delivered captures note the file stays on disk.
- AI runtime fallback chain (OpenRouter free 429s constantly → gpt-4o-mini); enrich never 500s.
- Pull CLI: registry sync up, multi-target writes, ack only after all targets written,
  missing-path fallback to SecondBrainOS/memory/raw/. `Pull Nexus.bat` on the user's desktop.
- cuelume sounds (3 moments + mute), PWA share_target, full reduced-motion support.

## In progress
- Nothing mid-flight. v2.3 shipped 2026-07-14.

## v2.3 additions (2026-07-14)
- Raw save: "AI enrich" toggle on the capture screen; off → saves verbatim with no AI
  (EnrichStatus 'skipped'), still routable, "Enrich with AI" button on the card to reverse it.
- Fixed the mobile model-picker dropdown clipping off the left edge (header reordered so the
  picker is rightmost; menu width capped to viewport).
- PROD project registry synced (was empty → 22 projects); the inbox picker now shows real
  brains. Picker shows a "run npm run pull" hint when the registry is empty.

## v2.2 addition (same day)
- Selectable enrichment model: DeepSeek V4 Flash + DeepSeek V4 Pro added to the registry
  (OpenRouter) alongside Gemma-free/gpt-4o-mini/Ollama. New `GET /api/models`. A header
  picker (next to mute) lets the user force one specific model per enrich call — single
  attempt, no silent fallback — for genuine A/B comparison; "Auto" (default) is unchanged.
  Verified live: forced DeepSeek V4 Flash on a real capture, resolved `done` with a clean
  title. Preference is a client-side localStorage value (`nexus-model`), not per-project.

## Known problems
- OpenRouter free-tier model (`gemma-4-26b:free`) 429s near-permanently; the chain falls back
  to paid gpt-4o-mini, so enrichment silently costs money. Fine at capture volumes.
- Cuelume sounds untested with real ears (verified wiring only); user should judge feel.
- PWA share-target requires installing the PWA on the phone; not yet tried on a real device.

## Open questions
- Should `brain-save` (or the Stop hook) run `npm run pull` automatically so deliveries
  arrive without a manual step?
- v1 data still sits in Turso (`signals` etc., untouched). Migrate the old signals into
  captures, export them, or drop them eventually?
- Nexus itself is now in PROJECTS.md — captures about Nexus can route to its own brain.

## Next actions
1. **HUMAN:** pick/confirm the NEXUS_PASSWORD value in Vercel (≥8 chars recommended over a
   4-digit PIN), then locally run `setx NEXUS_TOKEN "<that password>"` and reopen the
   terminal — after that `Pull Nexus.bat` / `npm run pull` targets prod with zero flags.
   (NEXUS_URL is already set locally to https://www.mynexus.lol. The NEXUS_URL/NEXUS_TOKEN
   entries the user added in VERCEL env are inert — harmless, deletable.)
2. **HUMAN:** install the PWA on the phone (Share → Add to Home Screen) and judge the
   sounds/feel by hand; delete the unused second Vercel project `nexus` in the dashboard.
3. Use it for a week; then decide on pull automation (open question 1) and whether Ask/
   Library need anything more.
