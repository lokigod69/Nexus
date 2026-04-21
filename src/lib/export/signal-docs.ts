import fs from 'fs/promises';
import path from 'path';

import { slugify } from '@/lib/utils/url';
import { getSignalById } from '@/lib/db/queries';
import { scrape } from '@/lib/scraper';
import { getAIProvider } from '@/lib/ai/provider';
import type { AIProviderType, Signal } from '@/types';

// ─── Types ──────────────────────────────────────────────────────

export interface SignalDoc {
  signalId: string;
  filename: string;
  title: string;
  category: string;
  source: string;
  wordCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignalDocFull extends SignalDoc {
  content: string;
}

// ─── Path Resolution ────────────────────────────────────────────

function getDocsBasePath(): string {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (vaultPath) {
    return path.join(vaultPath, 'nexus', 'signal-docs');
  }
  return path.resolve('./data/signal-docs');
}



// ─── Helpers ────────────────────────────────────────────────────

function makeFilename(signalId: string, title: string): string {
  const slug = slugify(title);
  const truncated = slug.length > 50 ? slug.substring(0, 50).replace(/-$/, '') : slug;
  return `${signalId}-${truncated}.md`;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function getPreview(content: string, maxLen = 200): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  const cleaned = body.replace(/^#{1,6}\s+/gm, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.substring(0, maxLen - 3) + '...';
}

function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      fm[key] = value;
    }
  }
  return fm;
}

// ─── System Prompt for Doc Generation ───────────────────────────

function buildDocSystemPrompt(signal: Signal, scrapedContent: string | null): string {
  let prompt = `You are a documentation specialist. Your job is to create a comprehensive, well-structured markdown document about a piece of content the user has saved.

Create a thorough, self-contained document that someone could read months later and fully understand the topic. Be detailed and informative — this is a knowledge base document, not a summary.

## Signal Information
- **Title:** ${signal.title}
- **Category:** ${signal.category}
- **Content Type:** ${signal.contentType}
- **Source:** ${signal.source}
- **URL:** ${signal.url || 'N/A'}
- **Tags:** ${signal.tags?.map(t => typeof t === 'string' ? t : t.name).join(', ') || 'None'}`;

  if (signal.summary) {
    prompt += `\n- **AI Summary:** ${signal.summary}`;
  }
  if (signal.keyTakeaway) {
    prompt += `\n- **Key Takeaway:** ${signal.keyTakeaway}`;
  }
  if (signal.extractedContent) {
    prompt += `\n\n## Extracted Content\n\`\`\`\n${signal.extractedContent.substring(0, 3000)}\n\`\`\``;
  }
  if (signal.rawScrapedContent) {
    prompt += `\n\n## Raw Scraped Content\n${signal.rawScrapedContent.substring(0, 5000)}`;
  }
  if (scrapedContent) {
    prompt += `\n\n## Fresh Scraped Content (from URL)\n${scrapedContent.substring(0, 8000)}`;
  }

  prompt += `

## Your Task
Generate a comprehensive markdown document with the following structure. Use ALL available information to make this as detailed and useful as possible:

# [Title]

## Overview
A clear, detailed explanation of what this is about. 2-3 paragraphs.

## Source & Context
Where this came from, who created it, when, and why it matters. Platform context (if it's a tweet thread, a GitHub repo, a blog post, etc.)

## Detailed Analysis
The main content broken down in detail. Use subheadings as needed. For technical content, explain concepts thoroughly. For tools, explain features and use cases. For discussions, capture the key arguments.

## Key Concepts
List and explain important terms, frameworks, or ideas mentioned.

## Practical Applications
How can this knowledge be applied? What are the actionable takeaways?

## Code & Examples
If there are any code snippets, prompts, commands, or concrete examples, preserve them in code blocks with proper syntax highlighting.

## Related Topics
What else should the reader explore? What are adjacent topics?

## Quick Reference
A bullet-point summary of the most important points for quick scanning.

## Explain it to me like I'm 10
Break down the core concept of this document in extremely simple terms, as if explaining it to a smart 10-year-old child. Avoid technical jargon entirely. Make it fun, clear, and easy to grasp. Crucially, if the topic involves complex technical risks or patterns (e.g., API key leaks, code injection, abstractions), creatively translate those risks into relatable physical concepts (e.g., leaving a wallet on a park bench, or hiding a spare key in a glass jar) so the true weight and mechanics of the concept are understood.

## Metaphorical Explanation
Explain the main subject matter using beautiful, highly sophisticated poetic metaphors. Focus on creating a vivid mental image that captures the essence of the topic without talking down to the reader. Ensure you also explicitly bridge this poetic metaphor to a practical, real-world application (e.g., how the user can apply this knowledge directly in their work or life).

---
*Document generated from Nexus signal • Category: ${signal.category} • Source: ${signal.source}*

IMPORTANT RULES:
- Write in third person, informative tone
- Be thorough — minimum 500 words, aim for 800-1500
- Preserve all code snippets, prompts, and technical details verbatim
- If you don't have enough information for a section, skip it rather than making things up
- Do NOT include the frontmatter (---) block, I will add that separately
- Start directly with the # Title heading`;

  return prompt;
}

// ─── Core Functions ─────────────────────────────────────────────

/**
 * Generate a documentation file for a signal.
 * Returns progress callbacks for streaming UI updates.
 */
