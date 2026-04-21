# NEXUS → Obsidian Live Sync + MCP Bridge

> This turns Nexus from a standalone app into the ingestion layer for an Obsidian-powered knowledge graph that ALL your coding agents can access.

---

## What This Changes

Current state: Nexus captures signals, analyzes them, embeds them, shows them in a feed. Obsidian export exists but is manual and one-way.

New state: Every signal in Nexus auto-exports to Obsidian as a properly formatted note with wikilinks. Obsidian becomes the graph view and persistence layer. Claude Code (and any MCP-compatible agent) can search your entire signal collection during any coding session, on any project.

---

## Architecture

```
You find a URL or have a thought
        ↓
    NEXUS (capture + AI analyze + embed)
        ↓
    Auto-export to Obsidian vault
        ↓
    Obsidian (graph view + manual curation + wikilinks)
        ↓
    MCP bridge (Smart Connections + qmd)
        ↓
    Claude Code / any agent can query your knowledge
        ↓
    Agent finds relevant signals while working on ANY project
```

---

## Step 1: Obsidian Vault Structure for Nexus

Create this structure in your Obsidian vault (or adapt your existing vault):

```
ObsidianVault/
├── nexus/
│   ├── _index.md              # Map of content — auto-generated overview
│   ├── signals/               # One .md file per signal
│   │   ├── 2026-03-17_mirofish-simulation-system.md
│   │   ├── 2026-03-17_creativity-as-combinatorial-inevitability.md
│   │   └── ...
│   ├── brain-dumps/           # Brain dump signals get their own folder
│   │   ├── 2026-03-16_reframing-desire.md
│   │   └── ...
│   ├── categories/            # One MOC (map of content) per category
│   │   ├── prompts.md
│   │   ├── coding.md
│   │   ├── philosophy.md
│   │   └── ...
│   └── tags/                  # Tag index files (auto-generated)
│       ├── creativity.md
│       ├── ai-research.md
│       └── ...
```

## Step 2: Auto-Export Format

Each signal becomes a markdown file with YAML frontmatter and wikilinks:

```markdown
---
title: "MiroFish Simulation System for Market Prediction"
url: "https://x.com/cvxv666/status/..."
source: "X/Twitter"
category: "tools"
content_type: "showcase"
status: "inbox"
tags:
  - simulation
  - market-prediction
  - ai-trading
created: 2026-03-17T12:56:00Z
nexus_id: "f8abfb274b2b9f57"
---

## Summary
A post about a Chinese student who built MiroFish, a simulation system that uses AI to analyze 40+ years of market data and predict SPX price movements.

## Key Takeaway
Complex systems can be modeled through simulation-based analysis by loading historical data, running multiple scenarios, and iteratively analyzing results.

## Extracted Content
```
The process is simple: simulate → analyze → improve → repeat.
```

## Related Signals
- [[AutoResearchClaw — Automated Research Paper Generation]]
- [[GitNexus — Open Source Code Intelligence Engine]]

## Tags
#simulation #market-prediction #ai-trading

## AI Conversation
*(exported if conversation exists)*

---
*Auto-exported from Nexus · [[categories/tools|Tools]] · [Original post](https://x.com/...)*
```

### Key details:
- **Filename**: `{date}_{slugified-title}.md`
- **Wikilinks to related signals**: Based on the top 3-5 most similar signals (cosine similarity > 0.65). These create the graph edges in Obsidian.
- **Category MOC links**: Each signal links to its category page, and the category page auto-lists all signals in that category.
- **Tags as Obsidian tags**: Using # format so Obsidian's tag search works.

## Step 3: Auto-Export Trigger

Export should happen automatically, not manually. Two approaches:

### Option A: Export on capture (recommended)
After a signal is captured and analyzed, immediately write the .md file to the vault.

In the POST /api/signals route, after save:
```typescript
// After signal is saved and embedded:
if (process.env.OBSIDIAN_VAULT_PATH) {
  await exportSignalToObsidian(signal, relatedSignals);
}
```

### Option B: Periodic sync
A background job that exports new/updated signals every 5 minutes.

