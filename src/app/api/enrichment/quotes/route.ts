import { NextResponse } from 'next/server';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';
import { fetchQuoteBatch } from '@/lib/enrichment/quotes';

export async function GET() {
  try {
    // Check cache first
    const cached = await getCacheEntry('quotes_batch');
    if (cached) {
      return NextResponse.json({ quotes: cached });
    }

    // Fetch fresh batch
    const quotes = await fetchQuoteBatch(10);

    // Cache for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    if (quotes.length > 0) {
      await setCacheEntry('quotes_batch', quotes, expiresAt);
    }

    return NextResponse.json({ quotes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch quotes';
    return NextResponse.json({ error: message, quotes: [] }, { status: 500 });
  }
}
