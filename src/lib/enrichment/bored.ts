/**
 * Fetch a random activity suggestion from Bored API.
 */
export async function fetchActivity(): Promise<{ activity: string; type: string; participants: number } | null> {
  try {
    const response = await fetch('https://bored-api.appbrewery.com/random', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      activity: data.activity,
      type: data.type,
      participants: data.participants,
    };
  } catch {
    return null;
  }
}
