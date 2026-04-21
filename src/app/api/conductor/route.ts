import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSignals,
  getSignalById,
  getAllSignalEmbeddings,
  createConductorConversation,
  getConductorMessages,
  addConductorMessage,
  updateConductorConversationTitle,
  listConductorConversations,
  getSetting,
  getAllConductorMemories,
  addConductorMemory,
  updateSignal,
} from '@/lib/db/queries';
import { getChatProvider, getModelById, getChatModelId } from '@/lib/ai/provider';
import { getEmbeddingProvider } from '@/lib/embedding/provider';
import { semanticSearch } from '@/lib/embedding/search';
import { scrape } from '@/lib/scraper';
import {
  getDocumentsIndexForPrompt,
  extractDocumentMarkers,
  saveConductorDocument,
} from '@/lib/export/conductor-docs';
import type { Signal, Message, Category } from '@/types';

// ============================================================
// URL detection for web research
// ============================================================

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

// ============================================================
// Memory extraction — parse AI response for learn/remember patterns
// ============================================================

const MEMORY_MARKERS = [
  /\[REMEMBER\]\s*(.+)/gi,
  /\[MEMORY\]\s*(.+)/gi,
  /\[NOTE_TO_SELF\]\s*(.+)/gi,
];

function extractMemoryMarkers(text: string): string[] {
  const memories: string[] = [];
  for (const regex of MEMORY_MARKERS) {
    let match;
    const re = new RegExp(regex);
    while ((match = re.exec(text)) !== null) {
      memories.push(match[1].trim());
    }
  }
  return memories;
}

// ============================================================
// Signal action extraction — detect action commands in output
// ============================================================

interface SignalAction {
  type: 'star' | 'archive' | 'unstar' | 'unarchive';
  signalNum: number;
  signalId: string;
}

const ACTION_PATTERNS = [
  { regex: /\[ACTION:STAR\s+(\d+)\]/gi, type: 'star' as const },
  { regex: /\[ACTION:ARCHIVE\s+(\d+)\]/gi, type: 'archive' as const },
  { regex: /\[ACTION:UNSTAR\s+(\d+)\]/gi, type: 'unstar' as const },
  { regex: /\[ACTION:UNARCHIVE\s+(\d+)\]/gi, type: 'unarchive' as const },
];

function extractActions(text: string, signalMap: Record<number, string>): SignalAction[] {
  const actions: SignalAction[] = [];
  for (const { regex, type } of ACTION_PATTERNS) {
    let match;
    const re = new RegExp(regex);
    while ((match = re.exec(text)) !== null) {
      const num = parseInt(match[1]);
      const signalId = signalMap[num];
      if (signalId) {
        actions.push({ type, signalNum: num, signalId });
      }
    }
  }
  return actions;
}

async function executeActions(actions: SignalAction[]): Promise<string[]> {
  const results: string[] = [];
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'star':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await updateSignal(action.signalId, { status: 'starred' } as any);
          results.push(`Starred signal [${action.signalNum}]`);
          break;
        case 'archive':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await updateSignal(action.signalId, { status: 'archived', archivedAt: new Date().toISOString() } as any);
          results.push(`Archived signal [${action.signalNum}]`);
          break;
        case 'unstar':
        case 'unarchive':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await updateSignal(action.signalId, { status: 'inbox' } as any);
          results.push(`Moved signal [${action.signalNum}] to inbox`);
          break;
      }
    } catch {
      results.push(`Failed to ${action.type} signal [${action.signalNum}]`);
    }
  }
  return results;
}

// ============================================================
// Signal index building
// ============================================================

function buildSignalIndex(signals: Signal[]): {
  index: string;
  signalMap: Record<number, string>;
} {
  const signalMap: Record<number, string> = {};
  const lines = signals.map((s, i) => {
    const num = i + 1;
    signalMap[num] = s.id;
    const tags = s.tags?.map(t => typeof t === 'string' ? t : t.name).join(', ') || '';
    return `[${num}] "${s.title}" | ${s.category} | ${s.source} | tags: ${tags} | ${s.status}`;
  });
  return { index: lines.join('\n'), signalMap };
}

