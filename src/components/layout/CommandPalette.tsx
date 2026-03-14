'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Globe, Hash, Folder, Zap } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { getCategoryColor } from '@/lib/utils/categories';
import type { Signal, ViewMode } from '@/types';

interface CommandResult {
  id: string;
  type: 'signal' | 'command';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  action: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const signals = useSignalStore(s => s.signals);
  const selectSignal = useSignalStore(s => s.selectSignal);
  const setFilters = useSignalStore(s => s.setFilters);
  const captureSignal = useSignalStore(s => s.captureSignal);
  const setViewMode = useUIStore(s => s.setViewMode);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);
  const toggleCommandPalette = useUIStore(s => s.toggleCommandPalette);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    toggleCommandPalette(false);
    setQuery('');
    setSelectedIndex(0);
  }, [toggleCommandPalette]);

  const results = useMemo((): CommandResult[] => {
    const items: CommandResult[] = [];
    const q = query.trim().toLowerCase();

    // Command prefixes
    if (q.startsWith('/tag:')) {
      const tag = q.slice(5);
      if (tag) {
        items.push({
          id: `filter-tag-${tag}`,
          type: 'command',
          title: `Filter by tag: ${tag}`,
          icon: <Hash size={14} />,
          action: () => { setFilters({ search: tag }); close(); },
        });
      }
      return items;
    }

    if (q.startsWith('/cat:')) {
      const cat = q.slice(5);
      if (cat) {
        items.push({
          id: `filter-cat-${cat}`,
          type: 'command',
          title: `Filter by category: ${cat}`,
          icon: <Folder size={14} />,
          action: () => { setFilters({ category: cat }); close(); },
        });
      }
      return items;
    }

    if (q.startsWith('/status:')) {
      const status = q.slice(8);
      if (status) {
        items.push({
          id: `filter-status-${status}`,
          type: 'command',
          title: `Filter by status: ${status}`,
          icon: <Zap size={14} />,
          action: () => { setFilters({ status }); close(); },
        });
      }
      return items;
    }

    if (q.startsWith('/add ')) {
      const url = q.slice(5).trim();
      if (url) {
        items.push({
          id: 'add-url',
          type: 'command',
          title: `Capture URL: ${url}`,
          icon: <Globe size={14} />,
          action: () => { captureSignal(url); close(); },
        });
      }
      return items;
    }

    // Built-in commands
    if (!q || 'universe'.includes(q) || 'grid'.includes(q) || 'timeline'.includes(q) || 'triage'.includes(q)) {
      const views: Array<{ mode: ViewMode; label: string }> = [
        { mode: 'universe', label: 'Switch to Universe view' },
        { mode: 'grid', label: 'Switch to Grid view' },
        { mode: 'timeline', label: 'Switch to Timeline view' },
        { mode: 'triage', label: 'Switch to Triage view' },
      ];
      views.forEach(v => {
        if (!q || v.label.toLowerCase().includes(q)) {
          items.push({
            id: `view-${v.mode}`,
            type: 'command',
            title: v.label,
            icon: <Globe size={14} />,
            action: () => { setViewMode(v.mode); close(); },
          });
        }
      });
    }

    if (!q) {
      items.push({
        id: 'add-url-cmd',
        type: 'command',
        title: 'Add URL...',
        subtitle: 'Capture a new signal',
        icon: <Globe size={14} />,
        action: () => { toggleCaptureModal(true); close(); },
      });
    }

    // Search signals
    const filtered = q
      ? signals.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.summary?.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.tags?.some(t => t.name.toLowerCase().includes(q))
        )
      : signals.slice(0, 8); // Show recent when empty

    filtered.slice(0, 10).forEach(s => {
      items.push({
        id: s.id,
        type: 'signal',
        title: s.title,
        subtitle: s.category,
        color: getCategoryColor(s.category),
        action: () => {
          selectSignal(s.id);
          toggleDetailPanel(true);
          close();
        },
      });
    });

    return items;
  }, [query, signals, setFilters, setViewMode, selectSignal, toggleDetailPanel, toggleCaptureModal, captureSignal, close]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={close}>
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface border border-border-subtle rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search signals or type a command..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-text-ghost px-1.5 py-0.5 bg-elevated rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-muted">No results</div>
          )}
          {results.map((result, i) => (
            <button
              key={result.id}
              onClick={result.action}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex ? 'bg-elevated' : 'hover:bg-elevated/50'
              }`}
            >
              {result.color ? (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: result.color }} />
              ) : (
                <span className="text-text-muted shrink-0">{result.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-[10px] font-mono text-text-muted">{result.subtitle}</p>
                )}
              </div>
              {result.type === 'command' && (
                <span className="text-[10px] font-mono text-text-ghost">cmd</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[10px] font-mono text-text-ghost">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>/tag: /cat: /status: /add</span>
        </div>
      </div>
    </div>
  );
}
