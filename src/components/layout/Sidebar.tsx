'use client';

import { useMemo } from 'react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORIES } from '@/lib/utils/categories';
import { Grid3X3, Globe, Clock, Inbox, Zap, Layers } from 'lucide-react';

export function Sidebar() {
  const signals = useSignalStore(s => s.signals);
  const filters = useSignalStore(s => s.filters);
  const setFilters = useSignalStore(s => s.setFilters);
  const viewMode = useUIStore(s => s.viewMode);
  const setViewMode = useUIStore(s => s.setViewMode);

  const { categoryCounts, inboxCount, playgroundCount, starredCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let inbox = 0, playground = 0, starred = 0;
    for (const s of signals) {
      counts[s.category] = (counts[s.category] || 0) + 1;
      if (s.status === 'inbox') inbox++;
      else if (s.status === 'playground') playground++;
      if (s.status === 'starred') starred++;
    }
    return { categoryCounts: counts, inboxCount: inbox, playgroundCount: playground, starredCount: starred };
  }, [signals]);

  const handleCategoryClick = (categoryId: string) => {
    if (filters.category === categoryId) {
      setFilters({ category: undefined });
    } else {
      setFilters({ category: categoryId });
    }
  };

  return (
    <aside className="w-60 bg-surface border-r border-border-subtle flex flex-col overflow-y-auto shrink-0">
      {/* Views */}
      <div className="p-4 border-b border-border-subtle">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Views</h3>
        <nav className="space-y-1">
          <ViewItem icon={<Globe size={14} />} label="Universe" active={viewMode === 'universe'} onClick={() => setViewMode('universe')} />
          <ViewItem icon={<Grid3X3 size={14} />} label="Grid" active={viewMode === 'grid'} onClick={() => setViewMode('grid')} />
          <ViewItem icon={<Clock size={14} />} label="Timeline" active={viewMode === 'timeline'} onClick={() => setViewMode('timeline')} />
          <ViewItem icon={<Layers size={14} />} label="Triage" badge={inboxCount} active={viewMode === 'triage'} onClick={() => setViewMode('triage')} />
        </nav>
      </div>

      {/* Quick Filters */}
      <div className="p-4 border-b border-border-subtle">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Quick Filters</h3>
        <nav className="space-y-1">
          <ViewItem icon={<Inbox size={14} />} label="Inbox" badge={inboxCount} active={filters.status === 'inbox'} onClick={() => setFilters({ status: filters.status === 'inbox' ? undefined : 'inbox' })} />
          <ViewItem icon={<Zap size={14} />} label="Playground" badge={playgroundCount} active={filters.status === 'playground'} onClick={() => setFilters({ status: filters.status === 'playground' ? undefined : 'playground' })} />
        </nav>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-border-subtle flex-1">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Categories</h3>
        <nav className="space-y-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
                filters.category === cat.id
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </span>
              <span className="text-text-muted text-xs font-mono">{categoryCounts[cat.id] || 0}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Stats */}
      <div className="p-4">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Stats</h3>
        <div className="space-y-1 text-xs font-mono text-text-secondary">
          <div>{signals.length} total signals</div>
          <div>{signals.filter(s => {
            const h = (Date.now() - new Date(s.createdAt).getTime()) / 3600000;
            return h < 24;
          }).length} fresh today</div>
          <div>{starredCount} starred</div>
        </div>
      </div>
    </aside>
  );
}

function ViewItem({
  icon, label, active, onClick, badge, disabled
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
        disabled ? 'text-text-ghost cursor-not-allowed' :
        active ? 'bg-elevated text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-elevated/50'
      }`}
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-mono px-1.5 rounded-full bg-accent-primary/20 text-accent-primary">{badge}</span>
      )}
    </button>
  );
}
