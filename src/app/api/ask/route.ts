import { NextRequest, NextResponse } from 'next/server';
import { getAskCandidates } from '@/lib/db/queries';
import { askCaptures } from '@/lib/ai/ask';
import type { AskResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Keywords for SQL retrieval: lowercase alphanumeric words ≥4 chars. */
function extractKeywords(question: string): string[] {
  const words = question.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(words.filter((w) => w.length >= 4))];
}

/** POST /api/ask — one-shot Q&A over the capture history.
 *  Retrieval is plain SQL (recency + keyword LIKE), no embeddings. AI
 *  failure across the whole fallback chain → 502 { error } — never a
 *  fabricated 200. */
export async function POST(request: NextRequest) {
  let question: string;
  try {
    const body = await request.json().catch(() => null);
    question =
      body && typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  try {
    // Retrieval: recent 15 ∪ keyword LIKE matches, deduped, capped at 30.
    const candidates = await getAskCandidates(extractKeywords(question));

    let result;
    try {
      result = await askCaptures(question, candidates);
    } catch (error) {
      console.error('[ask] every model in the chain failed:', error);
      return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
    }

    // referenceIds must be ⊆ candidates — drop anything the model made up.
    const cited = new Set(result.referenceIds);
    const references = candidates
      .filter((c) => cited.has(c.id))
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        projects: c.projects,
        url: c.url,
      }));

    const response: AskResponse = { answer: result.answer, references };
    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/ask failed:', error);
    return NextResponse.json({ error: 'Failed to answer question' }, { status: 500 });
  }
}
