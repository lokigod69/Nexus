import { Sparkles } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Capture } from '@/types';

/** Mono is reserved for data: tags, source domains, counts, timestamps. */
export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-md border border-line bg-elevated px-2 py-1 font-mono text-[11px] leading-none text-ink-secondary">
      {tag}
    </span>
  );
}

export function CardMeta({ capture }: { capture: Capture }) {
  const source = capture.source ?? (capture.kind === 'url' ? 'link' : 'thought');
  const when = formatDistanceToNowStrict(new Date(capture.createdAt * 1000), {
    addSuffix: true,
  });
  return (
    <div className="flex items-baseline justify-between gap-3 font-mono text-xs text-ink-muted">
      <span className="truncate">{source}</span>
      <span className="shrink-0">{when}</span>
    </div>
  );
}

/**
 * The AI's routing suggestion. Static by default; pass `onClick` and it
 * becomes the quick-route fast path — one tap commits to that project.
 */
export function SuggestionChip({
  label,
  reason,
  onClick,
  disabled = false,
}: {
  label: string;
  reason: string | null;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const text = (
    <span className="min-w-0">
      <span className="font-medium text-accent-strong">{label}</span>
      {reason && <span className="text-ink-secondary"> · {reason}</span>}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`Route to ${label}`}
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-accent/25 bg-accent/10 px-3 py-1.5 text-left text-[13px] leading-snug hover:border-accent/45 hover:bg-accent/15 disabled:opacity-40"
      >
        <Sparkles size={13} aria-hidden className="shrink-0 text-accent" />
        {text}
      </button>
    );
  }

  return (
    <div className="inline-flex max-w-full items-start gap-2 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1.5 text-[13px] leading-snug">
      <Sparkles size={13} aria-hidden className="mt-0.5 shrink-0 text-accent" />
      {text}
    </div>
  );
}

/** Placeholder bars for a capture that is still enriching. */
export function EnrichSkeleton() {
  return (
    <div aria-hidden className="mt-3 flex flex-col gap-2.5">
      <div className="shimmer h-4 w-1/2" />
      <div className="shimmer h-3 w-full" />
      <div className="shimmer h-3 w-4/5" />
      <div className="mt-1 flex gap-1.5">
        <div className="shimmer h-6 w-14 rounded-md" />
        <div className="shimmer h-6 w-20 rounded-md" />
      </div>
    </div>
  );
}
