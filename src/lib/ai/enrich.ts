import type { EnrichInput, EnrichmentResult } from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';
import { getAIProvider, getFallbackModelIds } from './provider';
import { buildEnrichSystemPrompt, buildEnrichUserPrompt } from './prompts';

/** lowercase-kebab normalizer for tags. */
function kebab(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Defensive JSON extraction: strips markdown code fences and tolerates
 * leading/trailing prose by slicing from the first '{' to the last '}'.
 */
export function parseEnrichmentJson(raw: string): Record<string, unknown> {
  let text = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`No JSON object in AI response: ${raw.substring(0, 200)}`);
  }
  text = text.substring(first, last + 1);

  const parsed = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI response JSON is not an object');
  }
  return parsed as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

/**
 * Validate/coerce a parsed model response into an EnrichmentResult.
 * - suggestedProject must be a registry slug or 'general'; anything else
 *   (hallucinated slug, wrong casing, prose) is coerced to 'general'.
 * - tags normalized to lowercase-kebab, deduped, capped at 5.
 */
export function toEnrichmentResult(
  parsed: Record<string, unknown>,
  registrySlugs: string[],
  fallbackTitle: string
): EnrichmentResult {
  const title = asString(parsed.title) || fallbackTitle;

  const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const tags = [
    ...new Set(
      rawTags
        .filter((t): t is string => typeof t === 'string')
        .map(kebab)
        .filter((t) => t.length > 0)
    ),
  ].slice(0, 5);

  let suggestedProject = kebab(asString(parsed.suggestedProject, GENERAL_PROJECT_SLUG));
  if (
    suggestedProject !== GENERAL_PROJECT_SLUG &&
    !registrySlugs.includes(suggestedProject)
  ) {
    suggestedProject = GENERAL_PROJECT_SLUG;
  }

  return {
    title: title.substring(0, 200),
    summary: asString(parsed.summary),
    takeaway: asString(parsed.takeaway),
    tags,
    suggestedProject,
    suggestedReason: asString(parsed.suggestedReason),
  };
}

/**
 * One-shot enrichment: builds the prompts, walks the fallback model chain
 * (free-tier models 429 routinely — a busted response falls through to the
 * next model the same way a provider error does), parses defensively,
 * validates against the registry.
 * Throws only when EVERY model in the chain failed — the caller then
 * degrades to enrichStatus 'failed'.
 */
export async function enrichCapture(input: EnrichInput): Promise<EnrichmentResult> {
  const system = buildEnrichSystemPrompt(input.projects);
  const user = buildEnrichUserPrompt(input);

  const fallbackTitle =
    input.scraped?.title || input.content.substring(0, 80) || input.url || 'Untitled capture';

  let lastError: unknown;
  for (const modelId of getFallbackModelIds()) {
    try {
      const provider = getAIProvider(modelId);
      const raw = await provider.complete(system, user);
      const parsed = parseEnrichmentJson(raw);
      return toEnrichmentResult(
        parsed,
        input.projects.map((p) => p.slug),
        fallbackTitle
      );
    } catch (error) {
      lastError = error;
      console.warn(`[enrich] model ${modelId} failed, trying next in chain:`, error);
    }
  }
  throw lastError ?? new Error('No AI model available for enrichment');
}
