import Firecrawl from '@mendable/firecrawl-js';
import { ScrapedContent } from '@/types';

export async function scrapeWithFirecrawl(url: string): Promise<ScrapedContent> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  const app = new Firecrawl({ apiKey });
  const result = await app.scrape(url, {
    formats: ['markdown'],
  });

  return {
    title: result.metadata?.title || result.metadata?.ogTitle || 'Untitled',
    content: result.markdown || '',
    description: result.metadata?.description || result.metadata?.ogDescription || undefined,
    url: result.metadata?.sourceURL || url,
    siteName: result.metadata?.ogSiteName || undefined,
    ogImage: result.metadata?.ogImage || undefined,
    author: (result.metadata as Record<string, unknown>)?.author as string || undefined,
    publishedDate: result.metadata?.publishedTime || undefined,
    favicon: result.metadata?.favicon || undefined,
  };
}
