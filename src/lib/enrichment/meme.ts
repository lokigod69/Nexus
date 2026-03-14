interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

/**
 * Fetch the list of popular meme templates from Imgflip.
 */
export async function fetchMemeList(): Promise<MemeTemplate[]> {
  try {
    const response = await fetch('https://api.imgflip.com/get_memes', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.success) return [];
    return data.data.memes.slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * Get a random meme template URL.
 */
export function getRandomMeme(memes: MemeTemplate[]): MemeTemplate | null {
  if (memes.length === 0) return null;
  return memes[Math.floor(Math.random() * memes.length)];
}
