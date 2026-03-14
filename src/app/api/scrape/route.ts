import { NextRequest, NextResponse } from 'next/server';
import { scrape } from '@/lib/scraper';
import { isValidUrl } from '@/lib/utils/url';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const scraped = await scrape(url);
    return NextResponse.json(scraped);
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}
