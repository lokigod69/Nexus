import { EmbeddingProvider, Signal } from '@/types';
import { GeminiEmbeddingProvider } from './gemini';

// --- Blob Utilities ---
// LibSQL/Turso returns ArrayBuffer for BLOB columns; better-sqlite3 returns Buffer.
// These helpers handle both transparently.

export function vectorToBlob(vector: number[]): Buffer {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
  return buffer;
}

export function blobToVector(blob: Buffer | ArrayBuffer | unknown): number[] {
  // Normalise to Buffer regardless of what the driver returns
  let buf: Buffer;
  if (Buffer.isBuffer(blob)) {
    buf = blob;
  } else if (blob instanceof ArrayBuffer) {
    buf = Buffer.from(blob);
  } else if (blob instanceof Uint8Array) {
    buf = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  } else {
    // Last resort – treat as Buffer-like
    buf = Buffer.from(blob as any);
  }
  const vector: number[] = [];
  for (let i = 0; i < buf.length; i += 4) {
    vector.push(buf.readFloatLE(i));
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
    rawScrapedContent?: string | null;
    note?: string | null;
    source?: string | null;
    tags?: { name: string }[] | string[];
  }
): string {
  const tagNames =
    signal.tags?.map((t) => (typeof t === 'string' ? t : t.name)) || [];

  if (signal.source === 'brain_dump') {
    const parts = [
      signal.title,
      signal.rawScrapedContent?.substring(0, 1500),
      signal.keyTakeaway,
      tagNames.length > 0 ? tagNames.join(', ') : null,
      signal.note,
    ].filter(Boolean);
    return parts.join('. ');
  }

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
    // Priority: Gemini (cloud, best quality) → Ollama (local, free)
    if (process.env.GEMINI_API_KEY) {
      instance = new GeminiEmbeddingProvider();
    } else if (process.env.OLLAMA_ENABLED === 'true') {
      const { OllamaEmbeddingProvider } = require('./ollama');
      instance = new OllamaEmbeddingProvider();
    } else {
      // Fallback to Gemini (will throw if no key)
      instance = new GeminiEmbeddingProvider();
    }
  }
  return instance!;
}
