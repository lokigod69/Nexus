'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

interface TagInfo {
  id: number;
  name: string;
}

interface TagInputProps {
  signalId: string;
  initialTags?: TagInfo[];
  onTagsChange?: (tags: TagInfo[]) => void;
  compact?: boolean;
}

export function TagInput({ signalId, initialTags = [], onTagsChange, compact = false }: TagInputProps) {
  const [tags, setTags] = useState<TagInfo[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [suggestions, setSuggestions] = useState<TagInfo[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialTags when they change (e.g. signal reload)
  // Use JSON serialization to avoid infinite loops from new array references
  const initialTagsKey = JSON.stringify(initialTags.map(t => t.id).sort());
  useEffect(() => {
    setTags(initialTags);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTagsKey]);

  // Focus input when revealed
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetch('/api/tags', { signal: controller.signal })
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(data => {
        const q = inputValue.toLowerCase();
        const existing = new Set(tags.map(t => t.name.toLowerCase()));
        const matches = (data.tags || [])
          .filter((t: TagInfo & { count?: number }) =>
            t.name.toLowerCase().includes(q) && !existing.has(t.name.toLowerCase())
          )
          .slice(0, 6);
        setSuggestions(matches);
        setHighlightedIdx(-1);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [inputValue, tags]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowInput(false);
        setInputValue('');
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addTag = useCallback(async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    try {
      const res = await fetch(`/api/signals/${signalId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: trimmed }),
      });
      if (!res.ok) return;
      const { tag } = await res.json();
      const newTags = [...tags, tag];
      setTags(newTags);
      onTagsChange?.(newTags);
    } catch {
      // silently fail
    }
    setInputValue('');
    setSuggestions([]);
  }, [signalId, tags, onTagsChange]);

  const removeTag = useCallback(async (tagId: number) => {
    try {
      await fetch(`/api/signals/${signalId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      const newTags = tags.filter(t => t.id !== tagId);
      setTags(newTags);
      onTagsChange?.(newTags);
    } catch {
      // silently fail
    }
  }, [signalId, tags, onTagsChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
        addTag(suggestions[highlightedIdx].name);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setInputValue('');
      setSuggestions([]);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1.5">
      {/* Existing tags as pills */}
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 text-text-secondary hover:bg-white/8 transition-colors ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
          }`}
        >
          <span className="font-mono">#{tag.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
            className="ml-0.5 text-text-ghost hover:text-red-400 transition-colors cursor-pointer"
          >
            <X size={compact ? 9 : 10} />
          </button>
        </span>
      ))}

      {/* Add button / input */}
      {showInput ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag..."
            className={`bg-white/5 border border-white/10 rounded-md text-text-primary placeholder-text-ghost focus:outline-none focus:border-accent-primary/40 transition-colors ${
              compact ? 'px-2 py-0.5 text-[10px] w-28' : 'px-2 py-1 text-[11px] w-36'
            }`}
          />
          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-lg overflow-hidden border border-white/10 z-50"
              style={{
                background: 'rgba(18, 18, 30, 0.98)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => addTag(s.name)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                    i === highlightedIdx
                      ? 'bg-accent-primary/15 text-white'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  #{s.name}
                </button>
              ))}
              {inputValue.trim() && !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <button
                  onClick={() => addTag(inputValue)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-accent-primary hover:bg-accent-primary/10 border-t border-white/5 cursor-pointer"
                >
                  + Create <span className="font-mono">#{inputValue.trim()}</span>
                </button>
              )}
            </div>
          )}
          {/* Show create option when no suggestions match */}
          {suggestions.length === 0 && inputValue.trim() && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-lg overflow-hidden border border-white/10 z-50"
              style={{
                background: 'rgba(18, 18, 30, 0.98)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              }}
            >
              <button
                onClick={() => addTag(inputValue)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-accent-primary hover:bg-accent-primary/10 cursor-pointer"
              >
                + Create <span className="font-mono">#{inputValue.trim()}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className={`inline-flex items-center gap-0.5 rounded-md border border-dashed border-white/10 text-text-ghost hover:text-text-muted hover:border-white/20 transition-colors cursor-pointer ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
          }`}
        >
          <Plus size={compact ? 9 : 10} />
          Tag
        </button>
      )}
    </div>
  );
}
