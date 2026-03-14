import { NextResponse } from 'next/server';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';
import { generatePalette } from '@/lib/enrichment/colors';

export async function GET() {
  try {
    // Check cache first
    const cached = await getCacheEntry('daily_palette');
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch new palette from Colormind (HTTP only — server-side)
    const palette = await generatePalette();
    if (!palette) {
      return NextResponse.json({ colors: null });
    }

    // Cache until midnight
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    await setCacheEntry('daily_palette', palette, tomorrow.toISOString());

    return NextResponse.json(palette);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch palette';
    return NextResponse.json({ error: message, colors: null }, { status: 500 });
  }
}
