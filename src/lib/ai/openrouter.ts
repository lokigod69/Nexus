import OpenAI from 'openai';
import type { AIProvider, AIProviderType } from '@/types';

export class OpenRouterProvider implements AIProvider {
  readonly name: AIProviderType = 'openrouter';
  private client: OpenAI;
  private activeModelId = 'google/gemma-4-26b-a4b-it:free';

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Nexus',
      },
    });
  }

  setActiveModel(modelId: string): void {
    this.activeModelId = modelId;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log(`[openrouter] complete using model: ${this.activeModelId}`);
    const response = await this.client.chat.completions.create({
      model: this.activeModelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    if (response.choices?.[0]?.finish_reason === 'length') {
      console.warn('[openrouter] response truncated (hit max tokens)');
    }
    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from OpenRouter');
    return text;
  }
}
