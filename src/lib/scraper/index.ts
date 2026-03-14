import { ScrapedContent } from '@/types';
import { scrapeWithJina } from './jina';
import { scrapeFallback } from './fallback';

export async function scrape(url: string): Promise<ScrapedContent> {
  try {
    return await scrapeWithJina(url);
  } catch (error) {
    console.warn('Jina scrape failed, falling back:', error);
    return await scrapeFallback(url);
  }
}
