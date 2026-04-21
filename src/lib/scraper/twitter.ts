import { ScrapedContent } from '@/types';

export function isTwitterUrl(url: string): boolean {
  return /(?:x\.com|twitter\.com)\/[^/]+\/status\/\d+/.test(url);
}

export async function scrapeTwitter(url: string): Promise<ScrapedContent> {
  const match = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/);
  if (!match) throw new Error('Not a valid X/Twitter URL');

  const [, username, tweetId] = match;
  const apiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;

  let response;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    response = await fetch(apiUrl);
    if (response.ok) break;
    if (attempt >= maxAttempts) throw new Error(`FixTweet API error: ${response.status}`);
    await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff delay
  }

  const data = await response!.json();
  const tweet = data.tweet;

  if (!tweet) throw new Error('Tweet not found');

  // Extract first image or video thumbnail
  let ogImage: string | null = null;
  if (tweet.media?.photos?.length > 0) {
    ogImage = tweet.media.photos[0].url;
  } else if (tweet.media?.videos?.length > 0) {
    ogImage = tweet.media.videos[0].thumbnail_url;
  }

  // Build rich markdown content
  const content = [
    `# ${tweet.author?.name || username} (@${username})`,
    '',
    tweet.text || '',
    '',
    tweet.media?.photos?.length
      ? `Images: ${tweet.media.photos.map((p: { url: string }) => p.url).join(', ')}`
      : '',
    '',
    `Posted: ${tweet.created_at || 'unknown'}`,
    `Likes: ${tweet.likes || 0} | Retweets: ${tweet.retweets || 0} | Replies: ${tweet.replies || 0}`,
    '',
    tweet.quote
      ? `> Quoted tweet from @${tweet.quote.author?.screen_name}: ${tweet.quote.text}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const tweetText = tweet.text || '';

  return {
    title: `${tweet.author?.name || username}: "${tweetText.substring(0, 80)}${tweetText.length > 80 ? '...' : ''}"`,
    content,
    description: tweetText.substring(0, 200),
    url,
    siteName: 'X/Twitter',
    ogImage: ogImage || undefined,
    favicon: tweet.author?.avatar_url || undefined,
    author: tweet.author?.name || username,
    publishedDate: tweet.created_at || undefined,
  };
}
