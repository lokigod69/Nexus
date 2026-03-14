// RSS feed subscription support — placeholder for Phase 2D
// Will use rss2json API or rss-parser npm package

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

/**
 * Check an RSS feed for new items via rss2json free API.
 */
export async function checkFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) return [];
    const data = await response.json();

    if (data.status !== 'ok') return [];

    return (data.items || []).map((item: { title: string; link: string; pubDate: string; description: string }) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      description: item.description,
    }));
  } catch {
    return [];
  }
}
