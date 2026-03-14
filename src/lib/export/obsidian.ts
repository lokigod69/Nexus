import { Signal } from '@/types';
import { format } from 'date-fns';
import { slugify } from '@/lib/utils/url';

export function signalToObsidianMd(signal: any): { filename: string; content: string } {
  const date = format(new Date(signal.createdAt), 'yyyy-MM-dd');
  const slug = slugify(signal.title);
  const filename = `${date}_${signal.category}_${slug}.md`;

  const tagNames = signal.tags?.map((t: any) => t.name || t) || [];

  const frontmatter = [
    '---',
    `title: "${signal.title.replace(/"/g, '\\"')}"`,
    `url: "${signal.url}"`,
    `source: "${signal.source}"`,
    `category: "${signal.category}"`,
    `content_type: "${signal.contentType}"`,
    'tags:',
    ...tagNames.map((t: string) => `  - ${t}`),
    `status: "${signal.status}"`,
    `created: ${date}`,
    '---',
  ].join('\n');

  const sections = [frontmatter, ''];

  sections.push('## Summary', signal.summary || 'No summary.', '');

  if (signal.keyTakeaway) {
    sections.push('## Key Takeaway', signal.keyTakeaway, '');
  }

  if (signal.extractedContent) {
    const label = signal.extractedContentType === 'code' ? 'Extracted Code'
      : signal.extractedContentType === 'prompt' ? 'Extracted Prompt'
      : 'Extracted Content';
    sections.push(`## ${label}`, '```', signal.extractedContent, '```', '');
  }

  if (signal.note) {
    sections.push('## My Notes', signal.note, '');
  }

  return { filename, content: sections.join('\n') };
}
