'use client';

import { useState, useCallback, useRef } from 'react';
import { Menu, Plus, Search, Settings } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';

export function Header() {
  const setFilters = useSignalStore(s => s.setFilters);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);
  const toggleSettingsPanel = useUIStore(s => s.toggleSettingsPanel);
  const toggleCommandPalette = useUIStore(s => s.toggleCommandPalette);
  const [searchValue, setSearchValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({ search: value || undefined });
    }, 300);
  }, [setFilters]);

  return (
    <header className="h-14 bg-surface border-b border-border-subtle flex items-center px-4 gap-4 shrink-0">
      {/* Left */}
      <button onClick={toggleSidebar} className="text-text-secondary hover:text-text-primary transition-colors">
        <Menu size={18} />
      </button>
      <span className="text-lg font-sans font-bold tracking-wide">
        <span className="text-accent-primary">&#9672;</span> NEXUS
      </span>

      {/* Center — Search */}
      <div className="flex-1 max-w-md mx-auto relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search signals..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-elevated border border-border-subtle rounded-lg py-1.5 pl-8 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors"
        />
        <button
          onClick={() => toggleCommandPalette(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-ghost hover:text-text-muted px-1.5 py-0.5 bg-surface rounded border border-border-subtle transition-colors"
        >
          Ctrl+K
        </button>
      </div>

      {/* Right */}
      <button
        onClick={() => toggleCaptureModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-sm font-mono hover:bg-accent-primary/20 transition-colors"
      >
        <Plus size={14} />
        Add URL
      </button>
      <button onClick={() => toggleSettingsPanel(true)} className="text-text-muted hover:text-text-secondary transition-colors">
        <Settings size={16} />
      </button>
    </header>
  );
}
