import { AIProvider, AIProviderType, ModelDefinition } from '@/types';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { getSetting } from '@/lib/db/queries';

// ─── Model Registry ────────────────────────────────────────────
// All available models across all providers.
// The UI reads this to populate dropdowns; the backend uses it to route requests.

export const MODEL_REGISTRY: ModelDefinition[] = [
  // ── Analysis-capable models (JSON summarization) ───────────
  {
    id: 'gemma-4-26b',
    name: 'Gemma 4 26B',
    provider: 'openrouter',
    modelId: 'google/gemma-4-26b-a4b-it',
    tier: ['analysis', 'chat'],
    costInput: 0.13,
    costOutput: 0.40,
    maxOutput: 262144,
    contextWindow: 262144,
    free: false,
    description: 'Google MoE — excellent JSON, huge output window',
  },
  {
    id: 'gemma-4-26b-free',
    name: 'Gemma 4 26B (Free)',
    provider: 'openrouter',
    modelId: 'google/gemma-4-26b-a4b-it:free',
    tier: ['analysis', 'chat'],
    costInput: 0,
    costOutput: 0,
    maxOutput: 32768,
    contextWindow: 262144,
    free: true,
    description: 'Free tier — rate-limited, smaller max output',
  },
  {
    id: 'qwen-3.5-9b',
    name: 'Qwen 3.5 9B',
    provider: 'openrouter',
    modelId: 'qwen/qwen3.5-9b',
    tier: ['analysis'],
    costInput: 0.05,
    costOutput: 0.15,
    maxOutput: 32768,
    contextWindow: 256000,
    free: false,
    description: 'Ultra-cheap, fast JSON summarization',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    tier: ['analysis', 'chat'],
    costInput: 0.15,
    costOutput: 0.60,
    maxOutput: 16384,
    contextWindow: 128000,
    free: false,
    description: 'Proven reliable — solid all-rounder',
  },

  // ── Chat-capable models (streaming, reasoning) ─────────────
  {
    id: 'nemotron-free',
    name: 'Nemotron 3 Super (Free)',
    provider: 'openrouter',
    modelId: 'nvidia/nemotron-3-super-120b-a12b:free',
    tier: ['chat'],
    costInput: 0,
    costOutput: 0,
    maxOutput: 262144,
    contextWindow: 262144,
    free: true,
    description: '120B MoE (12B active) — powerful free reasoning',
  },
  {
    id: 'mistral-small-4',
    name: 'Mistral Small 4',
    provider: 'openrouter',
    modelId: 'mistralai/mistral-small-2603',
    tier: ['chat', 'analysis'],
    costInput: 0.15,
    costOutput: 0.60,
    maxOutput: 32768,
    contextWindow: 262144,
    free: false,
    description: 'Strong reasoning + coding, good for chat',
  },
];

// ─── Helpers ───────────────────────────────────────────────────

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

export function getModelsForTier(tier: 'analysis' | 'chat'): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.tier.includes(tier));
}

/**
 * Get the model ID configured for analysis (signal summarization).
 * Falls back to gemma-4-26b-free → gpt-4o-mini.
 */
export async function getAnalysisModelId(): Promise<string> {
  const setting = await getSetting('analysis_model');
  if (setting) {
    const model = getModelById(setting);
    if (model) return model.id;
  }
  // Default: Gemma 4 Free if OpenRouter key exists, else GPT-4o Mini
  if (process.env.OPENROUTER_KEY) return 'gemma-4-26b-free';
  return 'gpt-4o-mini';
}

/**
 * Get the model ID configured for chat (Conductor, signal chats).
 * Falls back to nemotron-free → gpt-4o-mini.
 */
export async function getChatModelId(): Promise<string> {
  const setting = await getSetting('chat_model');
  if (setting) {
    const model = getModelById(setting);
    if (model) return model.id;
  }
  // Default: Nemotron Free if OpenRouter key exists, else GPT-4o Mini
  if (process.env.OPENROUTER_KEY) return 'nemotron-free';
  return 'gpt-4o-mini';
}

// ─── Provider Instances ────────────────────────────────────────

let openaiInstance: OpenAIProvider | null = null;
let openrouterInstance: OpenRouterProvider | null = null;

function getProviderInstance(provider: AIProviderType): AIProvider {
  if (provider === 'openrouter') {
    if (!openrouterInstance) openrouterInstance = new OpenRouterProvider();
    return openrouterInstance;
  }
  if (!openaiInstance) openaiInstance = new OpenAIProvider();
  return openaiInstance;
}

/**
 * Get an AI provider configured for a specific model.
 * If modelId is not provided, uses the analysis model setting.
 */
export async function getAIProvider(modelId?: string): Promise<AIProvider> {
  const id = modelId || await getAnalysisModelId();
  const model = getModelById(id);

  if (!model) {
    // Backwards compat: if someone passes an old-style provider type like 'openrouter'
    if (id === 'openrouter' && process.env.OPENROUTER_KEY) {
      if (!openrouterInstance) openrouterInstance = new OpenRouterProvider();
      return openrouterInstance;
    }
    if (!openaiInstance) openaiInstance = new OpenAIProvider();
    return openaiInstance;
  }

  const provider = getProviderInstance(model.provider);
  provider.setActiveModel(model.modelId);
  return provider;
}

/**
 * Get an AI provider configured for chat.
 * Accepts an optional override model ID.
 */
export async function getChatProvider(overrideModelId?: string): Promise<AIProvider> {
  const id = overrideModelId || await getChatModelId();
  return getAIProvider(id);
}

/**
 * Get info about which providers are available (have API keys configured).
 */
export function getAvailableProviders(): Record<AIProviderType, boolean> {
  return {
    openrouter: !!process.env.OPENROUTER_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };
}

/**
 * Get available models filtered by configured API keys.
 */
export function getAvailableModels(): ModelDefinition[] {
  const providers = getAvailableProviders();
  return MODEL_REGISTRY.filter(m => providers[m.provider]);
}
