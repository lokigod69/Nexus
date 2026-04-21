import OpenAI from 'openai';
import { AIProvider, SignalAnalysis, Message } from '@/types';
import { SUMMARIZE_PROMPT } from './prompts';

/**
 * Attempt to salvage a truncated JSON response by closing open braces/brackets.
 */
function salvageTruncatedJson(text: string): SignalAnalysis | null {
  try {
    const attempts = [
      text + '"}',
      text + '"}]}',
      text + '" }',
      text + ']}',
      text + '}',
      text + '"]}',
    ];
    for (const attempt of attempts) {
      try {
        const parsed = JSON.parse(attempt);
        if (parsed.title) return parsed as SignalAnalysis;
      } catch { /* try next */ }
    }
    return null;
  } catch {
    return null;
  }
}

export class OpenRouterProvider implements AIProvider {
  private client: OpenAI;
  private activeModelId: string = 'google/gemma-4-26b-a4b-it:free';

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

  getModelName(_tier: 'fast' | 'deep'): string {
    // When an active model is set, always use it regardless of tier
    return this.activeModelId;
  }

  async summarize(content: string, url: string, customPrompt?: string): Promise<SignalAnalysis> {
    const prompt = customPrompt || SUMMARIZE_PROMPT;
    const userContent = url
      ? `URL: ${url}\n\nContent:\n${content.substring(0, 15000)}`
      : `Content:\n${content.substring(0, 15000)}`;

    const modelId = this.activeModelId;
    console.log(`[openrouter] Summarize using model: ${modelId}`);

    const response = await this.client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('Empty response from OpenRouter');
    }

    const finishReason = response.choices[0].finish_reason;
    if (finishReason === 'length') {
      console.warn('[openrouter] Response was truncated (hit max tokens)');
    }

    const text = response.choices[0].message.content || '{}';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleaned) as SignalAnalysis;
    } catch {
      // If truncated, try to salvage
      if (finishReason === 'length') {
        const salvaged = salvageTruncatedJson(cleaned);
        if (salvaged) {
          console.log('[openrouter] Salvaged truncated JSON, title:', salvaged.title);
          return salvaged;
        }
      }
      // Last-resort: try to extract JSON from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as SignalAnalysis;
        } catch { /* fall through */ }
      }
      throw new Error(`Failed to parse AI analysis response: ${cleaned.substring(0, 200)}`);
    }
  }

  async *chat(
    messages: Message[],
    systemContext: string
  ): AsyncGenerator<string, void, unknown> {
    const modelId = this.activeModelId;
    console.log(`[openrouter] Chat using model: ${modelId}`);

    const stream = await this.client.chat.completions.create({
      model: modelId,
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
