'use client';

import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { Signal, SignalFilters } from '@/types';

interface SignalState {
  signals: Signal[];
  selectedSignalId: string | null;
  filters: SignalFilters;
  loading: boolean;
  capturing: boolean;
  captureProgress: 'idle' | 'scraping' | 'analyzing' | 'embedding' | 'captured' | 'error';
  error: string | null;
  stats: { total: number; fresh: number; starred: number; conversations: number };
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

interface SignalActions {
  fetchSignals: () => Promise<void>;
  fetchCategoryCounts: () => Promise<void>;
  captureSignal: (url: string, note?: string, category?: string) => Promise<void>;
  captureBrainDump: (content: string, title?: string, contentType?: string, category?: string) => Promise<void>;
  bulkCapture: (urls: string[], skipAnalysis?: boolean) => Promise<void>;
  updateSignal: (id: string, data: Partial<Signal>) => Promise<void>;
  deleteSignal: (id: string) => Promise<void>;
  selectSignal: (id: string | null) => void;
  setFilters: (filters: Partial<SignalFilters>) => void;
}

export const useSignalStore = create<SignalState & SignalActions>((set, get) => ({
  signals: [],
  selectedSignalId: null,
  filters: { sort: 'newest', limit: 50, offset: 0 },
  loading: true,
  capturing: false,
  captureProgress: 'idle',
  error: null,
  stats: { total: 0, fresh: 0, starred: 0, conversations: 0 },
  categoryCounts: {},
  statusCounts: {},

  fetchCategoryCounts: async () => {
    try {
      const res = await fetch('/api/signals/counts');
      if (!res.ok) return;
      const data = await res.json();
      set({ categoryCounts: data.categories || {}, statusCounts: data.statuses || {} });
    } catch {
      // silent — counts are non-critical
    }
  },

  fetchSignals: async () => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      const { filters } = get();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.offset) params.set('offset', String(filters.offset));

      const res = await fetch(`/api/signals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      const data = await res.json();
      set({ signals: data.signals, stats: { ...get().stats, total: data.total }, loading: false });
      get().fetchCategoryCounts();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  captureSignal: async (url, note, category) => {
    set({ capturing: true, captureProgress: 'scraping', error: null });
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, note, category }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Capture failed');
      }
      const data = await res.json();
      if (data._analysisError) {
        toast('Signal saved but AI analysis failed: ' + data._analysisError, { icon: '⚠️', duration: 6000 });
      }
      set({ captureProgress: 'captured' });
      // Refresh signals list
      await get().fetchSignals();
      // Refetch again after UMAP debounce (5s) + processing to pick up 3D positions
      setTimeout(() => get().fetchSignals(), 7000);
      setTimeout(() => set({ capturing: false, captureProgress: 'idle' }), 2000);
    } catch (err: any) {
      set({ error: err.message, capturing: false, captureProgress: 'error' });
    }
  },

  captureBrainDump: async (content, title, contentType, category) => {
    set({ capturing: true, captureProgress: 'analyzing', error: null });
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'brain_dump', content, title, contentType, category }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Brain dump capture failed');
      }
      const data = await res.json();
      if (data._analysisError) {
        toast('Thought saved but AI analysis failed: ' + data._analysisError, { icon: '⚠️', duration: 6000 });
      }
      set({ captureProgress: 'captured' });
      await get().fetchSignals();
      setTimeout(() => get().fetchSignals(), 7000);
      setTimeout(() => set({ capturing: false, captureProgress: 'idle' }), 2000);
    } catch (err: any) {
      set({ error: err.message, capturing: false, captureProgress: 'error' });
    }
  },

  bulkCapture: async (urls, skipAnalysis) => {
    set({ capturing: true, captureProgress: 'scraping', error: null });
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, skipAnalysis }),
      });
      if (!res.ok) throw new Error('Bulk capture failed');
      set({ captureProgress: 'captured' });
      await get().fetchSignals();
      setTimeout(() => set({ capturing: false, captureProgress: 'idle' }), 2000);
    } catch (err: any) {
      set({ error: err.message, capturing: false, captureProgress: 'error' });
    }
  },

  updateSignal: async (id, data) => {
    try {
      const res = await fetch(`/api/signals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      set({
        signals: get().signals.map(s => s.id === id ? { ...s, ...updated } : s),
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteSignal: async (id) => {
    try {
      await fetch(`/api/signals/${id}`, { method: 'DELETE' });
      set({
        signals: get().signals.filter(s => s.id !== id),
        selectedSignalId: get().selectedSignalId === id ? null : get().selectedSignalId,
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  selectSignal: (id) => set({ selectedSignalId: id }),

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchSignals();
  },
}));
