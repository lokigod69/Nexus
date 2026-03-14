'use client';

import { CATEGORIES } from '@/lib/utils/categories';

interface UniverseHUDProps {
  signalCount: number;
  categoryFilter: string | undefined;
  onCategoryClick: (category: string | undefined) => void;
}

export function UniverseHUD({ signalCount, categoryFilter, onCategoryClick }: UniverseHUDProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Bottom-left: category legend */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-lg p-3 space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryClick(categoryFilter === cat.id ? undefined : cat.id)}
              className={`flex items-center gap-2 text-[11px] font-mono w-full px-1.5 py-0.5 rounded transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
}
