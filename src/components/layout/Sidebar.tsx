'use client';

import { useState, useEffect } from 'react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORIES } from '@/lib/utils/categories';
import { Globe, Inbox, Zap, Layers, List, Search, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubTag {
  id: number;
  name: string;
  count: number;
}

export function Sidebar() {
  const filters = useSignalStore(s => s.filters);
  const setFilters = useSignalStore(s => s.setFilters);
  const categoryCounts = useSignalStore(s => s.categoryCounts);
  const statusCounts = useSignalStore(s => s.statusCounts);
  const viewMode = useUIStore(s => s.viewMode);
  const setViewMode = useUIStore(s => s.setViewMode);
  const runAudit = useUIStore(s => s.runAudit);
  const fetchSignals = useSignalStore(s => s.fetchSignals);
  const fetchCategoryCounts = useSignalStore(s => s.fetchCategoryCounts);

  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [subTags, setSubTags] = useState<SubTag[]>([]);
  const [loadingSubTags, setLoadingSubTags] = useState(false);

  // Load doc count on mount
  useEffect(() => {
    fetch('/api/signals/docs?mode=status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.documentedIds) setDocCount(data.documentedIds.length); })
      .catch(() => {});
  }, []);

  // Fetch sub-tags whenever category filter changes
  useEffect(() => {
    if (!filters.category) {
      setSubTags([]);
      return;
    }
    setLoadingSubTags(true);
    fetch(`/api/tags/by-category?category=${encodeURIComponent(filters.category)}`)
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(data => setSubTags(data.tags || []))
      .catch(() => setSubTags([]))
      .finally(() => setLoadingSubTags(false));
  }, [filters.category]);

  const otherCount = categoryCounts['other'] || 0;

  const handleBatchReanalyze = async () => {
    if (batchProgress) return;
    try {
      const res = await fetch('/api/signals/reanalyze-batch');
      if (!res.ok) throw new Error('Failed to fetch signals');
      const { ids } = await res.json();
      if (ids.length === 0) { toast.success('No signals need re-categorization'); return; }

      setBatchProgress({ current: 0, total: ids.length });
      for (let i = 0; i < ids.length; i++) {
        setBatchProgress({ current: i + 1, total: ids.length });
        try {
          await fetch(`/api/signals/${ids[i]}/reanalyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rescrape: true }),
          });
        } catch {
          // Continue with next signal on individual failure
        }
        await fetchSignals();
        await fetchCategoryCounts();
      }
      toast.success(`Re-analyzed ${ids.length} signals`);
    } catch {
      toast.error('Batch re-analysis failed');
    } finally {
      setBatchProgress(null);
    }
  };

  const inboxCount = statusCounts['inbox'] || 0;
  const playgroundCount = statusCounts['playground'] || 0;
  const starredCount = statusCounts['starred'] || 0;
  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const handleCategoryClick = (categoryId: string) => {
    if (filters.category === categoryId) {
      setFilters({ category: undefined, tag: undefined });
    } else {
      setFilters({ category: categoryId, tag: undefined });
    }
  };

  const handleSubTagClick = (tagName: string) => {
    if (filters.tag === tagName) {
      setFilters({ tag: undefined });
    } else {
      setFilters({ tag: tagName });
    }
  };

  return (
    <aside
      className="w-60 flex flex-col overflow-y-auto shrink-0"
      style={{
        background: 'rgba(8, 8, 13, 0.8)',
        borderRight: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Views */}
      <div className="p-4 border-b border-border-subtle">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Views</h3>
        <nav className="space-y-1">
          <ViewItem icon={<List size={14} />} label="Feed" active={viewMode === 'feed'} onClick={() => setViewMode('feed')} />
          <ViewItem icon={<Globe size={14} />} label="Universe" active={viewMode === 'universe'} onClick={() => setViewMode('universe')} />
          <ViewItem icon={<Layers size={14} />} label="Triage" badge={inboxCount} active={viewMode === 'triage'} onClick={() => setViewMode('triage')} />
        </nav>
      </div>

      {/* Quick Filters */}
      <div className="p-4 border-b border-border-subtle">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Quick Filters</h3>
        <nav className="space-y-1">
          <ViewItem icon={<Inbox size={14} />} label="Inbox" badge={inboxCount} active={filters.status === 'inbox'} onClick={() => setFilters({ status: filters.status === 'inbox' ? undefined : 'inbox' })} />
          <ViewItem icon={<Zap size={14} />} label="Playground" badge={playgroundCount} active={filters.status === 'playground'} onClick={() => setFilters({ status: filters.status === 'playground' ? undefined : 'playground' })} />
          <ViewItem icon={<FileText size={14} />} label="Docs" badge={docCount} active={viewMode === 'docs'} onClick={() => setViewMode('docs')} />
        </nav>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-border-subtle flex-1">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Categories</h3>
        <nav className="space-y-0.5">
          {CATEGORIES.map(cat => {
            const isActive = filters.category === cat.id;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  style={isActive ? {
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderLeft: `2px solid ${cat.color}`,
                    paddingLeft: '6px',
                  } : undefined}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '';
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {isActive && subTags.length > 0 && (
                      <ChevronRight size={10} className="text-text-ghost -ml-0.5 rotate-90 transition-transform" />
                    )}
                  </span>
                  <span className="text-text-muted text-xs font-mono">{categoryCounts[cat.id] || 0}</span>
                </button>

                {/* Sub-tag tree — shown when this category is selected */}
                {isActive && subTags.length > 0 && (
                  <div className="ml-5 mt-0.5 mb-1 space-y-px border-l border-white/5 pl-2">
                    {/* Show all option */}
                    <button
                      onClick={() => setFilters({ tag: undefined })}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                        !filters.tag
                          ? 'text-text-primary bg-white/5'
                          : 'text-text-muted hover:text-text-secondary hover:bg-white/3'
                      }`}
                    >
                      <span className="font-mono">all</span>
                      <span className="text-text-ghost text-[10px] font-mono">{categoryCounts[cat.id] || 0}</span>
                    </button>
                    {subTags.map(st => (
                      <button
                        key={st.id}
                        onClick={() => handleSubTagClick(st.name)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                          filters.tag === st.name
                            ? 'text-text-primary bg-white/5'
                            : 'text-text-muted hover:text-text-secondary hover:bg-white/3'
                        }`}
                      >
                        <span className="font-mono truncate">#{st.name}</span>
                        <span className="text-text-ghost text-[10px] font-mono flex-shrink-0 ml-1">{st.count}</span>
                      </button>
                    ))}
                  </div>
                )}
                {isActive && loadingSubTags && (
                  <div className="ml-5 pl-2 py-1">
                    <span className="text-[10px] text-text-ghost font-mono">Loading tags...</span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Knowledge Audit */}
      <div className="p-4 border-b border-border-subtle">
        <button
          onClick={() => runAudit()}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
          <Search size={14} />
          <span>Knowledge Audit</span>
        </button>
      </div>

      {/* Batch Re-analyze */}
      {(otherCount > 0 || batchProgress) && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <button
            onClick={handleBatchReanalyze}
            disabled={!!batchProgress}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-mono text-warning hover:text-text-primary transition-all duration-200 disabled:opacity-70"
            onMouseEnter={(e) => { if (!batchProgress) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          >
            <RefreshCw size={12} className={batchProgress ? 'animate-spin' : ''} />
            {batchProgress
              ? `Re-analyzing ${batchProgress.current} of ${batchProgress.total}...`
              : `${otherCount} signals need categorization`
            }
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="p-4">
        <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">Stats</h3>
        <div className="space-y-1 text-xs font-mono text-text-secondary">
          <div>{totalCount} total signals</div>
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
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all duration-200 ${
        disabled ? 'text-text-ghost cursor-not-allowed' :
        active ? 'text-accent-primary cursor-pointer' : 'text-text-secondary hover:text-text-primary cursor-pointer'
      }`}
      style={active ? { background: 'rgba(255, 255, 255, 0.06)' } : undefined}
      onMouseEnter={(e) => {
        if (!active && !disabled) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) e.currentTarget.style.background = active ? 'rgba(255, 255, 255, 0.06)' : '';
      }}
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-mono px-1.5 rounded-full bg-accent-primary/20 text-accent-primary">{badge}</span>
      )}
    </button>
  );
}
