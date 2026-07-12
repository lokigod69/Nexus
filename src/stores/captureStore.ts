import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { BrainProject, Capture } from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';
import { api } from './api';
import { playCue } from '@/components/sound/sound';
import { AUTO_MODEL, getPreferredModel } from './modelPreference';

const URL_RE = /^https?:\/\/\S+$/i;

/** Optimistic placeholder shown the instant the user submits. */
function makeOptimisticCapture(content: string): Capture {
  const trimmed = content.trim();
  const isUrl = URL_RE.test(trimmed);
  let source: string | null = null;
  if (isUrl) {
    try {
      source = new URL(trimmed).hostname.replace(/^www\./, '');
    } catch {
      source = null;
    }
  }
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: isUrl ? 'url' : 'text',
    content: trimmed,
    url: isUrl ? trimmed : null,
    title: null,
    summary: null,
    takeaway: null,
    tags: [],
    suggestedProject: null,
    suggestedReason: null,
    projects: [],
    status: 'inbox',
    enrichStatus: 'pending',
    extract: null,
    source,
    createdAt: Math.floor(Date.now() / 1000),
    routedAt: null,
    deliveredAt: null,
  };
}

interface CaptureStore {
  /** Inbox captures, newest first. Single source for cards + header count. */
  captures: Capture[];
  inboxLoaded: boolean;
  projects: BrainProject[];
  projectsLoaded: boolean;

  fetchInbox: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  /** Optimistic create → POST → fire-and-track enrich. Returns success. */
  capture: (content: string) => Promise<boolean>;
  /** (Re-)fires enrichment for a capture; plays 'success' on completion. */
  enrich: (id: string) => Promise<void>;
  /** Confirm 1+ routing targets. Plays 'tick' + removes the card on success. */
  route: (id: string, projectSlugs: string[]) => Promise<boolean>;
  /** Archive a capture. Removes the card on success. */
  archive: (id: string) => Promise<boolean>;
  /** Delete a capture from Nexus's records. Removes the card on success. */
  deleteCapture: (id: string) => Promise<boolean>;
}

function replaceCapture(list: Capture[], id: string, next: Capture): Capture[] {
  return list.map((c) => (c.id === id ? next : c));
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  captures: [],
  inboxLoaded: false,
  projects: [],
  projectsLoaded: false,

  fetchInbox: async () => {
    try {
      const { captures } = await api.listCaptures('inbox', 50);
      set({ captures, inboxLoaded: true });
    } catch (err) {
      set({ inboxLoaded: true });
      toast.error(err instanceof Error ? err.message : 'Could not load the inbox');
    }
  },

  fetchProjects: async () => {
    if (get().projectsLoaded) return;
    try {
      const { projects } = await api.listProjects();
      set({ projects, projectsLoaded: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    }
  },

  capture: async (content: string) => {
    const optimistic = makeOptimisticCapture(content);
    set((s) => ({ captures: [optimistic, ...s.captures] }));
    try {
      const { capture } = await api.createCapture(content);
      set((s) => ({ captures: replaceCapture(s.captures, optimistic.id, capture) }));
      // Enrichment is a separate, tracked call — never block the input on it.
      void get().enrich(capture.id);
      return true;
    } catch (err) {
      set((s) => ({ captures: s.captures.filter((c) => c.id !== optimistic.id) }));
      toast.error(err instanceof Error ? err.message : 'Could not save the capture');
      return false;
    }
  },

  enrich: async (id: string) => {
    set((s) => ({
      captures: s.captures.map((c) =>
        c.id === id ? { ...c, enrichStatus: 'pending' as const } : c,
      ),
    }));
    try {
      const preferred = getPreferredModel();
      const { capture } = await api.enrichCapture(
        id,
        preferred === AUTO_MODEL ? undefined : preferred
      );
      set((s) => ({ captures: replaceCapture(s.captures, id, capture) }));
      if (capture.enrichStatus === 'done') playCue('success');
      // 'failed' is shown in-card (retry affordance) — never toasted.
    } catch {
      // Transport failure: keep the card usable and routable, mark failed.
      set((s) => ({
        captures: s.captures.map((c) =>
          c.id === id ? { ...c, enrichStatus: 'failed' as const } : c,
        ),
      }));
    }
  },

  route: async (id: string, projectSlugs: string[]) => {
    if (projectSlugs.length === 0) return false;
    try {
      await api.updateCapture(id, { projects: projectSlugs });
      set((s) => ({ captures: s.captures.filter((c) => c.id !== id) }));
      // The one route-confirm sound, wherever the commit came from.
      playCue('tick');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not route the capture');
      return false;
    }
  },

  archive: async (id: string) => {
    try {
      await api.updateCapture(id, { status: 'archived' });
      set((s) => ({ captures: s.captures.filter((c) => c.id !== id) }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive the capture');
      return false;
    }
  },

  deleteCapture: async (id: string) => {
    try {
      await api.deleteCapture(id);
      set((s) => ({ captures: s.captures.filter((c) => c.id !== id) }));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the capture');
      return false;
    }
  },
}));

/** Display name for a project slug — registry name, or a tidied slug. */
export function projectLabel(slug: string | null, projects: BrainProject[]): string {
  if (!slug) return 'General';
  if (slug === GENERAL_PROJECT_SLUG) return 'General';
  const match = projects.find((p) => p.slug === slug);
  return match ? match.name : slug.replace(/-/g, ' ').toUpperCase();
}
