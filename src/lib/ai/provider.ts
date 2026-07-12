import type { AIProvider, AIProviderType, ModelDefinition, ModelOption } from '@/types';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { OllamaProvider } from './ollama';

// ─── Model Registry ────────────────────────────────────────────
// The default chain below picks a model automatically. A user can also
// force one specific model per enrich call (see enrich.ts) — e.g. to
// compare candidates before settling on one.

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
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-v4-flash',
    costInput: 0.077,
    costOutput: 0.154,
    contextWindow: 1048576,
    free: false,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-v4-pro',
    costInput: 0.435,
    costOutput: 0.87,
    contextWindow: 1048576,
    free: false,
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

/** Does this provider have the credentials it needs to actually run? */
function providerConfigured(provider: AIProviderType): boolean {
  if (provider === 'ollama') return process.env.OLLAMA_ENABLED === 'true';
  if (provider === 'openrouter') return !!process.env.OPENROUTER_KEY;
  return !!process.env.OPENAI_API_KEY;
}

/** Selectable models for a picker UI — registry entries with a working key. */
export function getSelectableModels(): ModelOption[] {
  return MODEL_REGISTRY.filter((m) => providerConfigured(m.provider)).map((m) => ({
    id: m.id,
    name: m.name,
    free: m.free,
  }));
}

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
