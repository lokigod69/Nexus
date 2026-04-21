import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { slugify } from '@/lib/utils/url';
import { findRelatedSignals } from '@/lib/embedding/search';
import {
  getAllSignals,
  getAllSignalEmbeddings,
  getSignalById,
  getSetting,
} from '@/lib/db/queries';
import type { Signal, Category } from '@/types';

// ─── Category Descriptions ──────────────────────────────────────

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  prompts: 'Prompt engineering techniques, templates, and strategies.',
  coding: 'Code snippets, libraries, frameworks, and development techniques.',
  'ai-art': 'AI image generation, art tools, and creative AI workflows.',
  video: 'Video production, editing tools, and video AI.',
  tools: 'AI tools, SaaS products, browser extensions, and developer utilities.',
  philosophy: 'Ideas, mental models, principles, and deep thinking.',
  music: 'Music production, AI music, and audio tools.',
  lifestyle: 'Productivity, health, habits, and life optimization.',
  learning: 'Courses, tutorials, educational resources, and learning strategies.',
  other: 'Signals that don\'t fit neatly into other categories.',
};

// ─── Helpers ────────────────────────────────────────────────────

function slugifyTitle(title: string): string {
  const slug = slugify(title);
  if (slug.length <= 50) return slug;
  // Truncate at word boundary
  const truncated = slug.substring(0, 50);
  const lastDash = truncated.lastIndexOf('-');
  return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
}

function getSignalFilename(signal: { title: string | null }): string {
  const slug = slugifyTitle(signal.title || 'untitled');
  return `${slug}.md`;
}

function getSignalFolder(signal: { source: string | null }): string {
  return signal.source === 'brain_dump' ? 'nexus/brain-dumps' : 'nexus/signals';
}

function getSignalFilePath(vaultPath: string, signal: { title: string | null; source: string | null }): string {
  return path.join(vaultPath, getSignalFolder(signal), getSignalFilename(signal));
}

