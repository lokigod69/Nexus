import { EmbeddingProvider, Signal } from '@/types';
import { GeminiEmbeddingProvider } from './gemini';

// --- Blob Utilities ---

export function vectorToBlob(vector: number[]): Buffer {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
  return buffer;
}

export function blobToVector(blob: Buffer): number[] {
  const vector: number[] = [];
  for (let i = 0; i < blob.length; i += 4) {
    vector.push(blob.readFloatLE(i));
  }
  return vector;
}

// --- Compose embedding text from signal fields ---

export function composeEmbeddingText(
  signal: {
    title?: string | null;
    summary?: string | null;
    keyTakeaway?: string | null;
    extractedContent?: string | null;
    note?: string | null;
    tags?: { name: string }[] | string[];
  }
): string {
  const tagNames =
    signal.tags?.map((t) => (typeof t === 'string' ? t : t.name)) || [];

  const parts = [
    signal.title,
    signal.summary,
    signal.keyTakeaway,
    signal.extractedContent?.substring(0, 500),
    tagNames.length > 0 ? tagNames.join(', ') : null,
    signal.note,
  ].filter(Boolean);

  return parts.join('. ');
}

// --- Factory ---

let instance: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!instance) {
    instance = new GeminiEmbeddingProvider();
  }
  return instance;
}
