import { NextResponse } from 'next/server';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';
import { fetchWeather } from '@/lib/enrichment/weather-fx';

export async function GET() {
  try {
    // Check cache (30-minute TTL)
    const cached = await getCacheEntry('weather_current');
    if (cached) {
      return NextResponse.json(cached);
    }

    const weather = await fetchWeather();
    if (!weather) {
      return NextResponse.json({ condition: null });
    }

    // Cache for 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await setCacheEntry('weather_current', weather, expiresAt);

    return NextResponse.json(weather);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch weather';
    return NextResponse.json({ error: message, condition: null }, { status: 500 });
  }
}
