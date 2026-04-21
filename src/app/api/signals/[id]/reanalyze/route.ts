import { NextRequest, NextResponse } from 'next/server';
import {
  getSignalById,
  getConversation,
  getMessages,
  updateSignal,
  updateSignalEmbedding,
  upsertSignalEnrichment,
} from '@/lib/db/queries';
import { getAIProvider } from '@/lib/ai/provider';
import {
  getEmbeddingProvider,
  vectorToBlob,
  composeEmbeddingText,
} from '@/lib/embedding/provider';
import { BRAIN_DUMP_ANALYZE_PROMPT } from '@/lib/ai/prompts';
import { runSignalEnrichments } from '@/lib/enrichment';
import { scrape } from '@/lib/scraper';
import { exportSignalToObsidianWithRelated } from '@/lib/export/obsidian-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signal = await getSignalById(id);
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Parse optional body for rescrape flag
    const body = await request.json().catch(() => ({}));
    const shouldRescrape = body.rescrape === true;

    let content = signal.rawScrapedContent;
    const contentTooShort = !content || content.length < 100;

    // Re-scrape if requested or content is missing/too short
    if (signal.url && (shouldRescrape || contentTooShort)) {
      try {
        const scraped = await scrape(signal.url);
        content = scraped.content;
        await updateSignal(id, { rawScrapedContent: content } as any);
        if (scraped.ogImage) {
          await upsertSignalEnrichment(id, 'og_image', { url: scraped.ogImage });
        }
        if (scraped.author) {
          await upsertSignalEnrichment(id, 'author', { name: scraped.author });
        }
        if (scraped.publishedDate) {
          await upsertSignalEnrichment(id, 'published_date', { date: scraped.publishedDate });
        }
      } catch (err) {
        console.warn('Re-scrape failed, using existing content:', err);
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'No raw content available for re-analysis' },
        { status: 400 }
      );
    }

    // Load conversation history for enriched context
    let conversationContext = '';
    const conversation = await getConversation(id);
    if (conversation) {
      const msgs = await getMessages(conversation.id!);
      if (msgs.length > 0) {
        const summary = msgs
          .slice(-10) // Last 10 messages
          .map((m: { role: string; content: string }) => `${m.role}: ${m.content.substring(0, 200)}`)
          .join('\n');
        conversationContext = `\n\nThe user has had the following conversation about this content:\n${summary}`;
      }
    }

    // Run AI analysis with appropriate prompt
    const aiProvider = await getAIProvider();
    const isBrainDump = signal.source === 'brain_dump';
    const customPrompt = isBrainDump ? BRAIN_DUMP_ANALYZE_PROMPT : undefined;
    const contentWithContext = content + conversationContext;
    const analysis = await aiProvider.summarize(
      contentWithContext,
      isBrainDump ? '' : (signal.url || ''),
      customPrompt
    );

    // Update signal fields
    await updateSignal(id, {
      title: analysis.title,
      summary: analysis.summary,
      keyTakeaway: analysis.keyTakeaway,
      extractedContent: analysis.extractedContent || null,
      extractedContentType: analysis.extractedContentType || 'none',
      category: analysis.category || signal.category,
      contentType: analysis.contentType || signal.contentType,
      actionable: analysis.actionable ? 1 : 0,
      aiProvider: process.env.OPENROUTER_KEY ? 'openrouter' : 'openai',
    } as any);

    // Recompute embedding with new analysis
    const embeddingText = composeEmbeddingText({
      title: analysis.title,
      summary: analysis.summary,
      keyTakeaway: analysis.keyTakeaway,
      extractedContent: analysis.extractedContent || null,
      rawScrapedContent: isBrainDump ? content : null,
      note: signal.note || null,
      source: signal.source,
      tags: analysis.tags || [],
    });

    const embeddingProvider = getEmbeddingProvider();
    const vector = await embeddingProvider.embed(embeddingText);
    const embeddingBlob = vectorToBlob(vector);
    await updateSignalEmbedding(
      id,
      embeddingBlob,
      embeddingProvider.getModelName(),
      embeddingProvider.getDimension()
    );

    // Re-run enrichments with new analysis (skip for brain dumps — no URL)
    if (signal.url) {
      runSignalEnrichments(id, signal.url, analysis, vector).catch(err => {
        console.warn('Re-analysis enrichment pass failed:', err instanceof Error ? err.message : err);
      });
    }

    // Re-export to Obsidian (fire-and-forget)
    if (process.env.OBSIDIAN_VAULT_PATH) {
      exportSignalToObsidianWithRelated(id).catch(err => {
        console.warn('[obsidian-sync] Re-export after reanalyze failed:', err instanceof Error ? err.message : err);
      });
    }

    // Return updated signal
    const updated = await getSignalById(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Re-analysis failed:', error);
    return NextResponse.json(
      { error: error.message || 'Re-analysis failed' },
      { status: 500 }
    );
  }
}
