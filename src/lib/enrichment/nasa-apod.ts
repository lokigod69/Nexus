import type { APODData } from '@/types';

/**
 * Fetch NASA Astronomy Picture of the Day.
 */
export async function fetchAPOD(): Promise<APODData | null> {
  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;
    const data = await response.json();

    return {
      url: data.url,
      hdurl: data.hdurl || null,
      title: data.title,
      explanation: data.explanation,
      mediaType: data.media_type,
    };
  } catch {
    return null;
  }
}