function getCategoryBreakdown(signals: Signal[]): string {
  const counts: Partial<Record<Category, number>> = {};
  for (const s of signals) {
    counts[s.category] = (counts[s.category] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');
}

// ============================================================
// System prompt builder
// ============================================================

function buildSystemPrompt(
  signalIndex: string,
  totalSignals: number,
  categoryBreakdown: string,
  semanticHints: number[],
  expandedDetails: string,
  webResearchContent: string,
  memories: string,
  documentsIndex: string,
): string {
  let prompt = `You are the Conductor — an AI navigator for a personal knowledge collection called Nexus. You help the user find, explore, and connect the signals (bookmarks, notes, ideas) they've saved.

Here is the user's complete signal collection index:

---
${signalIndex}
---

Total: ${totalSignals} signals across ${categoryBreakdown}`;

  if (semanticHints.length > 0) {
    prompt += `\n\nSemantic search suggests these signals are most relevant to the query: ${semanticHints.map(n => `[${n}]`).join(', ')}`;
  }

  if (expandedDetails) {
    prompt += `\n\n${expandedDetails}`;
  }

  if (webResearchContent) {
    prompt += `\n\n--- WEB RESEARCH ---\n${webResearchContent}\n--- END WEB RESEARCH ---`;
  }

  if (memories) {
    prompt += `\n\n--- YOUR MEMORY (persistent facts about this user) ---\n${memories}\n--- END MEMORY ---\nUse this memory to personalize your responses. If you learn something new and important about the user (their goals, projects, preferences, interests), output it on its own line with the marker [REMEMBER] before it. Examples:\n[REMEMBER] User is building a Chrome extension for bookmark management\n[REMEMBER] User prefers Python over JavaScript\n[REMEMBER] User's main project is called Nexus\nOnly use [REMEMBER] for genuinely important, durable facts — not transient details.`;
  }

  prompt += `

Your capabilities:
1. SEARCH: Find signals by topic, keyword, category, or vibe. Reference signals by their number [N].
2. RECOMMEND: Suggest which signals are relevant to a task or question the user has.
3. CONNECT: Point out relationships between signals the user might not have noticed.
4. GAPS: Identify what's missing from the collection for a given topic.
5. SUMMARIZE: Give an overview of what's in a category or tag cluster.
6. TRENDS: Analyze what topics the user has been saving recently and identify patterns.
7. DRAFT: Help synthesize a brain dump or summary based on related signals.
8. WEB RESEARCH: When the user shares a URL, you'll receive its scraped content. Discuss it in context of their existing signals.
9. ACTIONS: You can perform actions on signals when the user asks. To do so, output the action on its own line:
   - [ACTION:STAR N] to star signal [N]
   - [ACTION:ARCHIVE N] to archive signal [N]
   - [ACTION:UNSTAR N] to unstar signal [N]
   - [ACTION:UNARCHIVE N] to move signal [N] back to inbox
   Only use actions when the user explicitly asks you to star, archive, or reorganize signals.

Rules:
- When listing signals, always include the [N] number so the user can ask for more detail.
- Be concise in your initial answers — list the relevant signals with one-line explanations of why they're relevant.
- If the user wants more detail on a specific signal, you'll receive its full content in the next message.
- You can suggest the user "open a full chat" about a specific signal for deep discussion.
- Be opinionated — if the user asks "which should I look at first?", give a recommendation with reasoning.
- If the user describes a task ("I want to build X"), proactively suggest which signals might help AND what they might want to search for or save next.
- If the user asks about trends, analyze their recent signals by creation date and category.
- If the user asks you to draft or write something, synthesize relevant signals into a coherent piece.
- When the user shares a URL for research, compare the scraped content with their existing signals: what overlaps, what's new, should they save it?
10. DOCUMENT: When the user asks you to create documentation, research notes, an explainer, or a brain dump DOCUMENT, output it with markers.
    Format:
    [DOCUMENT:type]
    # Document Title
    
    Full markdown content here...
    
    [/DOCUMENT]
    
    Where type is 'research', 'draft', or 'notes'. The document will be automatically saved to the user's knowledge base.
    Only create documents when the user explicitly asks for documentation, a write-up, an explainer, or a brain dump document.
    Make documents thorough and well-structured with markdown headings, lists, and code blocks as appropriate.
    Do NOT use signal [N] references inside documents — they should be self-contained.`;

  if (documentsIndex) {
    prompt += `\n\n--- YOUR KNOWLEDGE BASE ---\n${documentsIndex}\n--- END KNOWLEDGE BASE ---\nYou can reference these documents in conversation. If the user asks about a topic you've already documented, mention the existing document.`;
  }

  return prompt;
}

function generateTitle(userMessage: string): string {
  const cleaned = userMessage.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + '...';
}

// ============================================================
// Handlers
// ============================================================

// GET handler — list conductor conversations
export async function GET() {
  try {
    const conversations = await listConductorConversations(50);
    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST handler — send a message (creates conversation if needed)
export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, expandedSignalIds = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Load all signals
    const { signals } = await getAllSignals({ limit: 10000, sort: 'newest' });

    if (signals.length === 0) {
      return NextResponse.json({
        error: 'Your collection is empty — capture some signals first!',
      }, { status: 400 });
    }

    // Determine AI model (conductor-specific override or global chat model)
    const conductorModelSetting = await getSetting('conductor_model');
    let chatModelOverride: string | undefined;
    if (conductorModelSetting && conductorModelSetting !== 'default') {
      // Backwards compat: old values like 'openrouter'/'openai' are ignored
      const model = getModelById(conductorModelSetting);
      if (model) chatModelOverride = conductorModelSetting;
    }
    const aiProvider = await getChatProvider(chatModelOverride);
    const activeModelId = chatModelOverride || await getChatModelId();
    const activeModel = getModelById(activeModelId);

    // Get or create conversation
    let convId = conversationId;
    let isNewConversation = false;
    if (!convId) {
      const conv = await createConductorConversation(
        activeModel?.provider || 'openrouter',
        activeModel?.modelId || 'unknown',
      );
      convId = conv.id;
      isNewConversation = true;
    }

    // Save user message to DB
    await addConductorMessage(convId, 'user', message.trim());

    // Load conversation history from DB
    const dbMessages = await getConductorMessages(convId);

    // Build compressed index
    const { index, signalMap } = buildSignalIndex(signals as Signal[]);
    const categoryBreakdown = getCategoryBreakdown(signals as Signal[]);

    // Semantic search enhancement
    let semanticHints: number[] = [];
    try {
      const embeddingProvider = getEmbeddingProvider();
      const queryVector = await embeddingProvider.embedQuery(message);
      const allEmbeddings = await getAllSignalEmbeddings();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = semanticSearch(queryVector, allEmbeddings as any, 5);

      const idToNum = new Map<string, number>();
      for (const [num, id] of Object.entries(signalMap)) {
        idToNum.set(id, Number(num));
      }
      semanticHints = results
        .map(r => idToNum.get(r.id))
        .filter((n): n is number => n !== undefined);
    } catch {
      // Semantic search is optional
    }

    // Load expanded signal details (Tier 2)
    let expandedDetails = '';
    if (expandedSignalIds.length > 0) {
      const details: string[] = [];
      const idToNum = new Map<string, number>();
      for (const [num, id] of Object.entries(signalMap)) {
        idToNum.set(id, Number(num));
      }

      for (const signalId of expandedSignalIds) {
        const signal = await getSignalById(signalId);
        if (signal) {
          const num = idToNum.get(signalId) || '?';
          const content = signal.extractedContent || signal.summary || signal.rawScrapedContent || '';
          details.push(
            `Full detail for signal [${num}] "${signal.title}":\n` +
            `Summary: ${signal.summary || 'N/A'}\n` +
            `Key Takeaway: ${signal.keyTakeaway || 'N/A'}\n` +
            `Content: ${content.substring(0, 1500)}`
          );
        }
      }
      expandedDetails = details.join('\n\n---\n\n');
    }

    // Web Research — detect URLs in the message and scrape them
    let webResearchContent = '';
    const detectedUrls = extractUrls(message);
    if (detectedUrls.length > 0) {
      const scrapedParts: string[] = [];
      for (const url of detectedUrls.slice(0, 3)) { // Max 3 URLs per message
        try {
          console.log(`[conductor] Web research: scraping ${url}`);
          const scraped = await scrape(url);
          scrapedParts.push(
            `URL: ${url}\nTitle: ${scraped.title}\nContent:\n${scraped.content.substring(0, 5000)}`
          );
        } catch (err) {
          console.warn(`[conductor] Failed to scrape ${url}:`, err);
          scrapedParts.push(`URL: ${url}\n(Failed to scrape — site may be unreachable)`);
        }
      }
      webResearchContent = scrapedParts.join('\n\n---\n\n');
    }

    // Load memories
    const allMemories = await getAllConductorMemories();
    const memoriesText = allMemories.length > 0
      ? allMemories.map((m: { category: string; fact: string }) => `- [${m.category}] ${m.fact}`).join('\n')
      : 'No memories stored yet. You will build memory as you learn about the user.';

    // Load documents index
    const documentsIndex = await getDocumentsIndexForPrompt();

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      index,
      signals.length,
      categoryBreakdown,
      semanticHints,
      expandedDetails,
      webResearchContent,
      memoriesText,
      documentsIndex,
    );

    // Build message history from DB (last 50 messages to manage context)
    const aiMessages: Message[] = dbMessages.slice(-50).map((m: { id: string | null; role: string; content: string; createdAt: string | null }) => ({
      id: m.id!,
      conversationId: convId,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt || new Date().toISOString(),
    }));

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata as first event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'meta',
              signalMap,
              conversationId: convId,
              isNewConversation,
              webResearchUrls: detectedUrls.length > 0 ? detectedUrls : undefined,
            })}\n\n`)
          );

          for await (const chunk of aiProvider.chat(aiMessages, systemPrompt)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Save assistant response to DB
          if (fullResponse) {
            await addConductorMessage(convId, 'assistant', fullResponse, JSON.stringify({ signalMap }));
          }

          // Auto-title for new conversations
          if (isNewConversation && fullResponse) {
            const title = generateTitle(message.trim());
            await updateConductorConversationTitle(convId, title);
          }

          // Post-stream processing: extract memories
          const newMemories = extractMemoryMarkers(fullResponse);
          for (const mem of newMemories) {
            try {
              // Determine category from content
              let cat = 'general';
              if (mem.toLowerCase().includes('prefer') || mem.toLowerCase().includes('likes') || mem.toLowerCase().includes('wants')) cat = 'user_preference';
              else if (mem.toLowerCase().includes('project') || mem.toLowerCase().includes('building') || mem.toLowerCase().includes('working on')) cat = 'project';
              else if (mem.toLowerCase().includes('goal') || mem.toLowerCase().includes('plan')) cat = 'goal';
              else if (mem.toLowerCase().includes('insight') || mem.toLowerCase().includes('realized') || mem.toLowerCase().includes('pattern')) cat = 'insight';

              await addConductorMemory(mem, cat, convId);
              console.log(`[conductor] Stored memory: [${cat}] ${mem}`);
            } catch {
              // Best effort
            }
          }

          // Post-stream processing: execute signal actions
          const actions = extractActions(fullResponse, signalMap);
          if (actions.length > 0) {
            const results = await executeActions(actions);
            console.log(`[conductor] Executed actions:`, results);
          }

          // Post-stream processing: extract and save documents
          const extractedDocs = extractDocumentMarkers(fullResponse);
          for (const doc of extractedDocs) {
            try {
              const saved = await saveConductorDocument(doc.title, doc.content, doc.type, convId);
              console.log(`[conductor] Saved document: ${doc.type}/${saved.filename} (${saved.wordCount} words)`);
              // Add memory about the created document
              await addConductorMemory(
                `Created ${doc.type} document: "${doc.title}"`,
                'project',
                convId
              );
            } catch (err) {
              console.warn(`[conductor] Failed to save document:`, err);
            }
          }

        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          if (fullResponse) {
            try {
              await addConductorMessage(convId, 'assistant', fullResponse, JSON.stringify({ signalMap }));
            } catch { /* best effort */ }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process conductor request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
