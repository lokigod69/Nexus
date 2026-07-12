import { NextRequest, NextResponse } from 'next/server';
import { getCapture, listProjects, updateCapture } from '@/lib/db/queries';
import { enrichCapture } from '@/lib/ai/enrich';
import { scrape } from '@/lib/scraper';
import type { EnrichRequest, EnrichResponse, ScrapedContent } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** POST /api/captures/[id]/enrich — scrape (if url) + one AI call.
 *  Optional body { modelId } forces one specific model for this call only.
 *
 *  CONTRACT: never 500s on scrape/AI failure. Any failure resolves to
 *  enrichStatus 'failed' with a 200 — the capture must stay routable even
 *  when enrichment dies. Only an unknown id is a genuine 404. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let modelId: string | undefined;
  try {
    const body = (await request.json()) as EnrichRequest;
    modelId = body?.modelId;
  } catch {
    // No/empty body is the common case (auto chain) — not an error.
  }

  try {
    const capture = await getCapture(id);
    if (!capture) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }

    // 1. Scrape (URL captures only). Failure is not fatal — enrich from
    //    the URL/content alone.
    let scraped: ScrapedContent | null = null;
    if (capture.kind === 'url' && capture.url) {
      try {
        scraped = await scrape(capture.url);
      } catch (error) {
        console.warn(`[enrich] scrape failed for ${capture.url}:`, error);
      }
    }

    const extract = scraped?.content ? scraped.content.substring(0, 8000) : null;

    // 2. One AI call against the current project registry.
    try {
      const registry = await listProjects();
      const result = await enrichCapture(
        {
          kind: capture.kind,
          content: capture.content,
          url: capture.url,
          scraped,
          projects: registry.map((p) => ({
            slug: p.slug,
            name: p.name,
            description: p.description,
          })),
        },
        modelId
      );

      const updated = await updateCapture(id, {
        title: result.title,
        summary: result.summary || null,
        takeaway: result.takeaway || null,
        tags: result.tags,
        suggestedProject: result.suggestedProject,
        suggestedReason: result.suggestedReason || null,
        extract,
        enrichStatus: 'done',
      });

      const response: EnrichResponse = { capture: updated! };
      return NextResponse.json(response);
    } catch (error) {
      console.error(`[enrich] AI enrichment failed for ${id}:`, error);
      const failed = await updateCapture(id, {
        enrichStatus: 'failed',
        // Keep whatever the scraper got — still useful for the human.
        ...(extract ? { extract } : {}),
      });
      const response: EnrichResponse = { capture: failed! };
      return NextResponse.json(response);
    }
  } catch (error) {
    // Last-resort degradation: even unexpected errors must not 500 if the
    // capture exists — try to mark it failed and return it.
    console.error('POST /api/captures/[id]/enrich failed:', error);
    try {
      const failed = await updateCapture(id, { enrichStatus: 'failed' });
      if (failed) {
        return NextResponse.json({ capture: failed } satisfies EnrichResponse);
      }
    } catch {
      // fall through
    }
    return NextResponse.json({ error: 'Failed to enrich capture' }, { status: 500 });
  }
}
