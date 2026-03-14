import OpenAI from 'openai';
import { AIProvider, SignalAnalysis, Message } from '@/types';
import { SUMMARIZE_PROMPT } from './prompts';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  getModelName(tier: 'fast' | 'deep'): string {
    return 'gpt-4o-mini';
  }

  async summarize(content: string, url: string): Promise<SignalAnalysis> {
    const response = await this.client.chat.completions.create({
      model: this.getModelName('fast'),
      messages: [
        { role: 'system', content: SUMMARIZE_PROMPT },
        {
          role: 'user',
          content: `URL: ${url}\n\nContent:\n${content.substring(0, 15000)}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('Empty response from OpenAI');
    }
    const text = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(text) as SignalAnalysis;
    } catch {
      throw new Error(`Failed to parse AI analysis response: ${text.substring(0, 200)}`);
    }
  }

  async *chat(
    messages: Message[],
    systemContext: string
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.getModelName('deep'),
      stream: true,
      messages: [
        { role: 'system', content: systemContext },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
