'use client';

import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TagPill } from '@/components/common/TagPill';
import { getAgeLabel, getFreshness } from '@/lib/utils/time';
import { getCategoryColor } from '@/lib/utils/categories';
import type { Signal, GitHubStatsData } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export function SignalCard({ signal }: { signal: Signal }) {
  const selectSignal = useSignalStore(s => s.selectSignal);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);
  const freshness = getFreshness(signal.createdAt);
  const categoryColor = getCategoryColor(signal.category);

  const handleClick = () => {
    selectSignal(signal.id);
    toggleDetailPanel(true);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-surface border border-border-subtle rounded-lg cursor-pointer hover:bg-elevated transition-all group overflow-hidden"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: categoryColor,
        boxShadow: freshness > 0.5 ? `0 0 ${freshness * 20}px ${categoryColor}15` : undefined,
      }}
    >
      {/* OG Image thumbnail */}
      {(signal.enrichments?.og_image as { url: string } | undefined)?.url && (
        <div className="w-full h-24 overflow-hidden">
          <img
            src={(signal.enrichments!.og_image as { url: string }).url}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4">
      {/* Category + type */}
      <div className="flex items-center gap-2 mb-1.5">
        <CategoryIcon category={signal.category} size="sm" />
        <span className="text-[10px] font-mono text-text-muted uppercase">{signal.category}</span>
        {signal.contentType && signal.contentType !== 'resource' && (
          <span className="text-[10px] font-mono text-text-ghost">&middot; {signal.contentType}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-sans font-semibold text-text-primary mb-1 line-clamp-2 group-hover:text-white transition-colors">
        {(signal.enrichments?.emoji as { emoji: string } | undefined)?.emoji && (
          <span className="mr-1">{(signal.enrichments!.emoji as { emoji: string }).emoji}</span>
        )}
        {signal.title}
      </h3>

      {/* Summary */}
      {signal.summary && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">{signal.summary}</p>
      )}

      {/* Tags */}
      {signal.tags && signal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {signal.tags.slice(0, 4).map(tag => (
            <TagPill key={typeof tag === 'string' ? tag : tag.name} name={typeof tag === 'string' ? tag : tag.name} />
          ))}
          {signal.tags.length > 4 && <span className="text-[10px] text-text-muted">+{signal.tags.length - 4}</span>}
        </div>
      )}

      {/* Footer: age + status + github stars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(signal.enrichments?.favicon as { url: string; source: string } | undefined)?.url && (
            <img
              src={(signal.enrichments!.favicon as { url: string; source: string }).url}
              alt=""
              width={16}
              height={16}
              className="rounded-sm"
              style={{ width: 16, height: 16 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="text-[10px] font-mono text-text-muted">{getAgeLabel(signal.createdAt)}</span>
          {(() => {
            const gh = signal.enrichments?.github_stats as GitHubStatsData | undefined;
            return gh ? (
              <span className="text-[10px] font-mono text-warning px-1 py-0.5 bg-warning/10 rounded">
                ★ {formatNumber(gh.stars)}
              </span>
            ) : null;
          })()}
        </div>
        <StatusBadge status={signal.status} />
      </div>
      </div>
    </div>
  );
}
