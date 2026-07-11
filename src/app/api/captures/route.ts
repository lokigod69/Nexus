import { NextRequest, NextResponse } from 'next/server';
import { createCapture, listCaptures } from '@/lib/db/queries';
import type {
  CaptureStatus,
  CreateCaptureResponse,
  ListCapturesResponse,
} from '@/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: CaptureStatus[] = ['inbox', 'routed', 'delivered', 'archived'];

/** Trimmed content that parses as a single http(s) URL (no whitespace) → url capture. */
function detectUrl(trimmed: string): string | null {
  if (/\s/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return trimmed;
  } catch {
    // not a URL
  }
  return null;
}

function sourceFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/** POST /api/captures — instant create (no scraping/AI inline; the UI is
 *  optimistic and enrichment is the separate /enrich call). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const content = typeof body?.content === 'string' ? body.content : '';
    const trimmed = content.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const url = detectUrl(trimmed);
    const capture = await createCapture({
      kind: url ? 'url' : 'text',
      content, // verbatim — never rewritten
      url,
      source: url ? sourceFromUrl(url) : null,
    });

    const response: CreateCaptureResponse = { capture };
    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/captures failed:', error);
    return NextResponse.json({ error: 'Failed to create capture' }, { status: 500 });
  }
}

/** GET /api/captures?status=<CaptureStatus>&limit=50 (default status=inbox) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get('status') || 'inbox';
    if (!VALID_STATUSES.includes(statusParam as CaptureStatus)) {
      return NextResponse.json({ error: `Invalid status: ${statusParam}` }, { status: 400 });
    }

    const limitParam = Number(searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.floor(limitParam), 1), 200)
      : 50;

    const captures = await listCaptures(statusParam as CaptureStatus, limit);
    const response: ListCapturesResponse = { captures };
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/captures failed:', error);
    return NextResponse.json({ error: 'Failed to list captures' }, { status: 500 });
  }
}
