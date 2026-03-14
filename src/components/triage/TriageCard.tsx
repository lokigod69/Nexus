'use client';

import type { Signal } from '@/types';
import { getCategoryColor } from '@/lib/utils/categories';
import { TagPill } from '@/components/common/TagPill';
import { formatDistanceToNow } from 'date-fns';

interface TriageCardProps {
  signal: Signal;
  animatingOut: 'keep' | 'today' | 'discard' | null;
}

function getAnimationClass(dir: 'keep' | 'today' | 'discard' | null): string {
  if (!dir) return 'animate-in';
  switch (dir) {
    case 'keep': return 'animate-out-left';
    case 'today': return 'animate-out-up';
    case 'discard': return 'animate-out-right';
  }
}

export function TriageCard({ signal, animatingOut }: TriageCardProps) {
  const catColor = getCategoryColor(signal.category);
  const age = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });

  return (
    <div
      className={`w-full max-w-xl bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${getAnimationClass(animatingOut)}`}
      style={{ borderTopColor: catColor, borderTopWidth: '3px' }}
    >
      {/* Header */}
      <div className="p-6 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor + '20', color: catColor }}>
            {signal.category}
          </span>
          <span className="text-[10px] font-mono text-text-muted">{signal.source}</span>
          <span className="text-[10px] font-mono text-text-muted ml-auto">{age}</span>
        </div>
        <h2 className="text-xl font-sans font-bold text-text-primary leading-tight">{signal.title}</h2>
      </div>

      {/* Summary */}
      {signal.summary && (
        <div className="px-6 pb-3">
          <p className="text-sm text-text-secondary leading-relaxed">{signal.summary}</p>
        </div>
      )}

      {/* Key Takeaway */}
      {signal.keyTakeaway && (
        <div className="mx-6 mb-3 p-3 bg-elevated rounded-lg border border-border-subtle">
          <span className="text-[10px] font-mono text-accent-primary uppercase tracking-wider">Key Takeaway</span>
          <p className="text-sm text-text-primary mt-1">{signal.keyTakeaway}</p>
        </div>
      )}

      {/* Content preview */}
      {signal.extractedContent && (
        <div className="px-6 pb-3">
          <p className="text-xs font-mono text-text-muted line-clamp-4">{signal.extractedContent}</p>
        </div>
      )}

      {/* Tags */}
      {signal.tags && signal.tags.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap gap-1.5">
          {signal.tags.map(tag => (
            <TagPill key={tag.id} name={tag.name} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-elevated/50 border-t border-border-subtle">
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-text-muted hover:text-accent-primary truncate block transition-colors"
        >
          {signal.url}
        </a>
      </div>
    </div>
  );
}
