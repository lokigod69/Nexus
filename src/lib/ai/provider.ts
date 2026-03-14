import { AIProvider, AIProviderType } from '@/types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

let anthropicInstance: AnthropicProvider | null = null;
let openaiInstance: OpenAIProvider | null = null;

export function getAIProvider(type?: AIProviderType): AIProvider {
  const providerType =
    type || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai');

  if (providerType === 'anthropic') {
    if (!anthropicInstance) anthropicInstance = new AnthropicProvider();
    return anthropicInstance;
  }

  if (!openaiInstance) openaiInstance = new OpenAIProvider();
  return openaiInstance;
}
