# NEXUS — Vision & Philosophical Abstract

> A personal knowledge reactor: capture signals from the noise, understand them with AI, and navigate your collected intelligence in a 3D mind palace.

---

## 1. The Problem

The modern knowledge worker drowns in micro-knowledge scattered across platforms. You encounter a brilliant prompting technique on X, a coding pattern on GitHub, a philosophical thread that shifts your perspective — and you email yourself the link. That link joins 50 others in your inbox, unsorted, unsummarized, undiscoverable.

The friction kills the value:
- You can't scan 50 links to find the one you want
- You don't remember what each link contained
- You can't tell which knowledge is still fresh vs. outdated
- There's no way to interact with, expand on, or learn from what you saved
- Good prompts, techniques, and ideas decay in email purgatory

## 2. The Solution: Nexus

Nexus is a **local-first personal knowledge reactor** with three core stages:

### Stage 1: CAPTURE (The Inbox)
You paste a URL. Nexus scrapes the content, feeds it to an AI, and instantly generates:
- A concise title and 2-3 sentence summary
- Auto-detected category (prompts, coding, AI art, video, tools, philosophy, music, lifestyle, etc.)
- Extracted actionable content (the actual prompt, code snippet, key technique) in a copy-paste-ready block
- Relevance tags for graph clustering
- Content type classification (tutorial, prompt, discussion, tool, showcase, thread, article, video)

**Bulk import mode**: Paste 50 URLs from your email backlog. Nexus processes them all, creating a triageable queue.

### Stage 2: TRIAGE (The Filter)
A rapid-fire interface inspired by Tinder's decisiveness:
- You see the AI summary + extracted value
- Three-second decisions: **Keep** → Vault | **Do Today** → Playground | **Discard** → Gone
- "Do Today" items surface in a focused short-list for when you have 10 spare minutes
- Items you Keep get full categorization and enter your 3D universe

### Stage 3: THE NEXUS (The 3D Mind Palace)
Your collected knowledge lives as a navigable 3D space:
- **Clusters**: Signals group by category — coding nodes float near other coding nodes, art near art
- **Time Decay**: Recent signals glow bright and large. Older ones shrink and dim. Week-old signals that haven't been interacted with start to fade, visually communicating "this might be stale"
- **Connections**: Signals that share tags or topics form visible links (edges) between them
- **Click to Dive**: Clicking a node opens it — you see the full summary, the extracted content, your notes, and most importantly: a **live AI chat** about this specific piece of knowledge

### The AI Chat (The Brain)
Every signal has its own conversation thread. The AI already has the scraped content loaded as context. You can:
- Ask "explain this to me like I'm five"
- Say "how could I use this technique for my Resonance Project?"
- Discuss philosophical implications of a post
- Ask it to rewrite a prompt for a different style
- Have it compare this signal to another one in your vault
- Build on ideas across multiple sessions — conversations persist

Conversations are saved alongside the signal. You can return days later, pick up where you left off, and keep expanding your understanding.

## 3. Core Principles

### 3.1 Local-First
Everything runs on your machine. One SQLite database file holds your entire knowledge graph. No accounts, no cloud dependencies for V1. When ready, migrate to Supabase for multi-device access.

### 3.2 Zero Friction Capture
Pasting a URL and pressing Enter should take under 2 seconds of your time. The AI does the rest.

### 3.3 Active Knowledge, Not a Graveyard
This is NOT another bookmarking tool where links go to die. Every feature is designed to bring you BACK to your saved knowledge:
- Time decay makes staleness visible
- "Do Today" queue creates immediate action paths
- AI chat makes every signal interactive
- Calendar view shows "on this day you saved..." prompts
- The 3D space makes browsing feel like exploring, not chores

### 3.4 Everything is Copy-Pasteable & Extractable
Prompts, code blocks, summaries, conversation transcripts — everything can be copied with one click. Export to Obsidian, export to JSON, export to Markdown.

### 3.5 AI-Provider Agnostic
Switch between Claude (Anthropic) and OpenAI freely. Use cheap models (GPT-4o-mini, Haiku) for bulk summarization, and powerful models (Claude Opus, GPT-4o) for deep conversations.

## 4. User Experience Story

**Tuesday, 10 minutes to spare:**

You open Nexus in your browser (localhost:3000). The 3D space loads — you see your knowledge universe. A cluster of bright green nodes catches your eye: three prompting techniques you saved yesterday from X. You orbit the camera toward them.

You click the brightest node. It's an @underwoodxie96 post about Nano Banana Pro cinematic grid prompts. The extracted prompt is right there in a formatted block. You hit "Copy", paste it into your tool of choice, experiment for 5 minutes.

Before closing, you click the chat icon. "How could I adapt this prompt technique for generating album cover art?" The AI responds with three variations. You save that conversation — it's now part of this node's history.

You notice a dimmed node nearby — a post from two weeks ago about a coding pattern. You click it, skim the summary, realize it's not relevant anymore. One click: deleted. Your universe is a little cleaner.

**Saturday deep dive:**

You have an hour. You switch to the "Learning" collection — signals you flagged as "I don't understand this yet." There's a thread about transformer attention mechanisms. You click into its chat and say "Walk me through this post step by step, I have no ML background." The AI teaches you, using the post as its source material. You take notes directly in the app. Those notes become part of the signal's metadata, searchable and persistent.

## 5. Content Categories

| Category | Icon | Examples |
|----------|------|----------|
| Prompts | ✦ | Midjourney prompts, Claude system prompts, image gen techniques |
| Coding | ⟨⟩ | GitHub repos, code snippets, dev tools, tutorials |
| AI Art | ◐ | Workflows, style techniques, model comparisons |
| Video | ▶ | Video generation (Seedance, Kling, Sora), editing techniques |
| Tools | ⚙ | New AI tools, SaaS products, browser extensions |
| Philosophy | ∞ | Consciousness, psychology, non-dualism, cultural commentary |
| Music | ♫ | Production techniques, AI music tools (ACE-Step), sound design |
| Lifestyle | ◉ | Psychology, relationships, personal development, health |
| Learning | 📚 | Things you don't yet understand but want to learn |
| Other | ◇ | Everything else |

## 6. Signal Lifecycle

```
URL Pasted → Scraped → AI Analyzed → INBOX
                                        ↓
                              TRIAGE (Keep / Do Today / Discard)
                                 ↓              ↓
                              VAULT          PLAYGROUND
                                ↓                ↓
                        3D Universe        Short-term focus list
                        AI Chat             (auto-archives after 7 days)
                        Notes
                        Collections
                                ↓
                    ARCHIVED (searchable but dimmed)
                        or
                    DELETED (gone forever)
```

## 7. Future Vision (V2+)

- **Automated X feed scanning**: Connect your X account, Nexus watches your bookmarks/likes and auto-captures interesting signals
- **Obsidian graph sync**: Two-way sync with Obsidian vault for advanced graph visualization
- **Multi-signal conversations**: Chat with AI about multiple signals at once ("compare these three approaches")
- **X post generation**: Draft posts based on your collected knowledge and takes
- **Podcast-style summaries**: NotebookLM-style audio explanations of complex signals
- **Collaborative sharing**: Share specific signals or collections with others
- **Smart suggestions**: "Based on your interests, you might want to look at this signal again"

---

*This document is the philosophical north star. Every technical decision should serve this vision.*
