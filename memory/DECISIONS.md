# Decisions
Newest first. Superseded decisions are marked, never deleted.

## 2026-07-11 — Runtime AI fallback chain for enrichment
**Status:** active
**Decision:** `enrichCapture` walks Ollama → OpenRouter free → gpt-4o-mini at runtime per call;
a provider error OR unparseable response falls through to the next model.
**Why:** the free OpenRouter model 429'd in three separate runs — with config-time selection
only, default config meant every enrichment failed. Amended into docs/SPEC.md same day.
**Rejected:** retry-same-model (free tier stays rate-limited), queueing (overkill at capture volume).

## 2026-07-11 — Acceptance test is the canonical spec
**Status:** active
**Decision:** `scripts/acceptance.mjs` > `src/types/index.ts` > `docs/SPEC.md`, in that order,
whenever they disagree. Implementation was delegated to two parallel subagents against this
contract (backend+CLI, frontend), with hard file boundaries; architect reviewed and signed off.
**Why:** delegation-protocol discipline — prose describes intent, the runnable test defines done.
Both delegations passed with zero functional rework.

## 2026-07-11 — Cloud inbox + local pull (not direct disk writes)
**Status:** active
**Decision:** captures live in Turso with a status lifecycle (inbox → routed → delivered /
archived); a zero-dependency local CLI (`npm run pull`) syncs the registry up from
SecondBrainOS/PROJECTS.md and writes routed captures into each project's `memory/raw/`.
**Why:** the cloud app can't reach D:\CODING; the brains' ground truth must stay plain files
on disk. The registry is synced upward so routing suggestions know the real project list.
**Rejected:** local-only app (loses phone capture — the main point), GitHub-API writes into
repos (heavier, couples Nexus to git hosting).

## 2026-07-11 — v2 keeps exactly two tables and never touches v1 data
**Status:** active
**Decision:** new `captures` + `projects` tables; the v1 tables (`signals`, `tags`, …) in the
same Turso DB are never DROPped or ALTERed.
**Why:** v1 data is the user's history; deleting it is not the rebuild's call to make.
Migration/export is an open question in STATE.md.

## 2026-07-11 — Rebuild as the Second Brain capture layer; delete v1 machinery
**Status:** active (supersedes all v1 architecture decisions below)
**Decision:** tear v1 down to a skeleton (kept: scraper lib, AI provider pattern, middleware
auth, Turso client) and rebuild as a two-screen capture app. No embeddings, UMAP, 3D universe,
triage, timeline, chat, conductor, or enrichment plugins.
**Why:** SecondBrainOS/PHASE2.md verdict — v1 was "the right instinct pointed at the wrong
layer": an ingestion app with no memory protocol underneath, which is why it went stale. With
17 project brains live, the protocol now defines where ingested things go; Nexus only needs
to be a beautiful front door to `memory/raw/`. Protocol §10 explicitly forbids RAG machinery.
**Rejected:** incremental slim-down of v1 (16k LOC of coupled machinery; rebuild was cheaper
and cleaner), a fresh repo (would orphan the wired-up Vercel project + Turso env).

## 2026-07-11 — Design: Apple fluid-interface rules + taste anti-slop + cuelume
**Status:** active
**Decision:** binding design contract in docs/SPEC.md — dark warm neutrals (#08080d family),
one amber accent (oklch 0.78 0.14 75), Outfit + JetBrains Mono, `motion` springs (damping 1.0
default, bounce only on commit exits), full reduced-motion fallbacks, cuelume sounds at exactly
three moments (capture press, enrich success, route tick) with a persisted mute.
**Why:** user asked for Apple-level cleanliness and wanted cuelume tested in a real project;
restraint (one accent, three sounds) is the actual Apple aesthetic.

## Pre-2026-07-11 (v1, superseded)
⚠️ superseded → see "Rebuild as the Second Brain capture layer" above.
v1 decisions (UMAP-from-embeddings 3D positions, Gemini 768-dim embeddings as BLOBs, signal
categories/status taxonomy, per-signal chat) are documented in `docs/v1/` and the git history
up to commit c165407.
