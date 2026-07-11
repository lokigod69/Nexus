# Nexus — Memory Index
Last updated: 2026-07-11

Nexus v2 is the capture layer of the Second Brain system: a small cloud app (Next.js 16 + Turso
on Vercel) where the user dumps links and thoughts from any device. One AI call enriches each
capture and suggests a target project brain; the user confirms with one tap; a local
`npm run pull` writes routed captures into `<project>/memory/raw/`, where the protocol
(D:\CODING\SecondBrainOS\PROTOCOL.md) takes over. v1 (the "Personal Knowledge Reactor" with
embeddings + 3D universe) was torn down on 2026-07-11; its docs live in `docs/v1/`.

## Memory map

| File | What it holds |
|---|---|
| [STATE.md](STATE.md) | Current truth: what works, what's open, next actions |
| [DECISIONS.md](DECISIONS.md) | Why v2 is shaped this way; superseded v1 decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flow, the capture lifecycle |
| [LOG.md](LOG.md) | Dated session journal, newest first |
| raw/ | Untouched captures — never rewritten |
| notes/ | Topic pages (none yet) |
| archive/ | Rolled-off log entries |

## Topic notes
(none yet)

## Rules for agents
Read STATE.md at session start. After meaningful work: prepend LOG.md, refresh STATE.md,
append decisions to DECISIONS.md, touch ARCHITECTURE.md only when structure changes.
Update, don't duplicate. Date everything (YYYY-MM-DD). Mark wrong/doubtful content
`⚠️ superseded` / `⚠️ stale?` / `⚠️ unverified` — never leave it looking current.
Never edit `raw/`. Keep STATE.md under ~100 lines.
