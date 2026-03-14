/**
 * Fetch a random useless fact.
 */
export async function fetchRandomFact(): Promise<{ text: string } | null> {
  try {
    const response = await fetch(
      'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return { text: data.text };
  } catch {
    return null;
  }
}
