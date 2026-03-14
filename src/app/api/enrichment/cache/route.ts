import { NextResponse } from 'next/server';
import { getEnrichmentCacheStats, clearEnrichmentCache } from '@/lib/db/queries';

export async function GET() {
  try {
    const stats = await getEnrichmentCacheStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get cache stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearEnrichmentCache();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear cache';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
