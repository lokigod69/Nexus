import { format } from 'date-fns';

export function signalsToMarkdown(signals: any[]): string {
  const lines = [
    `# Nexus Knowledge Export`,
    `Exported: ${format(new Date(), 'MMMM d, yyyy')}`,
    `Total signals: ${signals.length}`,
    '',
    '---',
    '',
  ];

  for (const signal of signals) {
    const tagNames = signal.tags?.map((t: any) => t.name || t) || [];
    lines.push(`## ${signal.title}`);
    lines.push(`**URL:** ${signal.url}`);
    lines.push(`**Category:** ${signal.category} | **Source:** ${signal.source} | **Status:** ${signal.status}`);
    if (tagNames.length > 0) lines.push(`**Tags:** ${tagNames.join(', ')}`);
    lines.push('');
    if (signal.summary) lines.push(signal.summary, '');
    if (signal.keyTakeaway) lines.push(`> **Key Takeaway:** ${signal.keyTakeaway}`, '');
    if (signal.extractedContent) {
      lines.push('### Extracted Content', '```', signal.extractedContent, '```', '');
    }
    if (signal.note) lines.push(`**Notes:** ${signal.note}`, '');
    lines.push('---', '');
  }

  return lines.join('\n');
}
