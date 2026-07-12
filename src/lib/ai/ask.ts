import type { Capture } from '@/types';
import { getAIProvider, getFallbackModelIds } from './provider';
import { parseEnrichmentJson } from './enrich';
import { buildAskSystemPrompt, buildAskUserPrompt } from './prompts';

export interface AskResult {
  answer: string;
  /** Raw ids the model cited — the caller validates them ⊆ candidates. */
  referenceIds: string[];
}

/**
 * One-shot Ask completion: walks the SAME runtime fallback chain as enrich
 * (free-tier models 429 routinely — a provider error or unparseable
 * response falls through to the next model). Throws only when EVERY model
 * in the chain failed; the caller then returns 502, never a fabricated 200.
 */
export async function askCaptures(
  question: string,
  candidates: Capture[]
): Promise<AskResult> {
  const system = buildAskSystemPrompt();
  const user = buildAskUserPrompt(question, candidates);

  let lastError: unknown;
  for (const modelId of getFallbackModelIds()) {
    try {
      const provider = getAIProvider(modelId);
      const raw = await provider.complete(system, user);
      const parsed = parseEnrichmentJson(raw);

      const answer =
        typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
      if (!answer) throw new Error('AI response has no answer text');

      const referenceIds = Array.isArray(parsed.referenceIds)
        ? parsed.referenceIds.filter((v): v is string => typeof v === 'string')
        : [];

      return { answer, referenceIds };
    } catch (error) {
      lastError = error;
      console.warn(`[ask] model ${modelId} failed, trying next in chain:`, error);
    }
  }
  throw lastError ?? new Error('No AI model available for ask');
}
