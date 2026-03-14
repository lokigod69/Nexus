import { NextResponse } from 'next/server';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';

const CACHE_KEY = 'bored_activity';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  try {
    const cached = await getCacheEntry(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const res = await fetch('https://bored-api.appbrewery.com/random', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Bored API failed');
    const data = await res.json();

    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    await setCacheEntry(CACHE_KEY, data, expiresAt);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
