import OpenAI from 'openai';
import type { AIProvider, AIProviderType } from '@/types';

/**
 * Ollama provider — local models via Ollama's OpenAI-compatible API.
 * Zero API costs. Requires Ollama running locally.
 *
 * Default URL: http://localhost:11434/v1 (override: OLLAMA_BASE_URL)
 */
export class OllamaProvider implements AIProvider {
  readonly name: AIProviderType = 'ollama';
  private client: OpenAI;
  private activeModelId: string;

  constructor(defaultModel = 'qwen3:32b') {
    this.activeModelId = defaultModel;
    this.client = new OpenAI({
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama', // Ollama needs no real key but the SDK requires one
    });
  }

  setActiveModel(modelId: string): void {
    this.activeModelId = modelId;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log(`[ollama] complete using model: ${this.activeModelId}`);
    const response = await this.client.chat.completions.create({
      model: this.activeModelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from Ollama');
    return text;
  }
}
