import { ScrapedContent } from '@/types';

export async function scrapeFallback(url: string): Promise<ScrapedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Nexus/1.0)' },
    });
    const html = await response.text();

    const getMetaContent = (name: string): string | null => {
      const match =
        html.match(
          new RegExp(
            `<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
            'i'
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${name}["']`,
            'i'
          )
        );
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    return {
      title:
        getMetaContent('og:title') || titleMatch?.[1]?.trim() || 'Untitled',
      content: getMetaContent('og:description') || '',
      description:
        getMetaContent('og:description') ||
        getMetaContent('description') ||
        null,
      url,
      siteName: getMetaContent('og:site_name') || null,
      ogImage: getMetaContent('og:image') || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
