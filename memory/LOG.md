# Session Log
Newest first. Append-only at the top; roll old halves into archive/ past ~300 lines.

## 2026-07-12 — v2.2: selectable enrichment model (DeepSeek V4 Flash/Pro)
- User set the real Vercel password to `nexus6969`; local NEXUS_TOKEN updated via setx to match.
- Added DeepSeek V4 Flash + DeepSeek V4 Pro (OpenRouter) to the model registry, alongside
  the existing Ollama/Gemma-free/gpt-4o-mini entries. New `GET /api/models` (credential-gated,
  public-safe shape). `POST .../enrich` now takes optional `{modelId}`; when given, tries
  ONLY that model — single attempt, no fallback masking — so a real A/B test reflects that
  model's actual behavior. Header gained a `ModelPicker` (next to mute) listing "Auto" +
  live registry; preference persists client-side in localStorage, not a server setting.
- Implemented directly (no subagents — small, well-understood, single-session change).
  Verified live: GET /api/models lists all 4 models; forced `deepseek-v4-flash` on a real
  URL capture, resolved `enrichStatus: 'done'` with a correct title in one call.
- Acceptance extended to 75 checks (added GET /api/models + forced-model enrich), ALL PASS.
  `npx tsc --noEmit` clean, `npm run build` clean.
- Open: user still wants to try GLM 5.2 / compare quality across models in real use before
  settling; xAI/X scraping needs a paid API tier the user doesn't have yet (Firecrawl/Jina
  hit X's block wall) — flagged, not solved this session.

## 2026-07-12 — v2.1 shipped: Library, Ask Nexus, multi-route, delete, premium design pass
- v2.0 confirmed live on prod first: user bought **mynexus.lol**, resumed the paused Vercel
  project, domain wired (www redirect + login gate verified). SecondBrainOS registration pushed.
  `Pull Nexus.bat` desktop shortcut created (user chose it over a scheduled task); NEXUS_URL
  set via setx; user still needs `setx NEXUS_TOKEN "<password>"` once they choose one.
- v2.1 built the same way as v2.0: contract first (acceptance.mjs rewritten → 70 checks;
  types: Capture.projects string[], PullItem.targets, Ask shapes; SPEC addendum), then two
  parallel subagents (backend / frontend), then a third design-polish subagent running
  emil-design-eng + apple-design, then architect verification. Zero functional rework again.
- Features: DELETE surfaced everywhere (inline morph confirm; delivered-file caveat copy);
  multi-project routing (multi-select picker, one raw file per target, ack after all written);
  quick-route from the capture screen (suggestion chip is now a button); /library (full
  history, 200ms-debounced SQL search, status chips, restore); POST /api/ask (SQL retrieval
  recent-15 ∪ keyword LIKE capped 30 → one completion with fallback chain → answer +
  grounded references; 502 on AI failure, never fabricated).
- PROD-CRITICAL migration verified by self-test: v2.0-shaped DB with `project` TEXT rows →
  ALTER ADD `projects` + json_array backfill; legacy column kept; idempotent.
- Design pass highlights: staggered "receive" animation when enrichment lands; width-morphing
  delete confirm; layoutId sliding tab pill; caret/tap-highlight/scrollbar dark-theme details;
  fixed a global :focus-visible border-radius bug; 375px overflow hardening (break-words,
  2-line clamp). Constraints held (one accent, cuelume unchanged, reduced-motion intact).
- Verified: build clean (new routes /library + /api/ask), acceptance 70/70 re-run twice by
  architect (before + after design pass), Ask answered a real "where did X end up" correctly,
  Playwright screenshots at 1440 + 375 reviewed (chrome-devtools MCP was down this session).
- Open: user still hasn't judged the sounds/feel by hand on prod; NEXUS_TOKEN setx pending.

## 2026-07-11 — v2 rebuild: Nexus becomes the Second Brain capture layer (+ brain installed)
- Executed the SecondBrainOS/PHASE2.md verdict: tore v1 (~16k LOC: 3D universe, embeddings/UMAP,
  triage, timeline, per-signal chat, conductor, enrichment plugins, exports) down to a skeleton;
  v1 design docs moved to docs/v1/.
- Architect (main session) wrote the contract first: scripts/acceptance.mjs (canonical),
  src/types/index.ts, docs/SPEC.md incl. binding design contract. Implementation delegated to
  two parallel subagents (backend+CLI / frontend) with hard file boundaries — both returned
  clean; zero functional rework needed.
- Architect fixes during sign-off: scraper null→undefined type mismatches (my contract change),
  runtime AI fallback chain (OpenRouter free model 429s constantly — without the chain, default
  config failed every enrichment), em-dash copy polish in the two empty states.
- Verified: `npm run build` clean; acceptance 48/48 re-run in architect env; full loop driven
  in a real browser — captured a URL and a thought, AI suggested TRADERBOT for the freqtrade
  idea (correct), routed both, `npm run pull` wrote real files into
  D:\CODING\TRADERBOT\memory\raw\ and D:\CODING\SecondBrainOS\memory\raw\. Console clean.
- New deps: cuelume (first real-world test of the library), motion. Removed: three/R3F stack,
  umap-js, @google/genai, @anthropic-ai/sdk, react-markdown, copy-to-clipboard, typography.
- Docs rewritten: CLAUDE.md, README.md. Brain installed (this memory/ layer) and registered
  in SecondBrainOS/PROJECTS.md.
- Open: deploy blocked — the Vercel project nexus-oz7q is PAUSED (503 DEPLOYMENT_PAUSED;
  push-triggered builds stall at UNKNOWN). Human must resume it in the dashboard; v2 is
  pushed and CLI-linked, so the build runs on resume. Sounds not yet judged by human ears.
  See STATE.md → Next actions.

## Pre-2026-07-11 (v1 era, condensed)
- c165407 Add Ollama provider · 7eb1258 Turso + Vercel migration · 0744ef5 v0.1 ·
  1251188 Initial CNA scaffold. v1 story and stale docs preserved in docs/v1/.