function escapeYaml(str: string): string {
  if (/[:"{}[\],&*?|>!%#`@\\]/.test(str) || str.startsWith("'") || str.startsWith('"')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `"${str}"`;
}

// ─── Markdown Generation ────────────────────────────────────────

function generateObsidianMarkdown(
  signal: Signal,
  relatedSignals?: { title: string | null; source: string | null }[]
): string {
  const tagNames = signal.tags?.map((t: any) => t.name || t) || [];
  const date = format(new Date(signal.createdAt), "yyyy-MM-dd'T'HH:mm:ss'Z'");

  // YAML frontmatter
  const fm = [
    '---',
    `title: ${escapeYaml(signal.title || 'Untitled')}`,
    `url: ${signal.url ? escapeYaml(signal.url) : 'null'}`,
    `source: ${escapeYaml(signal.source || 'Web')}`,
    `category: ${escapeYaml(signal.category)}`,
    `content_type: ${escapeYaml(signal.contentType || 'article')}`,
    `status: ${escapeYaml(signal.status)}`,
    'tags:',
    ...tagNames.map((t: string) => `  - ${t}`),
    `created: ${date}`,
    `nexus_id: ${escapeYaml(signal.id!)}`,
    '---',
  ];

  const sections: string[] = [fm.join('\n'), ''];

  // Summary
  sections.push('## Summary', signal.summary || 'No summary available.', '');

  // Key Takeaway
  if (signal.keyTakeaway) {
    sections.push('## Key Takeaway', signal.keyTakeaway, '');
  }

  // Original Thought (brain dumps)
  if (signal.source === 'brain_dump' && signal.rawScrapedContent) {
    sections.push('## Original Thought', signal.rawScrapedContent, '');
  }

  // Extracted Content
  if (signal.extractedContent) {
    const label =
      signal.extractedContentType === 'code' ? 'Extracted Code'
        : signal.extractedContentType === 'prompt' ? 'Extracted Prompt'
          : 'Extracted Content';
    sections.push(`## ${label}`, '```', signal.extractedContent, '```', '');
  }

  // Related Signals with wikilinks
  if (relatedSignals && relatedSignals.length > 0) {
    const links = relatedSignals.map((r) => {
      const filename = getSignalFilename(r).replace('.md', '');
      const displayTitle = r.title || 'Untitled';
      return `- [[${filename}|${displayTitle}]]`;
    });
    sections.push('## Related Signals', ...links, '');
  } else {
    sections.push('## Related Signals', '*(none yet)*', '');
  }

  // Tags as Obsidian tags
  if (tagNames.length > 0) {
    sections.push('## Tags', tagNames.map((t: string) => `#${t.replace(/\s+/g, '-')}`).join(' '), '');
  }

  // Footer
  const footerParts = [
    '---',
    `*Auto-exported from Nexus · [[categories/${signal.category}|${signal.category.charAt(0).toUpperCase() + signal.category.slice(1)}]]`,
  ];
  if (signal.url) {
    footerParts[1] += ` · [Original](${signal.url})`;
  }
  footerParts[1] += '*';
  sections.push(...footerParts);

  return sections.join('\n');
}

// ─── Export Functions ───────────────────────────────────────────

export async function exportSignalToObsidian(
  signal: Signal,
  relatedSignals?: { title: string | null; source: string | null }[]
): Promise<void> {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return;

  const filepath = getSignalFilePath(vaultPath, signal);
  const content = generateObsidianMarkdown(signal, relatedSignals);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');

  // Update category MOC
  await updateCategoryMOC(vaultPath, signal.category as Category);
}

export async function deleteSignalFromObsidian(
  signal: { title: string | null; source: string | null; category: string }
): Promise<void> {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return;

  const filepath = getSignalFilePath(vaultPath, signal);

  try {
    await fs.unlink(filepath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  // Regenerate category MOC
  await updateCategoryMOC(vaultPath, signal.category as Category);
}

export async function updateCategoryMOC(vaultPath: string, category: Category): Promise<void> {
  const { signals } = await getAllSignals({ category, limit: 10000 });

  const mocDir = path.join(vaultPath, 'nexus', 'categories');
  await fs.mkdir(mocDir, { recursive: true });

  const title = category.charAt(0).toUpperCase() + category.slice(1);
  const description = CATEGORY_DESCRIPTIONS[category] || '';

  const lines = [
    '---',
    'type: moc',
    `category: ${category}`,
    '---',
    '',
    `# ${title}`,
    '',
    description,
    '',
    '## Signals',
    '',
  ];

  for (const signal of signals) {
    const filename = getSignalFilename(signal).replace('.md', '');
    lines.push(`- [[${filename}|${signal.title || 'Untitled'}]]`);
  }

  if (signals.length === 0) {
    lines.push('*(no signals yet)*');
  }

  lines.push('');

  await fs.writeFile(path.join(mocDir, `${category}.md`), lines.join('\n'), 'utf-8');
}

async function generateMasterIndex(vaultPath: string): Promise<void> {
  const { signals } = await getAllSignals({ limit: 10000 });

  // Count by category
  const counts = new Map<string, number>();
  for (const s of signals) {
    counts.set(s.category, (counts.get(s.category) || 0) + 1);
  }

  const lines = [
    '---',
    'type: index',
    '---',
    '',
    '# Nexus Knowledge Base',
    '',
    `> ${signals.length} signals captured and analyzed.`,
    '',
    '## Categories',
    '',
  ];

  const categories: Category[] = [
    'prompts', 'coding', 'ai-art', 'video', 'tools',
    'philosophy', 'music', 'lifestyle', 'learning', 'other',
  ];

  for (const cat of categories) {
    const count = counts.get(cat) || 0;
    if (count > 0) {
      const title = cat.charAt(0).toUpperCase() + cat.slice(1);
      lines.push(`- [[categories/${cat}|${title}]] — ${count} signal${count !== 1 ? 's' : ''}`);
    }
  }

  lines.push('', '---', `*Auto-generated by Nexus · ${format(new Date(), 'yyyy-MM-dd HH:mm')}*`, '');

  const indexPath = path.join(vaultPath, 'nexus', '_index.md');
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');
}

// ─── High-Level Orchestrators ───────────────────────────────────

export async function exportSignalToObsidianWithRelated(signalId: string): Promise<void> {
  // Check auto-export setting (default: true if vault path set)
  const autoExport = await getSetting('obsidian.auto_export');
  if (autoExport === 'false') return;

  const signal = await getSignalById(signalId);
  if (!signal) return;

  // Find related signals for wikilinks
  const allEmbeddings = await getAllSignalEmbeddings();
  const related = findRelatedSignals(signalId, allEmbeddings as any, 3, 0.65);

  let relatedSignals: Signal[] = [];
  if (related.length > 0) {
    const loaded = await Promise.all(related.map((r) => getSignalById(r.id)));
    relatedSignals = loaded.filter(Boolean) as Signal[];
  }

  await exportSignalToObsidian(signal as Signal, relatedSignals);
}

async function cleanMdFiles(dirPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath);
    for (const entry of entries) {
      if (entry.endsWith('.md')) {
        await fs.unlink(path.join(dirPath, entry));
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
    // Directory doesn't exist yet — nothing to clean
  }
}

export async function exportAllSignals(): Promise<{ exported: number; errors: string[] }> {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return { exported: 0, errors: ['OBSIDIAN_VAULT_PATH not set'] };

  // Clean old files (removes date-prefixed filenames from previous exports)
  await cleanMdFiles(path.join(vaultPath, 'nexus/signals'));
  await cleanMdFiles(path.join(vaultPath, 'nexus/brain-dumps'));
  console.log('Cleaned old files and re-exported with new filenames');

  const { signals } = await getAllSignals({ limit: 10000 });
  const allEmbeddings = await getAllSignalEmbeddings();
  const errors: string[] = [];
  let exported = 0;

  for (const signal of signals) {
    try {
      const related = findRelatedSignals(signal.id!, allEmbeddings as any, 3, 0.65);
      let relatedSignals: Signal[] = [];
      if (related.length > 0) {
        // Look up from our already-loaded list instead of hitting DB per signal
        relatedSignals = related
          .map((r) => signals.find((s: any) => s.id === r.id))
          .filter(Boolean) as Signal[];
      }

      await exportSignalToObsidian(signal as Signal, relatedSignals);
      exported++;
    } catch (err: any) {
      errors.push(`${signal.title || signal.id}: ${err.message}`);
    }
  }

  // Generate all category MOCs
  const categories: Category[] = [
    'prompts', 'coding', 'ai-art', 'video', 'tools',
    'philosophy', 'music', 'lifestyle', 'learning', 'other',
  ];
  for (const cat of categories) {
    try {
      await updateCategoryMOC(vaultPath, cat);
    } catch (err: any) {
      errors.push(`MOC ${cat}: ${err.message}`);
    }
  }

  // Generate master index
  try {
    await generateMasterIndex(vaultPath);
  } catch (err: any) {
    errors.push(`Master index: ${err.message}`);
  }

  return { exported, errors };
}
