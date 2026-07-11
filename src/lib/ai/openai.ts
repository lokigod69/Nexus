import OpenAI from 'openai';
import type { AIProvider, AIProviderType } from '@/types';

export class OpenAIProvider implements AIProvider {
  readonly name: AIProviderType = 'openai';
  private client: OpenAI;
  private activeModelId = 'gpt-4o-mini';

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  setActiveModel(modelId: string): void {
    this.activeModelId = modelId;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log(`[openai] complete using model: ${this.activeModelId}`);
    const response = await this.client.chat.completions.create({
      model: this.activeModelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from OpenAI');
    return text;
  }
}
