import OpenAI from 'openai';
import { AIProvider, SignalAnalysis, Message } from '@/types';
import { SUMMARIZE_PROMPT } from './prompts';

/**
 * Ollama provider — uses local models via Ollama's OpenAI-compatible API.
 * Zero API costs. Requires Ollama running locally.
 * 
 * Default URL: http://localhost:11434/v1
 * Override with OLLAMA_BASE_URL env var.
 */
export class OllamaProvider implements AIProvider {
  private client: OpenAI;
  private activeModelId: string;

  constructor(defaultModel = 'qwen3:32b') {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    this.activeModelId = defaultModel;
    this.client = new OpenAI({
      baseURL,
      apiKey: 'ollama', // Ollama doesn't need a real key but the SDK requires one
    });
  }

  setActiveModel(modelId: string): void {
    this.activeModelId = modelId;
  }

  getModelName(_tier: 'fast' | 'deep'): string {
    return this.activeModelId;
  }

  async summarize(content: string, url: string, customPrompt?: string): Promise<SignalAnalysis> {
    const prompt = customPrompt || SUMMARIZE_PROMPT;
    const userContent = url
      ? `URL: ${url}\n\nContent:\n${content.substring(0, 12000)}`
      : `Content:\n${content.substring(0, 12000)}`;

    console.log(`[ollama] Summarize using model: ${this.activeModelId}`);

    const response = await this.client.chat.completions.create({
      model: this.activeModelId,
      messages: [
        { role: 'system', content: prompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.' },
        { role: 'user', content: userContent },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('Empty response from Ollama');
    }

    const text = response.choices[0].message.content || '{}';
    // Clean up common local-model quirks
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{]*/, '')  // strip anything before first {
      .replace(/[^}]*$/, '')  // strip anything after last }
      .trim();

    try {
      return JSON.parse(cleaned) as SignalAnalysis;
    } catch {
      // Try to extract JSON object from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as SignalAnalysis;
        } catch { /* fall through */ }
      }
      throw new Error(`Failed to parse Ollama response as JSON: ${text.substring(0, 300)}`);
    }
  }

  async *chat(
    messages: Message[],
    systemContext: string
  ): AsyncGenerator<string, void, unknown> {
    console.log(`[ollama] Chat using model: ${this.activeModelId}`);

    const stream = await this.client.chat.completions.create({
      model: this.activeModelId,
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
