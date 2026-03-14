import type { PoemMatchData } from '@/types';
import { getCacheEntry, setCacheEntry } from '@/lib/db/queries';
import { getEmbeddingProvider, vectorToBlob } from '@/lib/embedding/provider';
import { cosineSimilarity } from '@/lib/embedding/search';

interface Poem {
  title: string;
  author: string;
  lines: string[];
}

interface PoemWithEmbedding extends Poem {
  embedding: number[];
}

/**
 * Build the poetry corpus — fetches 200 poems, embeds them, caches in DB.
 * Should be triggered manually from settings (NOT on startup).
 */
export async function buildPoetryCorpus(
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const embeddingProvider = getEmbeddingProvider();
  const poems: PoemWithEmbedding[] = [];
  const totalBatches = 10;

  for (let i = 0; i < totalBatches; i++) {
    try {
      const response = await fetch('https://poetrydb.org/random/20', {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) continue;

      const batchPoems: Poem[] = await response.json();

      for (const poem of batchPoems) {
        try {
          const text = `${poem.title} by ${poem.author}. ${poem.lines.join(' ').slice(0, 500)}`;
          const embedding = await embeddingProvider.embed(text);
          poems.push({ ...poem, embedding });
        } catch {
          // Skip individual poem on embedding failure
        }
      }

      onProgress?.(i + 1, totalBatches);

      // Rate limit: wait 2s between batches
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch {
      // Skip batch on failure
    }
  }

  // Store corpus in cache
  const corpusData = poems.map(p => ({
    title: p.title,
    author: p.author,
    lines: p.lines.slice(0, 10),
    embedding: Array.from(vectorToBlob(p.embedding)),
  }));

  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 10);

  await setCacheEntry('poetry_corpus', corpusData, farFuture.toISOString());
  await setCacheEntry('poetry_corpus_meta', { count: poems.length, builtAt: new Date().toISOString() }, farFuture.toISOString());

  return poems.length;
}

/**
 * Find the best matching poem for a signal's embedding.
 */
export async function findMatchingPoem(signalEmbedding: number[]): Promise<PoemMatchData | null> {
  const corpus = await getCacheEntry('poetry_corpus') as Array<{
    title: string;
    author: string;
    lines: string[];
    embedding: number[];
  }> | null;

  if (!corpus || corpus.length === 0) return null;

  let bestMatch: PoemMatchData | null = null;
  let bestScore = 0.5; // Minimum threshold

  const { blobToVector } = await import('@/lib/embedding/provider');

  for (const poem of corpus) {
    try {
      const poemEmbedding = blobToVector(Buffer.from(poem.embedding));
      const similarity = cosineSimilarity(signalEmbedding, poemEmbedding);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          title: poem.title,
          author: poem.author,
          lines: poem.lines,
          similarity,
        };
      }
    } catch {
      // Skip on error
    }
  }

  return bestMatch;
}

/**
 * Get poetry corpus status.
 */
export async function getPoetryCorpusStatus(): Promise<{ built: boolean; count: number; builtAt: string | null }> {
  const meta = await getCacheEntry('poetry_corpus_meta') as { count: number; builtAt: string } | null;
  return {
    built: meta !== null,
    count: meta?.count ?? 0,
    builtAt: meta?.builtAt ?? null,
  };
}
