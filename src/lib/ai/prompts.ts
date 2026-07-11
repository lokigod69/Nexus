import type { BrainProject, EnrichInput } from '@/types';

type RegistryEntry = Pick<BrainProject, 'slug' | 'name' | 'description'>;

/**
 * System prompt for the single AI job in Nexus v2: enrich a capture.
 * Instructs strict JSON matching EnrichmentResult, with the current
 * project registry inlined so the model can suggest a routing target.
 */
export function buildEnrichSystemPrompt(registry: RegistryEntry[]): string {
  const projectList =
    registry.length > 0
      ? registry
          .map((p) => `- ${p.slug} — ${p.name}${p.description ? `: ${p.description}` : ''}`)
          .join('\n')
      : '(registry is empty — suggest "general")';

  return `You are the enrichment step of Nexus, a personal knowledge capture tool. The user captured a link or thought; your job is to title it, summarize it, and suggest which of their project brains it belongs to.

PROJECT REGISTRY (the only valid routing targets besides "general"):
${projectList}

Respond with ONLY a JSON object — no markdown fences, no preamble, no explanation:
{
  "title": "Clear, descriptive title (max 80 chars)",
  "summary": "2-3 plain-language sentences: what this is and why it matters",
  "takeaway": "One sentence: why this was worth capturing",
  "tags": ["two-to-five", "lowercase-kebab", "tags"],
  "suggestedProject": "a slug from the registry above, or 'general'",
  "suggestedReason": "One short sentence: why it belongs in that project"
}

Rules:
- suggestedProject MUST be exactly one of the registry slugs above, or "general". Never invent a slug.
- Suggest "general" when no project clearly fits — do not force a match.
- tags: 2-5 items, lowercase-kebab-case (e.g. "spring-physics", "sqlite"), specific enough to be useful.
- title: plain and descriptive, no clickbait, no trailing punctuation.
- If the input is a raw URL with no scraped content, infer what you can from the URL itself.
- Return ONLY the JSON object.`;
}

/** User prompt: the capture itself (plus scraped content for URLs). */
export function buildEnrichUserPrompt(input: EnrichInput): string {
  const parts: string[] = [];
  parts.push(`Capture kind: ${input.kind}`);
  if (input.url) parts.push(`URL: ${input.url}`);
  parts.push(`Original capture (verbatim):\n${input.content}`);
  if (input.scraped) {
    parts.push(`Scraped page title: ${input.scraped.title}`);
    if (input.scraped.description) {
      parts.push(`Scraped description: ${input.scraped.description}`);
    }
    parts.push(`Scraped content:\n${input.scraped.content.substring(0, 8000)}`);
  } else if (input.kind === 'url') {
    parts.push('(Scraping failed or unavailable — work from the URL and capture text alone.)');
  }
  return parts.join('\n\n');
}
