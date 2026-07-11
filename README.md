# Nexus — The Front Door to raw/

The capture layer of the [Second Brain system](file:///D:/CODING/SecondBrainOS/PROTOCOL.md).
Dump a link or a thought from any device. Nexus scrapes it, has an AI write a title, summary,
takeaway, and tags, and suggests which project brain it belongs to. You confirm with one tap.
Then, on your machine:

```bash
npm run pull
```

…and every routed capture lands as a dated markdown file in that project's `memory/raw/`,
where the Second Brain protocol takes over (the next `brain-save` harvests it).
Nexus's job ends at `raw/`.

## The loop

```
any device                    cloud (Vercel + Turso)              your machine
──────────                    ──────────────────────              ────────────
paste link/thought  ──────▶   enrich (scrape + 1 AI call)
                              inbox: AI suggests a project
tap to confirm      ──────▶   status: routed
                                                        ◀──────  npm run pull
                              status: delivered  ──────▶  <project>/memory/raw/nexus-*.md
```

## Screens

- `/` — **Capture.** One input. Paste and go.
- `/inbox` — **Route.** Confirm the AI's suggestion, pick another project, or archive.

## Development

```bash
npm run dev                    # localhost:3001
npm run build                  # type-check + build (the gate)
node scripts/acceptance.mjs    # behavioral contract — see file header for setup
```

Docs: [docs/SPEC.md](docs/SPEC.md) (architecture + design contract),
[src/types/index.ts](src/types/index.ts) (canonical shapes),
[docs/v1/](docs/v1/) (the original 2026 "Knowledge Reactor" design, historical).

## History

v1 tried to be a knowledge universe — embeddings, UMAP, a 3D graph, per-item chat.
It went stale because there was no memory protocol underneath it. v2 is deliberately small:
a beautiful front door to `memory/raw/`. The protocol does the rest.
