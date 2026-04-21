import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSignals,
  createSignal,
  getAllSignalEmbeddings,
  getAllSignalEmbeddingsWithCategory,
  updateSignalEmbedding,
  updateSignalPositions,
  getSignalByUrl,
  upsertSignalEnrichment,
} from '@/lib/db/queries';
import { scrape } from '@/lib/scraper';
import { getAIProvider } from '@/lib/ai/provider';
import {
  getEmbeddingProvider,
  vectorToBlob,
  composeEmbeddingText,
} from '@/lib/embedding/provider';
import { computePositions } from '@/lib/embedding/umap';
import { detectSource, isValidUrl } from '@/lib/utils/url';
import { runSignalEnrichments } from '@/lib/enrichment';
import { BRAIN_DUMP_ANALYZE_PROMPT } from '@/lib/ai/prompts';
import { exportSignalToObsidianWithRelated } from '@/lib/export/obsidian-sync';

// --- UMAP debounce ---
let umapTimeout: NodeJS.Timeout | null = null;

async function debouncedRecompute() {
  if (umapTimeout) clearTimeout(umapTimeout);
  umapTimeout = setTimeout(async () => {
    try {
      const allEmbeddings = await getAllSignalEmbeddingsWithCategory();
      const positions = computePositions(
        allEmbeddings.map((e: { id: string | null; embedding: unknown; category: string | null }) => ({
          id: e.id!,
          embedding: e.embedding as Buffer,
          category: e.category || 'other',
        }))
      );
      await updateSignalPositions(positions);
    } catch (err) {
      console.error('UMAP recompute error:', err);
    }
  }, 5000);
}

// --- Capture a single signal ---
async function captureSingleSignal(
  url: string,
  skipAnalysis?: boolean,
  note?: string | null,
  category?: string | null
) {
  // 1. Scrape
  const scraped = await scrape(url);

  // 2. Detect source
  const source = detectSource(url);

  // 3. AI analysis (unless skipped)
  let analysis = null;
  let analysisError: string | null = null;
  if (!skipAnalysis) {
    try {
      console.log('[capture] Starting AI analysis for:', url);
      const aiProvider = await getAIProvider();
      analysis = await aiProvider.summarize(scraped.content, url);
      console.log('[capture] AI analysis succeeded, title:', analysis.title);
    } catch (err: any) {
      analysisError = err.message || 'Unknown AI analysis error';
      console.error('[capture] AI analysis failed:', analysisError);
    }
  }

  // 4. Compose embedding text and generate embedding
  const embeddingText = composeEmbeddingText({
    title: analysis?.title || scraped.title,
    summary: analysis?.summary || null,
    keyTakeaway: analysis?.keyTakeaway || null,
    extractedContent: analysis?.extractedContent || null,
    note: note || null,
    tags: analysis?.tags || [],
  });

  const embeddingProvider = getEmbeddingProvider();
  const vector = await embeddingProvider.embed(embeddingText);
  const embeddingBlob = vectorToBlob(vector);

  // 5. Create signal in DB
  const signal = await createSignal({
    url,
    title: analysis?.title || scraped.title,
    summary: analysis?.summary || null,
    keyTakeaway: analysis?.keyTakeaway || null,
    extractedContent: analysis?.extractedContent || null,
    extractedContentType: analysis?.extractedContentType || 'none',
    rawScrapedContent: scraped.content,
    category: category || analysis?.category || 'other',
    contentType: analysis?.contentType || 'article',
    source,
    status: 'inbox',
    actionable: analysis?.actionable ? 1 : 0,
    note: note || null,
    aiProvider: skipAnalysis ? null : (process.env.OPENROUTER_KEY ? 'openrouter' : 'openai'),
    tags: analysis?.tags || [],
  });

  // 6. Update embedding separately
  await updateSignalEmbedding(
    signal.id!,
    embeddingBlob,
    embeddingProvider.getModelName(),
    embeddingProvider.getDimension()
  );

  // 6.5 Store scrape metadata as enrichments
  if (scraped.ogImage) {
    await upsertSignalEnrichment(signal.id!, 'og_image', { url: scraped.ogImage });
  }
  if (scraped.author) {
    await upsertSignalEnrichment(signal.id!, 'author', { name: scraped.author });
  }
  if (scraped.publishedDate) {
    await upsertSignalEnrichment(signal.id!, 'published_date', { date: scraped.publishedDate });
  }

  // 6.6 Run enrichments (non-blocking)
  runSignalEnrichments(signal.id!, url, analysis, vector).catch(err => {
    console.warn('Enrichment pass failed:', err instanceof Error ? err.message : err);
  });

  // 7. Trigger debounced UMAP recompute
  debouncedRecompute();

  // 8. Auto-export to Obsidian (fire-and-forget)
  if (process.env.OBSIDIAN_VAULT_PATH) {
    exportSignalToObsidianWithRelated(signal.id!).catch(err => {
      console.warn('[obsidian-sync] Auto-export failed:', err instanceof Error ? err.message : err);
    });
  }

  return { signal, analysisError };
}

