# Current State
Last updated: 2026-07-11

## What this is
The front door to raw/: capture links/thoughts from any device → AI enrich + project-brain
routing suggestion → one-tap confirm → `npm run pull` delivers into `<project>/memory/raw/`.
Deliberately small. No embeddings, no 3D, no chat (all of that was v1, deleted).

## Working now (verified in browser + acceptance 2026-07-11)
- Full loop end-to-end: capture → enrich → route → pull → raw/ file (real deliveries made
  into TRADERBOT and SecondBrainOS memory/raw/ during sign-off).
- `scripts/acceptance.mjs`: 48/48 pass (canonical behavioral contract; see file header).
- Capture screen `/`: autofocus, paste-and-go, Ctrl/⌘+Enter, optimistic card, live enrichment.
- Inbox `/inbox`: suggestion chip with reason, Route to X / Change project / Archive capture,
  spring exits, inbox-zero state.
- AI enrichment with runtime fallback chain (OpenRouter free 429s constantly → falls through
  to gpt-4o-mini). Enrich never 500s; failures degrade to `enrichStatus: 'failed'` + retry UI.
- Pull CLI `scripts/nexus-pull.mjs`: PROJECTS.md registry sync up, frontmatter raw files,
  collision suffixes, missing-path fallback to SecondBrainOS/memory/raw/.
- Sounds (cuelume): press/release on capture button, success on enrich, tick on route.
  Mute toggle persisted. First real-world test of the cuelume library.
- PWA manifest with share_target (GET → `/?text=`) for phone share sheets.

## In progress
- Nothing mid-flight. v2 rebuild shipped 2026-07-11.

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
1. **HUMAN: resume the paused Vercel project.** nexus-oz7q is PAUSED (prod 503s with
   `x-vercel-error: DEPLOYMENT_PAUSED`; pushed deployments sit in UNKNOWN and never build).
   Vercel dashboard → nexus-oz7q → resume, then the queued build should run (or redeploy).
   v2 is pushed (commits 2f09f82 + aa1b65c) and repo is CLI-linked (.vercel/, gitignored).
   Also: delete the second unused Vercel project `nexus` (builds fail, no env vars) and
   push SecondBrainOS (registration commit 02a9615 is local-only; push was permission-blocked).
2. Verify prod after resume: login gate (NEXUS_PASSWORD), capture from phone, then set
   NEXUS_URL + NEXUS_TOKEN (= NEXUS_PASSWORD) locally so `npm run pull` targets prod.
3. Use it for a week from phone + desktop; then decide on pull automation (open question 1).