### The export function:
```typescript
async function exportSignalToObsidian(signal: Signal, relatedSignals?: Signal[]) {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return;

  const folder = signal.source === 'brain_dump' ? 'brain-dumps' : 'signals';
  const slug = slugify(signal.title || 'untitled');
  const date = format(new Date(signal.createdAt), 'yyyy-MM-dd');
  const filename = `${date}_${slug}.md`;
  const filepath = path.join(vaultPath, 'nexus', folder, filename);

  // Generate wikilinks to related signals
  const relatedLinks = relatedSignals?.map(r =>
    `- [[${slugify(r.title)}]]`
  ).join('\n') || '*(none yet)*';

  // Generate the markdown content
  const content = generateObsidianMarkdown(signal, relatedLinks);

  // Write the file
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');

  // Update the category MOC
  await updateCategoryMOC(vaultPath, signal);
}
```

## Step 4: Category MOCs (Maps of Content)

Each category gets an auto-maintained index file:

```markdown
---
type: moc
category: tools
---

# Tools

Signals about AI tools, SaaS products, browser extensions, and developer utilities.

## Signals
- [[2026-03-17_mirofish-simulation-system|MiroFish Simulation System]]
- [[2026-03-17_notebooklm-video-generation|NotebookLM Video Generation]]
- [[2026-03-13_anthropic-claude-cookbook|Anthropic Claude Cookbook]]

## Related Categories
- [[coding]] — tools often overlap with coding techniques
- [[ai-art]] — many tools are for AI art generation
```

Updated automatically when signals are added/removed.

## Step 5: MCP Bridge Setup

Once signals are in Obsidian, set up the MCP servers so Claude Code can search them:

### Install Smart Connections MCP:
```bash
pip install smart-connections-mcp
```

### Install qmd:
```bash
npm install -g @tobilu/qmd
```

### Add to Claude Code MCP config (~/.claude/settings.json):
```json
{
  "mcpServers": {
    "smart-connections": {
      "command": "python",
      "args": ["-m", "smart_connections_mcp.server"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "C:/Users/YourName/ObsidianVault"
      }
    },
    "qmd": {
      "command": "qmd",
      "args": ["mcp"],
      "env": {
        "HOME": "~"
      }
    }
  }
}
```

### What this enables:
When working on ANY project in Claude Code, you can say:
- "Search my knowledge base for prompting techniques"
- "Find that signal about simulation systems I saved last week"
- "What principles have I brain-dumped about creativity?"

Claude Code searches your Obsidian vault via Smart Connections (semantic search) and returns the relevant Nexus signals.

## Step 6: Bidirectional Sync (Future)

For now, the flow is one-way: Nexus → Obsidian.

Future enhancement: if you edit a note in Obsidian (add your own wikilinks, notes, connections), those changes could sync back to Nexus. This is more complex and can wait.

## Step 7: Session Memory for Nexus Development

For the Nexus project itself, set up Layer 1 from the article:

### CLAUDE.md already exists — enhance it:
Add to your existing CLAUDE.md:
```markdown
## Session Memory
When you discover something important during this session:
1. Note it in memory/ directory
2. Update MEMORY.md if it's a recurring pattern
3. Architecture decisions go in memory/architecture.md
4. UI patterns that work go in memory/patterns.md
```

### Create memory directory:
```
nexus-claude/
├── CLAUDE.md          # Already exists
├── memory/
│   ├── MEMORY.md      # Routing doc, under 200 lines
│   ├── architecture.md
│   ├── patterns.md
│   ├── debugging.md
│   └── preferences.md
```

This means every Claude Code session working on Nexus starts with accumulated knowledge from previous sessions.

---

## Implementation Order

1. **Now**: Create the Obsidian vault structure (manual, 5 minutes)
2. **Prompt 1**: Auto-export on signal capture + category MOCs
3. **Prompt 2**: Backfill existing signals (export all current signals to Obsidian)
4. **Manual**: Install Smart Connections MCP + qmd, add to Claude settings
5. **Manual**: Create memory/ directory in Nexus project root
6. **Test**: Capture a new signal in Nexus, verify it appears in Obsidian, search for it from Claude Code

---

## What This Means for the 3D Universe

With Obsidian as your graph view, the 3D universe in Nexus becomes optional/experimental rather than the primary way to see connections. Obsidian's graph view is:
- Already built and polished
- Searchable
- Filterable by tags, folders, connections
- Interactive (hover to see connections, click to open notes)
- Performant with thousands of nodes

You could keep the 3D universe as a "wow" view for exploring, but Obsidian becomes the practical daily tool for navigating your knowledge graph.
