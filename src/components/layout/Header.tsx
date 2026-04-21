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
    <header
      className="h-14 flex items-center px-4 gap-4 shrink-0 relative z-10"
      style={{
        background: 'rgba(8, 8, 13, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* Left */}
      <button onClick={toggleSidebar} className="cursor-pointer text-text-secondary hover:text-text-primary transition-colors">
        <Menu size={18} />
      </button>
      <span className="text-lg font-sans font-bold tracking-wide nexus-logo-glow">
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
          className="w-full rounded-lg py-1.5 pl-8 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />
        <button
          onClick={() => toggleCommandPalette(true)}
          className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-ghost hover:text-text-muted px-1.5 py-0.5 rounded transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Ctrl+K
        </button>
      </div>

      {/* Right */}
      <button
        onClick={() => toggleCaptureModal(true)}
        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-accent-primary rounded-lg text-sm font-mono transition-all duration-200 hover:scale-105"
        style={{
          background: 'rgba(0, 255, 163, 0.08)',
          border: '1px solid rgba(0, 255, 163, 0.25)',
          boxShadow: '0 0 12px rgba(0, 255, 163, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 163, 0.25)';
          e.currentTarget.style.borderColor = 'rgba(0, 255, 163, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 163, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(0, 255, 163, 0.25)';
        }}
      >
        <Plus size={14} />
        Add URL
      </button>
      <button onClick={() => toggleSettingsPanel(true)} className="cursor-pointer text-text-muted hover:text-text-secondary transition-colors">
        <Settings size={16} />
      </button>
    </header>
  );
}
