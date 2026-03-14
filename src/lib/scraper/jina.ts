import { ScrapedContent } from '@/types';

export async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Jina scrape failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      title: data.data?.title || data.title || 'Untitled',
      content: data.data?.content || data.content || '',
      description: data.data?.description || data.description || null,
      url: data.data?.url || url,
      siteName: data.data?.siteName || null,
      ogImage: data.data?.image || data.data?.ogImage || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
