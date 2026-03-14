import type { QuoteData } from '@/types';

interface QuoteSource {
  id: string;
  url: string;
  parse: (data: unknown) => QuoteData | null;
}

const QUOTE_SOURCES: QuoteSource[] = [
  {
    id: 'zen',
    url: 'https://zenquotes.io/api/random',
    parse: (data) => {
      const d = data as Array<{ q: string; a: string }>;
      if (!d?.[0]) return null;
      return { text: d[0].q, author: d[0].a, source: 'zen' };
    },
  },
  {
    id: 'stoic',
    url: 'https://stoic.tekloon.net/stoic-quote',
    parse: (data) => {
      const d = data as { quote: string; author: string };
      if (!d?.quote) return null;
      return { text: d.quote, author: d.author, source: 'stoic' };
    },
  },
  {
    id: 'programming',
    url: 'https://programming-quotesapi.vercel.app/api/random',
    parse: (data) => {
      const d = data as { quote: string; author: string };
      if (!d?.quote) return null;
      return { text: d.quote, author: d.author, source: 'programming' };
    },
  },
];

/**
 * Fetch a batch of quotes from multiple sources in parallel.
 */
export async function fetchQuoteBatch(count: number = 10): Promise<QuoteData[]> {
  const quotes: QuoteData[] = [];

  // Fetch from all sources in parallel, repeat to get enough
  const fetches: Promise<QuoteData | null>[] = [];
  for (let i = 0; i < count; i++) {
    const source = QUOTE_SOURCES[i % QUOTE_SOURCES.length];
    fetches.push(fetchSingleQuote(source));
  }

  const results = await Promise.allSettled(fetches);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      quotes.push(result.value);
    }
  }

  return quotes;
}

async function fetchSingleQuote(source: QuoteSource): Promise<QuoteData | null> {
  try {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    return source.parse(data);
  } catch {
    return null;
  }
}
