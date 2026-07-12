'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';
import type { CaptureStatus } from '@/types';
import { useCaptureStore } from '@/stores/captureStore';
import { useLibraryStore, type LibraryFilter } from '@/stores/libraryStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { spring } from '@/components/motion';
import { LibraryRow } from './LibraryRow';
import { AskPanel } from './AskPanel';

const FILTERS: Array<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'routed', label: 'Routed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'archived', label: 'Archived' },
];

/**
 * `/library` — the memory view. Full capture history with instant search
 * (debounced ~200ms, old results stay put until new ones land — no spinner
 * flash) and status filter chips. Ask Nexus lives one mode-switch away:
 * search filters instantly, Ask is a deliberate question.
 */
export function LibraryScreen() {
  const reduced = useReducedMotion();

  const items = useLibraryStore((s) => s.items);
  const loaded = useLibraryStore((s) => s.loaded);
  const query = useLibraryStore((s) => s.query);
  const filter = useLibraryStore((s) => s.filter);
  const mode = useLibraryStore((s) => s.mode);
  const highlightId = useLibraryStore((s) => s.highlightId);
  const setQuery = useLibraryStore((s) => s.setQuery);
  const setFilter = useLibraryStore((s) => s.setFilter);
  const setMode = useLibraryStore((s) => s.setMode);
  const clearHighlight = useLibraryStore((s) => s.clearHighlight);
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
  const deleteCapture = useLibraryStore((s) => s.deleteCapture);
  const restore = useLibraryStore((s) => s.restore);

  const fetchInbox = useCaptureStore((s) => s.fetchInbox);
  const fetchProjects = useCaptureStore((s) => s.fetchProjects);

  useEffect(() => {
    void fetchLibrary();
    void fetchInbox(); // header count stays honest on this screen too
    void fetchProjects();
  }, [fetchLibrary, fetchInbox, fetchProjects]);

  // Instant search: ~200ms debounce; the store drops stale responses, and
  // the previous results stay on screen until the new ones replace them.
  const firstQueryRun = useRef(true);
  useEffect(() => {
    if (firstQueryRun.current) {
      firstQueryRun.current = false;
      return;
    }
    const timer = setTimeout(() => void fetchLibrary(), 200);
    return () => clearTimeout(timer);
  }, [query, fetchLibrary]);

  // After tapping an Ask reference: scroll to the row, flash it, let go.
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!highlightId) {
      scrolledTo.current = null;
      return;
    }
    const el = document.getElementById(`capture-${highlightId}`);
    if (el && scrolledTo.current !== highlightId) {
      scrolledTo.current = highlightId;
      el.scrollIntoView({
        block: 'center',
        behavior: reduced ? 'auto' : 'smooth',
      });
    }
    const timer = setTimeout(clearHighlight, 2200);
    return () => clearTimeout(timer);
  }, [highlightId, items, reduced, clearHighlight]);

  const pickFilter = (value: LibraryFilter) => {
    setFilter(value);
    void fetchLibrary(); // chips refresh immediately, no debounce
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto w-full max-w-[640px] px-5 pb-24 pt-10 sm:pt-14">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            Library
          </h1>
          {loaded && mode === 'search' && (
            <span className="font-mono text-sm text-ink-muted">
              {items.length} {items.length === 1 ? 'capture' : 'captures'}
            </span>
          )}
        </div>

        {/* Two clearly different acts: search filters instantly, Ask thinks. */}
        <div
          role="tablist"
          aria-label="Search or ask"
          className="mt-5 inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1"
        >
          {/* The selected background is one shared pill that slides between
              tabs (layoutId), instead of two backgrounds blinking on/off. */}
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'search'}
            onClick={() => setMode('search')}
            className={`relative flex h-11 items-center gap-2 rounded-lg px-3.5 text-[14px] font-medium ${
              mode === 'search' ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {mode === 'search' && (
              <motion.span
                layoutId="library-mode-pill"
                aria-hidden
                transition={reduced ? { duration: 0 } : spring}
                className="absolute inset-0 rounded-lg bg-elevated"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Search size={15} aria-hidden />
              Search captures
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'ask'}
            onClick={() => setMode('ask')}
            className={`relative flex h-11 items-center gap-2 rounded-lg px-3.5 text-[14px] font-medium ${
              mode === 'ask' ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {mode === 'ask' && (
              <motion.span
                layoutId="library-mode-pill"
                aria-hidden
                transition={reduced ? { duration: 0 } : spring}
                className="absolute inset-0 rounded-lg bg-elevated"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={15} aria-hidden />
              Ask Nexus
            </span>
          </button>
        </div>

        {mode === 'ask' ? (
          <div className="mt-5">
            <AskPanel />
          </div>
        ) : (
          <>
            <div className="relative mt-5">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <label htmlFor="library-search" className="sr-only">
                Search captures
              </label>
              <input
                id="library-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, summaries, tags…"
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink transition-colors duration-150 placeholder:text-ink-muted focus:border-accent/50"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => pickFilter(f.value)}
                  className={`flex h-11 items-center rounded-lg px-3.5 text-[13px] font-medium ${
                    filter === f.value
                      ? 'border border-line-strong bg-elevated text-ink'
                      : 'border border-transparent text-ink-secondary hover:bg-elevated hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {!loaded ? (
              <div
                aria-label="Loading library"
                className="mt-4 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="shimmer h-4 w-2/3" />
                <div className="shimmer mt-2 h-3 w-2/5" />
                <div className="shimmer mt-5 h-4 w-1/2" />
                <div className="shimmer mt-2 h-3 w-1/3" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                query={query}
                filter={filter}
                onClearSearch={() => {
                  setQuery('');
                  void fetchLibrary();
                }}
                onShowAll={() => pickFilter('all')}
              />
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((c, i) => (
                    <LibraryRow
                      key={c.id}
                      capture={c}
                      index={i}
                      highlighted={c.id === highlightId}
                      onDelete={() => deleteCapture(c.id)}
                      onRestore={() => restore(c.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({
  query,
  filter,
  onClearSearch,
  onShowAll,
}: {
  query: string;
  filter: LibraryFilter;
  onClearSearch: () => void;
  onShowAll: () => void;
}) {
  const searched = query.trim().length > 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-line bg-surface px-6 py-16 text-center">
      <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
      {searched ? (
        <>
          <p className="max-w-[42ch] text-pretty text-[15px] leading-relaxed text-ink-secondary">
            No captures match{' '}
            <span className="font-mono text-sm text-ink">
              &ldquo;{query.trim()}&rdquo;
            </span>
            {filter !== 'all' && (
              <span> in {statusNoun(filter)}</span>
            )}
            . Try fewer words, or ask Nexus instead.
          </p>
          <button
            type="button"
            onClick={onClearSearch}
            className="flex h-11 items-center rounded-lg border border-line px-4 text-[14px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
          >
            Clear search
          </button>
        </>
      ) : filter !== 'all' ? (
        <>
          <p className="text-[15px] leading-relaxed text-ink-secondary">
            Nothing in {statusNoun(filter)} yet.
          </p>
          <button
            type="button"
            onClick={onShowAll}
            className="flex h-11 items-center rounded-lg border border-line px-4 text-[14px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
          >
            Show all captures
          </button>
        </>
      ) : (
        <p className="max-w-[42ch] text-pretty text-[15px] leading-relaxed text-ink-secondary">
          Nothing captured yet. Everything you save lands here, searchable
          forever.
        </p>
      )}
    </div>
  );
}

function statusNoun(filter: CaptureStatus | 'all'): string {
  switch (filter) {
    case 'inbox':
      return 'the inbox';
    case 'routed':
      return 'routed captures';
    case 'delivered':
      return 'delivered captures';
    case 'archived':
      return 'the archive';
    default:
      return 'the library';
  }
}
