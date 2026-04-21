import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { slugify } from '@/lib/utils/url';

// ─── Types ──────────────────────────────────────────────────────

export type ConductorDocType = 'research' | 'draft' | 'notes';

export interface ConductorDoc {
  filename: string;
  title: string;
  type: ConductorDocType;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  preview: string;
  conversationId?: string;
}

export interface ConductorDocFull extends ConductorDoc {
  content: string;
}

// ─── Path Resolution ────────────────────────────────────────────

function getDocsBasePath(): string {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (vaultPath) {
    return path.join(vaultPath, 'nexus', 'conductor');
  }
  return path.resolve('./data/conductor-docs');
}

function getTypePath(type: ConductorDocType): string {
  return path.join(getDocsBasePath(), type);
}

function getDocPath(type: ConductorDocType, filename: string): string {
  return path.join(getTypePath(type), filename);
}

// ─── Helpers ────────────────────────────────────────────────────

function slugifyTitle(title: string): string {
  const slug = slugify(title);
  if (slug.length <= 60) return slug;
  const truncated = slug.substring(0, 60);
  const lastDash = truncated.lastIndexOf('-');
  return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
}

function generateFilename(title: string): string {
  const slug = slugifyTitle(title);
  const datePart = format(new Date(), 'yyyyMMdd');
  return `${datePart}-${slug}.md`;
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

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function getPreview(content: string, maxLen = 200): string {
  // Strip frontmatter
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  // Strip markdown headers
  const cleaned = body.replace(/^#{1,6}\s+/gm, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.substring(0, maxLen - 3) + '...';
}

// ─── CRUD Functions ─────────────────────────────────────────────

export async function saveConductorDocument(
  title: string,
  content: string,
  type: ConductorDocType = 'research',
  conversationId?: string,
): Promise<ConductorDoc> {
  const filename = generateFilename(title);
  const dirPath = getTypePath(type);
  const filePath = path.join(dirPath, filename);

  // Build YAML frontmatter
  const now = new Date().toISOString();
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `type: ${type}`,
    `created: ${now}`,
    `updated: ${now}`,
    conversationId ? `conversation_id: ${conversationId}` : null,
    'source: conductor',
    '---',
    '',
  ].filter(Boolean).join('\n');

  const fullContent = frontmatter + content;

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, fullContent, 'utf-8');

  console.log(`[conductor-docs] Saved: ${type}/${filename} (${countWords(content)} words)`);

  return {
    filename,
    title,
    type,
    createdAt: now,
    updatedAt: now,
    wordCount: countWords(content),
    preview: getPreview(content),
    conversationId,
  };
}

export async function listConductorDocuments(): Promise<ConductorDoc[]> {
  const basePath = getDocsBasePath();
  const types: ConductorDocType[] = ['research', 'draft', 'notes'];
  const docs: ConductorDoc[] = [];

  for (const type of types) {
    const dirPath = path.join(basePath, type);
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
            filename: file,
            title: fm.title || file.replace('.md', ''),
            type,
            createdAt: fm.created || stat.birthtime.toISOString(),
            updatedAt: fm.updated || stat.mtime.toISOString(),
            wordCount: countWords(content),
            preview: getPreview(content),
            conversationId: fm.conversation_id,
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Directory doesn't exist yet — that's fine
    }
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return docs;
}

export async function getConductorDocument(
  type: ConductorDocType,
  filename: string,
): Promise<ConductorDocFull | null> {
  try {
    const filePath = getDocPath(type, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const stat = await fs.stat(filePath);
    const fm = extractFrontmatter(content);

    // Strip frontmatter from content
    const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

    return {
      filename,
      title: fm.title || filename.replace('.md', ''),
      type,
      createdAt: fm.created || stat.birthtime.toISOString(),
      updatedAt: fm.updated || stat.mtime.toISOString(),
      wordCount: countWords(body),
      preview: getPreview(body),
      conversationId: fm.conversation_id,
      content: body,
    };
  } catch {
    return null;
  }
}

export async function deleteConductorDocument(
  type: ConductorDocType,
  filename: string,
): Promise<boolean> {
  try {
    const filePath = getDocPath(type, filename);
    await fs.unlink(filePath);
    console.log(`[conductor-docs] Deleted: ${type}/${filename}`);
    return true;
  } catch {
    return false;
  }
}

// ─── Index for System Prompt ────────────────────────────────────

export async function getDocumentsIndexForPrompt(): Promise<string> {
  const docs = await listConductorDocuments();
  if (docs.length === 0) return '';

  const lines = docs.map(d =>
    `- [${d.type}] "${d.title}" (${d.wordCount} words, ${format(new Date(d.createdAt), 'MMM d')})`
  );

  return `You have ${docs.length} documents in your knowledge base:\n${lines.join('\n')}`;
}

// ─── Document Extraction from AI Response ───────────────────────

interface ExtractedDocument {
  type: ConductorDocType;
  title: string;
  content: string;
}

export function extractDocumentMarkers(text: string): ExtractedDocument[] {
  const docs: ExtractedDocument[] = [];
  const regex = /\[DOCUMENT:(research|draft|notes)\]\s*\n([\s\S]*?)\[\/DOCUMENT\]/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1].toLowerCase() as ConductorDocType;
    const raw = match[2].trim();

    // Extract title from first heading
    const titleMatch = raw.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Document';

    docs.push({ type, title, content: raw });
  }

  return docs;
}

export function stripDocumentMarkers(text: string): string {
  return text
    .replace(/\[DOCUMENT:(research|draft|notes)\]\s*\n/gi, '')
    .replace(/\[\/DOCUMENT\]/gi, '')
    .trim();
}
