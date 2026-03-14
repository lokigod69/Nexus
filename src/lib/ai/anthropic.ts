import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, SignalAnalysis, Message } from '@/types';
import { SUMMARIZE_PROMPT } from './prompts';

/**
 * Attempt to salvage a truncated JSON response by closing open braces/brackets.
 */
function salvageTruncatedJson(text: string): SignalAnalysis | null {
  try {
    // Try progressively closing the JSON
    const attempts = [
      text + '"}',           // close a truncated string value
      text + '"}]}',         // close string + array + object
      text + '" }',          // close string + object
      text + ']}',           // close array + object
      text + '}',            // close object
      text + '"]}'           // close array element string + array + object
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

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  getModelName(tier: 'fast' | 'deep'): string {
    return 'claude-haiku-4-5-20251001';
  }

  async summarize(content: string, url: string): Promise<SignalAnalysis> {
    const response = await this.client.messages.create({
      model: this.getModelName('fast'),
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${SUMMARIZE_PROMPT}\n\nURL: ${url}\n\nContent:\n${content.substring(0, 15000)}`,
        },
      ],
    });

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Anthropic');
    }

    if (response.stop_reason === 'max_tokens') {
      console.warn('[anthropic] Response was truncated (hit max_tokens)');
    }

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      return JSON.parse(cleaned) as SignalAnalysis;
    } catch {
      // If truncated, try to salvage by closing the JSON
      if (response.stop_reason === 'max_tokens') {
        const salvaged = salvageTruncatedJson(cleaned);
        if (salvaged) {
          console.log('[anthropic] Salvaged truncated JSON, title:', salvaged.title);
          return salvaged;
        }
      }
      throw new Error(`Failed to parse AI analysis response: ${cleaned.substring(0, 200)}`);
    }
  }

  async *chat(
    messages: Message[],
    systemContext: string
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.client.messages.stream({
      model: this.getModelName('deep'),
      max_tokens: 4096,
      system: systemContext,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }
}
