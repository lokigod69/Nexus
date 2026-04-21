# Claude Code Prompt — The Conductor: Global AI Navigator

```
Read this entire prompt before coding. This adds a global AI chat that can search, navigate, and discuss the user's entire signal collection. It's NOT tied to any single signal — it sees the whole collection and helps the user find what they need.

## CONCEPT

The Conductor is a chat interface accessible from anywhere in the app. The user asks natural language questions like:
- "What do I have about cloud tools?"
- "Find that post about the Chinese student who built a simulation system"
- "Show me everything related to AI research automation"
- "Which signals should I look at if I want to build a Chrome extension?"
- "Compare the two auto-research tools I saved"

The Conductor searches the collection, presents relevant signals, and can discuss them.

## TOKEN EFFICIENCY — THE KEY DESIGN DECISION

The Conductor does NOT load every signal's full content into context. It uses a 3-tier approach:

### Tier 1: Compressed Index (always in context, ~2-3k tokens for 50 signals)
Build a condensed index string from ALL signals:
```typescript
function buildSignalIndex(signals: Signal[]): string {
  return signals.map((s, i) => 
    `[${i + 1}] "${s.title}" | ${s.category} | ${s.source} | tags: ${(s.tags || []).join(', ')} | ${s.status}`
  ).join('\n');
}
```
Example output:
```
[1] "AutoResearchClaw: Automated Research Paper Generation" | tools | X/Twitter | tags: ai-research, automation, papers | inbox
[2] "MiroFish Simulation System for Market Prediction" | coding | X/Twitter | tags: simulation, trading, ai | active
[3] "Reframing Desire: From Want to Conscious Decision" | philosophy | brain_dump | tags: reframing, agency, mindset | inbox
...
```

This is cheap — ~40 tokens per signal. 50 signals = ~2000 tokens. The AI can scan this to answer "what do I have about X?" without reading any full content.

### Tier 2: Signal Detail (loaded on demand)
When the user asks about a specific signal ("tell me more about #2"), load JUST that signal's summary + key takeaway + extracted content into context. ~200-500 tokens per signal.

### Tier 3: Deep Dive
"Open a full chat about this signal" → switches to the existing per-signal chat (which loads the full scraped content).

## SYSTEM PROMPT

```typescript
const CONDUCTOR_SYSTEM_PROMPT = `You are the Conductor — an AI navigator for a personal knowledge collection called Nexus. You help the user find, explore, and connect the signals (bookmarks, notes, ideas) they've saved.

Here is the user's complete signal collection index:

---
{signalIndex}
---

Total: {totalSignals} signals across {categoryBreakdown}

Your capabilities:
1. SEARCH: Find signals by topic, keyword, category, or vibe. Reference signals by their number [N].
2. RECOMMEND: Suggest which signals are relevant to a task or question the user has.
3. CONNECT: Point out relationships between signals the user might not have noticed.
4. GAPS: Identify what's missing from the collection for a given topic.
5. SUMMARIZE: Give an overview of what's in a category or tag cluster.

Rules:
- When listing signals, always include the [N] number so the user can ask for more detail.
- Be concise in your initial answers — list the relevant signals with one-line explanations of why they're relevant.
- If the user wants more detail on a specific signal, you'll receive its full content in the next message.
- You can suggest the user "open a full chat" about a specific signal for deep discussion.
- Be opinionated — if the user asks "which should I look at first?", give a recommendation with reasoning.
- If the user describes a task ("I want to build X"), proactively suggest which signals might help AND what they might want to search for or save next.`;
```

## API ROUTE: POST /api/conductor

```typescript
// Request:
{
  message: string;           // User's message
  conversationHistory: [];   // Previous messages in this conductor session
  expandedSignalId?: string; // If user asked for detail on a specific signal
}

// Flow:
// 1. Load all signals (title, category, tags, source, status only — NOT full content)
// 2. Build the compressed index
// 3. If expandedSignalId is provided, also load that signal's full summary + extractedContent
// 4. Compose messages:
//    - System prompt with index
//    - Conversation history
//    - If expanded signal: add a system message "Here is the full detail for signal [N]: ..."
//    - User's new message
// 5. Send to AI (use the FAST model — Haiku — this is navigation, not deep analysis)
// 6. Stream the response back

// Response: streamed AI response
```

## SEMANTIC SEARCH ENHANCEMENT

Before sending to the AI, also run a semantic search on the user's query:

```typescript
// 1. Embed the user's query using Gemini (RETRIEVAL_QUERY task type)
// 2. Find top 5 signals by cosine similarity
// 3. Add a note to the system prompt: 
//    "Semantic search suggests these signals are most relevant to the query: [3], [7], [12]"
```

This helps the AI find signals even when the user's words don't match the titles exactly. "That thing about predicting stock prices" → semantic search finds "MiroFish Simulation System" even though "stock prices" doesn't appear in the title.

## UI: Conductor Panel

Add a floating button in the bottom-right corner of the app (visible on all views — feed, universe, triage):

- Button: a small circular button with a ◈ icon (or compass icon), category-colored glow
- Tooltip: "Ask the Conductor"
- Click: opens a slide-up chat panel from the bottom-right

The panel:
- Width: 420px, height: 60vh, anchored to bottom-right
- Dark glass background matching the app aesthetic
- Header: "◈ Conductor" with a minimize button
- Chat messages area (scrollable)
- Input field with send button at the bottom
- Messages stream in (SSE, same as signal chat)

### Special rendering for signal references:
When the AI mentions a signal like [3], render it as a clickable pill/badge:
- Show: signal number + truncated title
- Style: small dark badge with category-colored left border
- Click: scrolls the feed to that signal OR opens the signal modal
- This makes the conductor's suggestions directly actionable

### "Tell me more" shortcut:
When the AI lists signals, add a small "→ Details" button next to each referenced signal. Clicking it sends "Tell me more about [N]" automatically, which triggers Tier 2 — loading that signal's full content for the next AI response.

## CONVERSATION PERSISTENCE

Conductor conversations are ephemeral by default — they reset when you close the panel. This is intentional:
- The conductor is for quick navigation, not long conversations
- The compressed index is rebuilt fresh each time the panel opens (so new signals are included)
- If the user wants a deep conversation about a specific signal, they "open a full chat" which IS persisted

## FILES TO CREATE/MODIFY

New files:
- `src/app/api/conductor/route.ts` — API route with streaming
- `src/components/conductor/ConductorPanel.tsx` — The slide-up chat panel
- `src/components/conductor/ConductorButton.tsx` — The floating trigger button
- `src/components/conductor/SignalPill.tsx` — Clickable signal reference badge

Modified files:
- `src/app/page.tsx` — Mount ConductorButton and ConductorPanel
- `src/stores/uiStore.ts` — Add conductorOpen state

## TEST SCENARIOS

After implementing, test these conversations:

1. "What do I have about AI research?"
   → Should list AutoResearchClaw, auto-research agent, and any related signals with [N] references

2. "Find that post about the simulation system"
   → Should find MiroFish and reference it by number

3. "Tell me more about [2]" (or click the Details button)
   → Should load MiroFish's full summary and give a detailed explanation

4. "I want to build a tool that scrapes web pages. What signals might help?"
   → Should suggest relevant tools signals AND point out gaps ("you don't have anything about Puppeteer or Playwright — might want to save some resources on that")

5. "Compare the research automation tools I've saved"
   → Should identify AutoResearchClaw and the auto-research agent, compare them based on their summaries

Use Haiku for all conductor responses — it's fast and cheap for this navigation task.
```
