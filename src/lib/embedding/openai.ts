import OpenAI from 'openai';
import { EmbeddingProvider } from '@/types';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model = 'text-embedding-3-small';
  private dimension = 768;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimension,
    });
    return response.data[0].embedding;
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embed(text); // OpenAI doesn't differentiate
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimension,
    });
    return response.data.map((d) => d.embedding);
  }

  getModelName(): string {
    return this.model;
  }

  getDimension(): number {
    return this.dimension;
  }
}
