# Session Log
Newest first. Append-only at the top; roll old halves into archive/ past ~300 lines.

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
