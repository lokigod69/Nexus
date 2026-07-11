import type { AIProvider, AIProviderType, ModelDefinition } from '@/types';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { OllamaProvider } from './ollama';

// ─── Model Registry ────────────────────────────────────────────
// v2 has one AI job (enrichment) and no settings UI: the model is
// always picked by the default chain below.

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: 'ollama-qwen3.5',
    name: 'Qwen 3.5 (Ollama)',
    provider: 'ollama',
    modelId: 'qwen3:32b',
    costInput: 0,
    costOutput: 0,
    contextWindow: 128000,
    free: true,
  },
  {
    id: 'gemma-4-26b-free',
    name: 'Gemma 4 26B (Free)',
    provider: 'openrouter',
    modelId: 'google/gemma-4-26b-a4b-it:free',
    costInput: 0,
    costOutput: 0,
    contextWindow: 262144,
    free: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    costInput: 0.15,
    costOutput: 0.6,
    contextWindow: 128000,
    free: false,
  },
];

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

/**
 * Default chain: Ollama (if OLLAMA_ENABLED=true) → OpenRouter free model
 * (if OPENROUTER_KEY) → gpt-4o-mini.
 */
export function getDefaultModelId(): string {
  if (process.env.OLLAMA_ENABLED === 'true') return 'ollama-qwen3.5';
  if (process.env.OPENROUTER_KEY) return 'gemma-4-26b-free';
  return 'gpt-4o-mini';
}

/**
 * Runtime fallback chain, in order of preference, filtered to providers
 * with credentials. Free-tier models 429 routinely; enrichment tries each
 * model in this chain before giving up.
 */
export function getFallbackModelIds(): string[] {
  const chain: string[] = [];
  if (process.env.OLLAMA_ENABLED === 'true') chain.push('ollama-qwen3.5');
  if (process.env.OPENROUTER_KEY) chain.push('gemma-4-26b-free');
  if (process.env.OPENAI_API_KEY) chain.push('gpt-4o-mini');
  // No credentials at all: keep the old behavior (fail loudly on the default).
  if (chain.length === 0) chain.push('gpt-4o-mini');
  return chain;
}

// ─── Provider Instances ────────────────────────────────────────

const instances: Partial<Record<AIProviderType, AIProvider>> = {};

function getProviderInstance(provider: AIProviderType): AIProvider {
  let instance = instances[provider];
  if (!instance) {
    if (provider === 'ollama') instance = new OllamaProvider();
    else if (provider === 'openrouter') instance = new OpenRouterProvider();
    else instance = new OpenAIProvider();
    instances[provider] = instance;
  }
  return instance;
}

/**
 * Get an AI provider configured for a specific registry model.
 * Without a modelId, uses the default chain.
 */
export function getAIProvider(modelId?: string): AIProvider {
  const model = getModelById(modelId || getDefaultModelId()) ?? getModelById('gpt-4o-mini')!;
  const provider = getProviderInstance(model.provider);
  provider.setActiveModel(model.modelId);
  return provider;
}
