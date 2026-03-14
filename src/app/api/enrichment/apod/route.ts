import { NextResponse } from 'next/server';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';
import { fetchAPOD } from '@/lib/enrichment/nasa-apod';

export async function GET() {
  try {
    // Check cache first
    const cached = await getCacheEntry('apod_today');
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch today's APOD
    const apod = await fetchAPOD();
    if (!apod) {
      return NextResponse.json({ url: null });
    }

    // Cache until midnight
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    await setCacheEntry('apod_today', apod, tomorrow.toISOString());

    return NextResponse.json(apod);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch APOD';
    return NextResponse.json({ error: message, url: null }, { status: 500 });
  }
}
