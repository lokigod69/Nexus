import { EmbeddingProvider } from '@/types';

/**
 * Ollama embedding provider — uses local embedding models.
 * Supports nomic-embed-text, all-minilm, mxbai-embed-large, etc.
 * 
 * Zero API costs. Requires Ollama running locally with the model pulled.
 * Pull a model first: `ollama pull nomic-embed-text`
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseURL: string;
  private model: string;
  private dim: number;

  constructor(model = 'nomic-embed-text', dimension = 768) {
    this.baseURL = process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://localhost:11434';
    this.model = model;
    this.dim = dimension;
  }

  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: text }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama embedding failed: ${err}`);
    }

    const data = await response.json();
    const vector = data.embeddings?.[0] || data.embedding;
    if (!vector) throw new Error('No embedding in Ollama response');
    return this.normalize(vector);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  getModelName(): string {
    return this.model;
  }

  getDimension(): number {
    return this.dim;
  }
}
