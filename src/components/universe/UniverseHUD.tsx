'use client';

import { CATEGORIES } from '@/lib/utils/categories';

interface UniverseHUDProps {
  signalCount: number;
  categoryFilter: string | undefined;
  onCategoryClick: (category: string | undefined) => void;
  onRecenter: () => void;
  onRecompute: () => void;
  recomputing: boolean;
}

export function UniverseHUD({ signalCount, categoryFilter, onCategoryClick, onRecenter, onRecompute, recomputing }: UniverseHUDProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-right: node count */}
      <div className="absolute top-4 right-4">
        <div className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-lg px-3 py-2">
          <span className="text-[11px] font-mono text-text-muted">
            {signalCount} nodes
          </span>
        </div>
      </div>

      {/* Top-left: active filter indicator */}
      {categoryFilter && (
        <div className="absolute top-4 left-4 pointer-events-auto">
          <button
            onClick={() => onCategoryClick(undefined)}
            className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-lg px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORIES.find(c => c.id === categoryFilter)?.color }} />
            Filtering: {CATEGORIES.find(c => c.id === categoryFilter)?.label}
            <span className="text-text-muted ml-1">x</span>
          </button>
        </div>
      )}

      {/* Bottom-right: Recenter + Recompute buttons */}
      <div className="absolute bottom-4 right-4 pointer-events-auto flex gap-2">
        <button
          onClick={onRecenter}
          className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-full px-3 py-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary hover:bg-elevated/80 transition-colors"
        >
          ⟲ Recenter
        </button>
        <button
          onClick={onRecompute}
          disabled={recomputing}
          className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-full px-3 py-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary hover:bg-elevated/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recomputing ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-text-muted border-t-transparent rounded-full animate-spin inline-block" />
              Recomputing…
            </span>
          ) : (
            '↻ Recompute'
          )}
        </button>
      </div>
    </div>
  );
}