export async function generateSignalDocument(
  signalId: string,
  providerType?: AIProviderType,
  onProgress?: (stage: string) => void,
): Promise<SignalDoc> {
  onProgress?.('loading');

  // 1. Load signal with all enrichments
  const signal = await getSignalById(signalId);
  if (!signal) throw new Error(`Signal not found: ${signalId}`);

  onProgress?.('scraping');

  // 2. Try to scrape fresh content from URL
  let scrapedContent: string | null = null;
  if (signal.url && signal.source !== 'brain_dump') {
    try {
      const scraped = await scrape(signal.url);
      scrapedContent = scraped.content;
    } catch (err) {
      console.warn(`[signal-docs] Failed to scrape ${signal.url}:`, err);
    }
  }

  onProgress?.('generating');

  // 3. Build prompt and generate with LLM
  const aiProvider = await getAIProvider(providerType);
  const systemPrompt = buildDocSystemPrompt(signal as Signal, scrapedContent);

  const chatMessages = [{
    id: 'user-1',
    conversationId: 'doc-gen',
    role: 'user' as const,
    content: 'Generate the documentation now.',
    createdAt: new Date().toISOString(),
  }];

  let fullText = '';
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      attempt++;
      fullText = ''; // Reset on retry
      console.log(`[signal-docs] Starting LLM generation (Attempt ${attempt}) for "${signal.title}" (${signalId})`);
      for await (const chunk of aiProvider.chat(chatMessages, systemPrompt)) {
        fullText += chunk;
      }
      
      if (fullText.trim()) {
        console.log(`[signal-docs] LLM responded with ${fullText.length} chars for "${signal.title}"`);
        break; // Success
      }
    } catch (llmError) {
      console.error(`[signal-docs] LLM FAILED (Attempt ${attempt}) for "${signal.title}":`, llmError);
      
      if (attempt >= maxAttempts) {
        throw llmError;
      }
      
      // Delay before retrying (e.g. 429 Rate Limit)
      const delayMs = attempt * 5000;
      onProgress?.(`Rate limited, retrying in ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  if (!fullText.trim()) {
    throw new Error('LLM returned empty response');
  }

  onProgress?.('saving');

  // 4. Build frontmatter + save
  const now = new Date().toISOString();
  const filename = makeFilename(signalId, signal.title);
  const tagsList = signal.tags?.map((t: { name: string } | string) => typeof t === 'string' ? t : t.name).join(', ') || '';

  const frontmatter = [
    '---',
    `signal_id: "${signalId}"`,
    `title: "${signal.title.replace(/"/g, '\\"')}"`,
    `category: ${signal.category}`,
    `source: ${signal.source}`,
    `url: "${signal.url || ''}"`,
    `tags: [${tagsList}]`,
    `generated: ${now}`,
    `updated: ${now}`,
    `generator: signal-docs`,
    '---',
    '',
  ].join('\n');

  const fullContent = frontmatter + fullText;
  const dirPath = getDocsBasePath();

  // Delete any existing doc for this signal first
  await deleteSignalDocument(signalId).catch(() => {});

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(path.join(dirPath, filename), fullContent, 'utf-8');

  console.log(`[signal-docs] Generated: ${filename} (${countWords(fullText)} words)`);

  return {
    signalId,
    filename,
    title: signal.title,
    category: signal.category,
    source: signal.source as string,
    wordCount: countWords(fullText),
    preview: getPreview(fullText),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * List all signal documents.
 */
export async function listSignalDocuments(): Promise<SignalDoc[]> {
  const dirPath = getDocsBasePath();
  const docs: SignalDoc[] = [];

  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      try {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const stat = await fs.stat(filePath);
        const fm = extractFrontmatter(content);

        docs.push({
          signalId: fm.signal_id || file.split('-')[0],
          filename: file,
          title: fm.title || file.replace('.md', ''),
          category: fm.category || 'other',
          source: fm.source || 'Web',
          wordCount: countWords(content),
          preview: getPreview(content),
          createdAt: fm.generated || stat.birthtime.toISOString(),
          updatedAt: fm.updated || stat.mtime.toISOString(),
        });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return docs;
}

/**
 * Get a specific signal document (full content).
 */
export async function getSignalDocument(signalId: string): Promise<SignalDocFull | null> {
  const dirPath = getDocsBasePath();

  try {
    const files = await fs.readdir(dirPath);
    const matchFile = files.find(f => f.startsWith(signalId + '-') && f.endsWith('.md'));
    if (!matchFile) return null;

    const filePath = path.join(dirPath, matchFile);
    const raw = await fs.readFile(filePath, 'utf-8');
    const stat = await fs.stat(filePath);
    const fm = extractFrontmatter(raw);
    const body = raw.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

    return {
      signalId,
      filename: matchFile,
      title: fm.title || matchFile.replace('.md', ''),
      category: fm.category || 'other',
      source: fm.source || 'Web',
      wordCount: countWords(body),
      preview: getPreview(body),
      createdAt: fm.generated || stat.birthtime.toISOString(),
      updatedAt: fm.updated || stat.mtime.toISOString(),
      content: body,
    };
  } catch {
    return null;
  }
}

/**
 * Delete a signal document.
 */
export async function deleteSignalDocument(signalId: string): Promise<boolean> {
  const dirPath = getDocsBasePath();

  try {
    const files = await fs.readdir(dirPath);
    const matchFile = files.find(f => f.startsWith(signalId + '-') && f.endsWith('.md'));
    if (!matchFile) return false;

    await fs.unlink(path.join(dirPath, matchFile));
    console.log(`[signal-docs] Deleted: ${matchFile}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get which signal IDs have docs generated (for badge/status checks).
 */
export async function getDocumentedSignalIds(): Promise<Set<string>> {
  const dirPath = getDocsBasePath();
  const ids = new Set<string>();

  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const dashIdx = file.indexOf('-');
      if (dashIdx > 0) {
        ids.add(file.substring(0, dashIdx));
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return ids;
}
