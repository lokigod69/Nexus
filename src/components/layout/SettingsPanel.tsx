'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Trash2, Database, Cpu, Info, Puzzle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSignalStore } from '@/stores/signalStore';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { ENRICHMENT_PLUGINS } from '@/lib/enrichment/plugins';
import toast from 'react-hot-toast';

// ─── Toggle Component ──────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-accent-primary' : 'bg-border-subtle'} relative`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enabled ? 'left-4' : 'left-0.5'}`} />
    </button>
  );
}

// ─── Plugin Categories ─────────────────────────────────────────

const PLUGIN_CATEGORIES: { label: string; key: string }[] = [
  { label: 'Gamification', key: 'gamification' },
  { label: 'Aesthetics', key: 'aesthetics' },
  { label: 'Data', key: 'data' },
  { label: 'Ambient', key: 'ambient' },
  { label: 'Utility', key: 'utility' },
];

// ─── Main Component ────────────────────────────────────────────

export function SettingsPanel() {
  const toggleSettingsPanel = useUIStore(s => s.toggleSettingsPanel);
  const signals = useSignalStore(s => s.signals);
  const { isEnabled, updateSetting, initialize } = useEnrichmentStore();

  // Cache stats
  const [cacheEntries, setCacheEntries] = useState<number>(0);
  const [signalEnrichments, setSignalEnrichments] = useState<number>(0);

  // Poetry corpus status
  const [poetryStatus, setPoetryStatus] = useState<string>('Not built');
  const [poetryLoading, setPoetryLoading] = useState(false);

  // Animal preference
  const animalPref = useEnrichmentStore(s => s.settings['enrichment.animal_preference'] || 'random');

  // Fetch cache stats and poetry status on mount
  useEffect(() => {
    fetch('/api/enrichment/cache')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCacheEntries(data.cacheEntries ?? 0);
          setSignalEnrichments(data.signalEnrichments ?? 0);
        }
      })
      .catch(() => {});

    fetch('/api/enrichment/poetry')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.count !== undefined) {
          setPoetryStatus(data.count > 0 ? `${data.count} poems embedded` : 'Not built');
        }
      })
      .catch(() => {});
  }, []);

  const handleTogglePlugin = useCallback((pluginId: string) => {
    const current = isEnabled(pluginId);
    updateSetting(`enrichment.${pluginId}`, current ? 'false' : 'true');
  }, [isEnabled, updateSetting]);

  const handleAnimalPref = useCallback((value: string) => {
    updateSetting('enrichment.animal_preference', value);
  }, [updateSetting]);

  const handleBuildPoetry = useCallback(async () => {
    setPoetryLoading(true);
    try {
      const res = await fetch('/api/enrichment/poetry', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPoetryStatus(data.count ? `${data.count} poems embedded` : 'Built');
      toast.success('Poetry corpus built');
    } catch {
      toast.error('Failed to build poetry corpus');
    } finally {
      setPoetryLoading(false);
    }
  }, []);

  const handleClearCache = useCallback(async () => {
    try {
      const res = await fetch('/api/enrichment/cache', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setCacheEntries(0);
      setSignalEnrichments(0);
      toast.success('Enrichment cache cleared');
    } catch {
      toast.error('Failed to clear cache');
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    try {
      useEnrichmentStore.setState({ initialized: false });
      await initialize();
      toast.success('Enrichment data refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  }, [initialize]);

  const handleExport = async (format: 'json' | 'markdown' | 'obsidian') => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-export-${format}.${format === 'json' ? 'json' : 'zip'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
    if (!confirm('This will delete ALL signals, conversations, and settings. Are you REALLY sure?')) return;

    try {
      const res = await fetch('/api/signals', { method: 'DELETE' });
      if (!res.ok) throw new Error('Clear failed');
      toast.success('All data cleared');
      window.location.reload();
    } catch {
      toast.error('Failed to clear data');
    }
  };

  // Group plugins by category
  const pluginsByCategory = PLUGIN_CATEGORIES.map(cat => ({
    ...cat,
    plugins: ENRICHMENT_PLUGINS.filter(p => p.category === cat.key),
  }));

  return (
    <div className="fixed inset-0 z-40" onClick={() => toggleSettingsPanel(false)}>
      <div className="absolute inset-0 bg-void/60 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border-subtle shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-lg font-sans font-bold text-text-primary">Settings</h2>
          <button onClick={() => toggleSettingsPanel(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* AI Configuration */}
          <Section icon={<Cpu size={14} />} title="AI Configuration">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Anthropic Model</span>
                <span className="text-xs font-mono text-text-muted">claude-haiku-4-5-20251001</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">OpenAI Model</span>
                <span className="text-xs font-mono text-text-muted">gpt-4o-mini</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Embedding Model</span>
                <span className="text-xs font-mono text-text-muted">gemini-embedding-001</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Embedding Dimensions</span>
                <span className="text-xs font-mono text-text-muted">768</span>
              </div>
            </div>
          </Section>

          {/* Enrichment Plugins */}
          <Section icon={<Puzzle size={14} />} title="Enrichment Plugins">
            <div className="space-y-4">
              {pluginsByCategory.map(cat => (
                <div key={cat.key}>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">
                    {cat.label}
                  </div>
                  <div className="space-y-1.5">
                    {cat.plugins.map(plugin => (
                      <div key={plugin.id} className="flex items-center justify-between py-0.5">
                        <span className="text-xs text-text-secondary">{plugin.name}</span>
                        <Toggle
                          enabled={isEnabled(plugin.id)}
                          onToggle={() => handleTogglePlugin(plugin.id)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Error Animal Preference — after Gamification */}
                  {cat.key === 'gamification' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                      <span className="text-xs text-text-secondary">Error Animal</span>
                      <select
                        value={animalPref}
                        onChange={e => handleAnimalPref(e.target.value)}
                        className="text-xs bg-elevated border border-border-subtle rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-primary"
                      >
                        <option value="cats">Cats</option>
                        <option value="dogs">Dogs</option>
                        <option value="random">Random</option>
                      </select>
                    </div>
                  )}

                  {/* Poetry Corpus — after Ambient */}
                  {cat.key === 'ambient' && (
                    <div className="mt-2 pt-2 border-t border-border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Poetry Corpus</span>
                        <span className="text-[10px] font-mono text-text-muted">{poetryStatus}</span>
                      </div>
                      <button
                        onClick={handleBuildPoetry}
                        disabled={poetryLoading}
                        className="w-full text-left px-3 py-1.5 rounded-lg bg-elevated hover:bg-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {poetryLoading ? 'Building...' : 'Build Poetry Corpus'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Cache Management */}
              <div className="pt-3 border-t border-border-subtle space-y-2">
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">
                  Cache
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Cache entries</span>
                  <span className="text-xs font-mono text-text-muted">{cacheEntries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Signal enrichments</span>
                  <span className="text-xs font-mono text-text-muted">{signalEnrichments}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleClearCache}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-elevated hover:bg-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Clear Enrichment Cache
                  </button>
                  <button
                    onClick={handleRefreshAll}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-elevated hover:bg-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Refresh All
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Storage */}
          <Section icon={<Database size={14} />} title="Storage">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Database</span>
                <span className="text-xs font-mono text-text-muted">./data/nexus.db</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Signals</span>
                <span className="text-xs font-mono text-text-muted">{signals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">With embeddings</span>
                <span className="text-xs font-mono text-text-muted">{signals.filter(s => s.posX != null).length}</span>
              </div>
            </div>
          </Section>

          {/* Export */}
          <Section icon={<Download size={14} />} title="Export">
            <div className="space-y-2">
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 rounded-lg bg-elevated hover:bg-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Export All to JSON
              </button>
              <button
                onClick={() => handleExport('markdown')}
                className="w-full text-left px-3 py-2 rounded-lg bg-elevated hover:bg-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Export All to Markdown
              </button>
              <button
                onClick={() => handleExport('obsidian')}
                className="w-full text-left px-3 py-2 rounded-lg bg-elevated hover:bg-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Export All to Obsidian
              </button>
            </div>
          </Section>

          {/* Data Management */}
          <Section icon={<Trash2 size={14} />} title="Data Management">
            <button
              onClick={handleClearAll}
              className="w-full text-left px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger hover:bg-danger/20 transition-colors"
            >
              Clear All Data
            </button>
          </Section>

          {/* About */}
          <Section icon={<Info size={14} />} title="About">
            <div className="space-y-1">
              <div className="text-xs text-text-secondary">Nexus v1.0.0</div>
              <div className="text-xs text-text-muted">Local-first personal knowledge reactor</div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-muted">{icon}</span>
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
