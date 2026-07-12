import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { AskReference, Capture, CaptureStatus } from '@/types';
import { api, ApiError } from './api';
import { useCaptureStore } from './captureStore';

export type LibraryFilter = CaptureStatus | 'all';
export type LibraryMode = 'search' | 'ask';

// Monotonic ticket so a slow response never overwrites a newer search.
let fetchSeq = 0;

interface LibraryStore {
  /** Full-history rows for the current query + filter, newest first. */
  items: Capture[];
  loaded: boolean;
  query: string;
  filter: LibraryFilter;
  mode: LibraryMode;
  /** Row to scroll to + flash after tapping an Ask reference. */
  highlightId: string | null;

  // Ask state — zero history: one question, one answer.
  question: string;
  answer: string | null;
  references: AskReference[];
  asking: boolean;
  askError: string | null;

  setQuery: (q: string) => void;
  setFilter: (f: LibraryFilter) => void;
  setMode: (m: LibraryMode) => void;
  setQuestion: (q: string) => void;
  clearHighlight: () => void;
  /** Fetch rows for the CURRENT query + filter (debounced by the screen). */
  fetchLibrary: () => Promise<void>;
  /** Delete from Nexus's records; delivered raw/ files stay on disk. */
  deleteCapture: (id: string) => Promise<boolean>;
  /** Archived → back to inbox. */
  restore: (id: string) => Promise<boolean>;
  /** One-shot Q → A. Failures render inline (never toasted). */
  ask: () => Promise<void>;
  /** Jump from an Ask reference to its library row. */
  focusReference: (id: string) => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  items: [],
  loaded: false,
  query: '',
  filter: 'all',
  mode: 'search',
  highlightId: null,

  question: '',
  answer: null,
  references: [],
  asking: false,
  askError: null,

  setQuery: (q) => set({ query: q }),
  setFilter: (f) => set({ filter: f }),
  setMode: (m) => set({ mode: m }),
  setQuestion: (q) => set({ question: q }),
  clearHighlight: () => set({ highlightId: null }),

  fetchLibrary: async () => {
    const ticket = ++fetchSeq;
    const { query, filter } = get();
    try {
      const { captures } = await api.listCaptures(filter, 200, query);
      if (ticket !== fetchSeq) return; // a newer search already landed
      set({ items: captures, loaded: true });
    } catch (err) {
      if (ticket !== fetchSeq) return;
      set({ loaded: true });
      toast.error(err instanceof Error ? err.message : 'Could not load the library');
    }
  },

  deleteCapture: async (id) => {
    try {
      await api.deleteCapture(id);
      set((s) => ({ items: s.items.filter((c) => c.id !== id) }));
      // Keep the inbox list (header count) honest if it held this capture.
      useCaptureStore.setState((s) => ({
        captures: s.captures.filter((c) => c.id !== id),
      }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the capture');
      return false;
    }
  },

  restore: async (id) => {
    try {
      const { capture } = await api.updateCapture(id, { status: 'inbox' });
      set((s) => ({
        items:
          s.filter === 'archived'
            ? s.items.filter((c) => c.id !== id) // no longer matches the filter
            : s.items.map((c) => (c.id === id ? capture : c)),
      }));
      void useCaptureStore.getState().fetchInbox(); // header count + inbox list
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore the capture');
      return false;
    }
  },

  ask: async () => {
    const question = get().question.trim();
    if (!question || get().asking) return;
    // A new question replaces the old answer — no conversation history.
    set({ asking: true, askError: null, answer: null, references: [] });
    try {
      const { answer, references } = await api.ask(question);
      set({ answer, references, asking: false });
    } catch (err) {
      // Inline, honest, toast-free (design contract for Ask).
      const message =
        err instanceof ApiError && err.status === 502
          ? 'AI is unavailable right now'
          : err instanceof Error
            ? err.message
            : 'Something went wrong';
      set({ asking: false, askError: message });
    }
  },

  focusReference: (id) => {
    // Land the user on the row itself: search mode, no narrowing filters.
    set({ mode: 'search', filter: 'all', query: '', highlightId: id });
    void get().fetchLibrary();
  },
}));
