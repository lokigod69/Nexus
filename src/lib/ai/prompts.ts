import type { BrainProject, Capture, EnrichInput } from '@/types';

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

// ============================================================
// Ask (POST /api/ask) — one-shot Q&A over the capture history.
// ============================================================

/**
 * System prompt for Ask: answer ONLY from the provided captures, cite the
 * ones the answer is grounded in, admit when nothing relevant was found.
 */
export function buildAskSystemPrompt(): string {
  return `You are the Ask feature of Nexus, a personal knowledge capture tool. The user captured links and thoughts over time; each capture was optionally routed ("delivered") into one or more project brains. You answer questions about this capture history.

You will be given the user's question and a list of captures. Each capture has: id, title, summary, takeaway, tags, status, projects (where it was routed/delivered), url, and capture date.

Respond with ONLY a JSON object — no markdown fences, no preamble, no explanation:
{
  "answer": "Your answer to the question",
  "referenceIds": ["id", "id"]
}

Rules:
- Answer ONLY from the provided captures. Never invent captures, facts, projects, or URLs that are not in the list.
- If nothing in the provided captures is relevant, say so plainly in the answer (e.g. "I couldn't find anything about that in your captures.") and return an empty referenceIds array. Never fabricate an answer.
- referenceIds MUST contain only ids copied exactly from the provided captures — the ones your answer is actually based on.
- Keep the answer conversational and concise: a couple of sentences, not an essay.
- When the question asks where something is or ended up, name the project(s) it was routed to and its status (e.g. "It was delivered to TRADERBOT." or "It's still sitting in the inbox, unrouted.").
- Status meanings: inbox = captured, not yet routed; routed = target confirmed, waiting for pull; delivered = written into the project's memory; archived = deliberately dropped.
- Return ONLY the JSON object.`;
}

/** User prompt for Ask: the question plus the retrieved candidate captures. */
export function buildAskUserPrompt(question: string, candidates: Capture[]): string {
  const captureList =
    candidates.length > 0
      ? candidates
          .map((c) => {
            const date = new Date(c.createdAt * 1000).toISOString().slice(0, 10);
            const lines = [
              `- id: ${c.id}`,
              `  title: ${c.title || '(untitled)'}`,
            ];
            if (c.summary) lines.push(`  summary: ${c.summary}`);
            if (c.takeaway) lines.push(`  takeaway: ${c.takeaway}`);
            if (c.tags.length > 0) lines.push(`  tags: ${c.tags.join(', ')}`);
            lines.push(`  status: ${c.status}`);
            lines.push(
              `  projects: ${c.projects.length > 0 ? c.projects.join(', ') : '(none — not routed)'}`
            );
            if (c.url) lines.push(`  url: ${c.url}`);
            lines.push(`  captured: ${date}`);
            lines.push(`  content: ${c.content.substring(0, 500)}`);
            return lines.join('\n');
          })
          .join('\n\n')
      : '(no captures found)';

  return `Question: ${question}\n\nCaptures:\n${captureList}`;
}
