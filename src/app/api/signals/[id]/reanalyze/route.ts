import { NextRequest, NextResponse } from 'next/server';
import {
  getSignalById,
  updateSignal,
  updateSignalEmbedding,
} from '@/lib/db/queries';
import { getAIProvider } from '@/lib/ai/provider';
import {
  getEmbeddingProvider,
  vectorToBlob,
  composeEmbeddingText,
} from '@/lib/embedding/provider';
import { runSignalEnrichments } from '@/lib/enrichment';

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

    const content = signal.rawScrapedContent;
    if (!content) {
      return NextResponse.json(
        { error: 'No raw content available for re-analysis' },
        { status: 400 }
      );
    }

    // Run AI analysis
    const aiProvider = getAIProvider();
    const analysis = await aiProvider.summarize(content, signal.url);

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
      aiProvider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai',
    } as any);

    // Recompute embedding with new analysis
    const embeddingText = composeEmbeddingText({
      title: analysis.title,
      summary: analysis.summary,
      keyTakeaway: analysis.keyTakeaway,
      extractedContent: analysis.extractedContent || null,
      note: signal.note || null,
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

    // Re-run enrichments with new analysis
    runSignalEnrichments(id, signal.url, analysis, vector).catch(err => {
      console.warn('Re-analysis enrichment pass failed:', err instanceof Error ? err.message : err);
    });

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
