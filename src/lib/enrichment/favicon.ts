import type { FaviconData } from '@/types';

/**
 * Fetch favicon URL for a given page URL.
 * Uses Icon Horse as primary, Google Favicon as fallback.
 * Returns URL only — does NOT download the image.
 */
export async function fetchFavicon(url: string): Promise<FaviconData | null> {
  try {
    const domain = new URL(url).hostname;
    const iconHorseUrl = `https://icon.horse/icon/${domain}`;

    // Verify Icon Horse works with a HEAD request
    try {
      const res = await fetch(iconHorseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return { url: iconHorseUrl, source: domain };
      }
    } catch {
      // Fall through to Google fallback
    }

    // Fallback: Google Favicon
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    return { url: googleUrl, source: domain };
  } catch {
    return null;
  }
}
