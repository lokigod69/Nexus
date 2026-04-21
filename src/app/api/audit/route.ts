import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/provider';
import { getAllSignals } from '@/lib/db/queries';

const AUDIT_PROMPT = `You are analyzing a personal knowledge collection to identify gaps and suggest areas for growth.

Here is what the user has collected so far:

{categorySummary}

Based on this collection, provide:

1. STRENGTHS: What areas are well-covered? What themes emerge?

2. GAPS: What important related topics are missing? For each gap, explain WHY it would be valuable given what they already collect. Be specific — don't just say "health" but say "You have lots of AI coding tools but nothing about developer ergonomics, RSI prevention, or focus techniques — which directly impact how effectively you use those tools."

3. SURPRISING CONNECTIONS: What unexpected links do you see between their signals that they might not have noticed?

4. SUGGESTED SEARCHES: Give 5 specific search queries or topics they could look into next to round out their collection. Make these actionable — things they could paste into X search or Google right now.

Format your response as clean markdown with ## headers for each section.`;

export async function POST() {
  try {
    const { signals } = await getAllSignals({ limit: 10000 });

    if (signals.length === 0) {
      return NextResponse.json(
        { error: 'No signals to audit. Capture some signals first!' },
        { status: 400 }
      );
    }

    // Build category distribution
    const categoryDist: Record<string, number> = {};
    const tagFreq: Record<string, number> = {};
    const categorySignals: Record<string, string[]> = {};

    for (const signal of signals) {
      const cat = signal.category || 'other';
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;

      if (!categorySignals[cat]) categorySignals[cat] = [];
      categorySignals[cat].push(signal.title || 'Untitled');

      const tags = signal.tags || [];
      for (const tag of tags) {
        const name = typeof tag === 'string' ? tag : tag.name;
        if (name) tagFreq[name] = (tagFreq[name] || 0) + 1;
      }
    }

    // Top 20 tags
    const topTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');

    // Build summary
    const parts: string[] = [];
    parts.push(`Total signals: ${signals.length}`);
    parts.push('');
    parts.push('Category distribution:');
    for (const [cat, count] of Object.entries(categoryDist).sort((a, b) => b[1] - a[1])) {
      parts.push(`- ${cat}: ${count} signals`);
    }
    parts.push('');
    parts.push(`Top tags: ${topTags || 'none'}`);
    parts.push('');

    // Per-category coverage (signal titles)
    for (const [cat, titles] of Object.entries(categorySignals)) {
      parts.push(`${cat} signals:`);
      for (const title of titles.slice(0, 15)) {
        parts.push(`  - ${title}`);
      }
      if (titles.length > 15) {
        parts.push(`  - ... and ${titles.length - 15} more`);
      }
      parts.push('');
    }

    const categorySummary = parts.join('\n');
    const prompt = AUDIT_PROMPT.replace('{categorySummary}', categorySummary);

    // Use the provider pattern — respects user's provider selection
    const aiProvider = await getAIProvider();
    let auditText = '';

    // Use streaming chat and collect full response
    const messages = [{ id: 'audit', conversationId: 'audit', role: 'user' as const, content: prompt, createdAt: new Date().toISOString() }];

    for await (const chunk of aiProvider.chat(messages, 'You are a knowledge collection auditor. Be specific, insightful, and actionable.')) {
      auditText += chunk;
    }

    return NextResponse.json({ audit: auditText });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Audit failed';
    console.error('[audit]', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
