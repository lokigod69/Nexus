import { ScrapedContent } from '@/types';
import { scrapeTwitter, isTwitterUrl } from './twitter';
import { scrapeWithFirecrawl } from './firecrawl';
import { scrapeWithJina } from './jina';
import { scrapeFallback } from './fallback';

export async function scrape(url: string): Promise<ScrapedContent> {
  // 1. X/Twitter gets dedicated FixTweet scraper
  if (isTwitterUrl(url)) {
    try {
      console.log('Using FixTweet for X/Twitter URL');
      return await scrapeTwitter(url);
    } catch (error) {
      console.warn('FixTweet failed, falling back to Jina:', error);
    }
    // Skip Firecrawl for Twitter (returns 403), go straight to Jina
    try {
      return await scrapeWithJina(url);
    } catch (error) {
      console.warn('Jina scrape failed, falling back to HTML:', error);
    }
    return await scrapeFallback(url);
  }

  // 2. Try Firecrawl (primary for non-Twitter)
  try {
    return await scrapeWithFirecrawl(url);
  } catch (error) {
    console.warn('Firecrawl scrape failed, falling back to Jina:', error);
  }

  // 3. Try Jina (first fallback)
  try {
    return await scrapeWithJina(url);
  } catch (error) {
    console.warn('Jina scrape failed, falling back to HTML:', error);
  }

  // 4. HTML regex fallback (last resort)
  return await scrapeFallback(url);
}
