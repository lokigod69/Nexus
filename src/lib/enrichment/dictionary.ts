import type { DictionaryResult } from '@/types';

/**
 * Fetch word definition from the Free Dictionary API.
 * This is called client-side (CORS-friendly).
 */
export async function fetchDefinition(word: string): Promise<DictionaryResult | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text || null,
      meanings: (entry.meanings || []).map((m: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 3).map((d: { definition: string; example?: string }) => ({
          definition: d.definition,
          example: d.example,
        })),
      })),
    };
  } catch {
    return null;
  }
}