// --- Capture a brain dump (no URL, no scrape) ---
async function captureBrainDump(
  content: string,
  title?: string | null,
  contentType?: string | null,
  category?: string | null,
  note?: string | null
) {
  // 1. AI analysis with brain dump prompt
  let analysis = null;
  let analysisError: string | null = null;
  try {
    console.log('[capture] Starting AI analysis for brain dump');
    const aiProvider = await getAIProvider();
    analysis = await aiProvider.summarize(content, '', BRAIN_DUMP_ANALYZE_PROMPT);
    console.log('[capture] Brain dump AI analysis succeeded, title:', analysis.title);
  } catch (err: any) {
    analysisError = err.message || 'Unknown AI analysis error';
    console.error('[capture] Brain dump AI analysis failed:', analysisError);
  }

  // 2. Compose embedding text and generate embedding
  const embeddingText = composeEmbeddingText({
    title: title || analysis?.title || 'Untitled thought',
    summary: analysis?.summary || null,
    keyTakeaway: analysis?.keyTakeaway || null,
    extractedContent: analysis?.extractedContent || null,
    rawScrapedContent: content,
    note: note || null,
    source: 'brain_dump',
    tags: analysis?.tags || [],
  });

  const embeddingProvider = getEmbeddingProvider();
  const vector = await embeddingProvider.embed(embeddingText);
  const embeddingBlob = vectorToBlob(vector);

  // 3. Create signal in DB
  const signal = await createSignal({
    url: null,
    title: title || analysis?.title || 'Untitled thought',
    summary: analysis?.summary || null,
    keyTakeaway: analysis?.keyTakeaway || null,
    extractedContent: analysis?.extractedContent || null,
    extractedContentType: analysis?.extractedContentType || 'none',
    rawScrapedContent: content,
    category: category || analysis?.category || 'other',
    contentType: contentType || analysis?.contentType || 'note',
    source: 'brain_dump',
    status: 'inbox',
    actionable: analysis?.actionable ? 1 : 0,
    note: note || null,
    aiProvider: process.env.OPENROUTER_KEY ? 'openrouter' : 'openai',
    tags: analysis?.tags || [],
  });

  // 4. Update embedding
  await updateSignalEmbedding(
    signal.id!,
    embeddingBlob,
    embeddingProvider.getModelName(),
    embeddingProvider.getDimension()
  );

  // 5. Store suggested emoji as enrichment
  if (analysis?.suggestedEmoji) {
    await upsertSignalEnrichment(signal.id!, 'emoji', { emoji: analysis.suggestedEmoji });
  }

  // 6. Store book references as enrichment
  if (analysis?.bookReferences && analysis.bookReferences.length > 0) {
    await upsertSignalEnrichment(signal.id!, 'book_ref', analysis.bookReferences[0]);
  }

  // 7. Trigger debounced UMAP recompute
  debouncedRecompute();

  // 8. Auto-export to Obsidian (fire-and-forget)
  if (process.env.OBSIDIAN_VAULT_PATH) {
    exportSignalToObsidianWithRelated(signal.id!).catch(err => {
      console.warn('[obsidian-sync] Auto-export failed:', err instanceof Error ? err.message : err);
    });
  }

  return { signal, analysisError };
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Brain dump mode
    if (body.source === 'brain_dump' && body.content) {
      const { content, title, contentType, category, note } = body;
      const { signal, analysisError } = await captureBrainDump(
        content, title, contentType, category, note
      );
      return NextResponse.json({ ...signal, _analysisError: analysisError }, { status: 201 });
    }

    // Bulk mode
    if (body.urls && Array.isArray(body.urls)) {
      const results = [];
      for (const url of body.urls) {
        try {
          const result = await captureSingleSignal(
            url,
            body.skipAnalysis,
            null,
            null
          );
          results.push({ url, signal: result.signal, success: true, _analysisError: result.analysisError });
          if (body.urls.indexOf(url) < body.urls.length - 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (err: any) {
          results.push({ url, error: err.message, success: false });
        }
      }
      return NextResponse.json({ results }, { status: 201 });
    }

    // Single URL mode
    const { url, note, category, skipAnalysis } = body;
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Check for duplicate URL
    const existing = await getSignalByUrl(url);
    if (existing) {
      return NextResponse.json(
        { error: 'This URL has already been captured', existingId: existing.id },
        { status: 409 }
      );
    }

    const { signal, analysisError } = await captureSingleSignal(url, skipAnalysis, note, category);
    return NextResponse.json({ ...signal, _analysisError: analysisError }, { status: 201 });
  } catch (error: any) {
    console.error('Signal capture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture signal' },
      { status: 500 }
    );
  }
}

// --- GET handler ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
      sort: (searchParams.get('sort') as 'newest' | 'oldest' | 'starred') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : undefined,
    };

    const { signals, total } = await getAllSignals(filters);
    return NextResponse.json({ signals, total });
  } catch (error: any) {
    console.error('Get signals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
