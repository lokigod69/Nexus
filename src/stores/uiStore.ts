'use client';

import { create } from 'zustand';
import type { ViewMode } from '@/types';

interface UIState {
  viewMode: ViewMode;
  detailPanelOpen: boolean;
  sidebarOpen: boolean;
  captureModalOpen: boolean;
  captureModalDefaultTab: 'single' | 'bulk' | 'brain_dump';
  commandPaletteOpen: boolean;
  settingsPanelOpen: boolean;
  hoverPreviewEnabled: boolean;
  auditModalOpen: boolean;
  auditResult: string | null;
  auditLoading: boolean;
  conductorOpen: boolean;
  activeConductorConversationId: string | null;
}

interface UIActions {
  setViewMode: (mode: ViewMode) => void;
  toggleDetailPanel: (open?: boolean) => void;
  toggleSidebar: () => void;
  toggleCaptureModal: (open?: boolean, defaultTab?: 'single' | 'bulk' | 'brain_dump') => void;
  toggleCommandPalette: (open?: boolean) => void;
  toggleSettingsPanel: (open?: boolean) => void;
  toggleHoverPreview: (enabled?: boolean) => void;
  runAudit: () => Promise<void>;
  closeAudit: () => void;
  toggleConductor: (open?: boolean) => void;
  setActiveConductorConversation: (id: string | null) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  viewMode: 'feed',
  detailPanelOpen: false,
  sidebarOpen: true,
  captureModalOpen: false,
  captureModalDefaultTab: 'single' as const,
  commandPaletteOpen: false,
  settingsPanelOpen: false,
  hoverPreviewEnabled: true,
  auditModalOpen: false,
  auditResult: null,
  auditLoading: false,
  conductorOpen: false,
  activeConductorConversationId: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleDetailPanel: (open) => set((state) => ({ detailPanelOpen: open ?? !state.detailPanelOpen })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleCaptureModal: (open, defaultTab) => set((state) => ({
    captureModalOpen: open ?? !state.captureModalOpen,
    captureModalDefaultTab: defaultTab || 'single',
  })),
  toggleCommandPalette: (open) => set((state) => ({ commandPaletteOpen: open ?? !state.commandPaletteOpen })),
  toggleSettingsPanel: (open) => set((state) => ({ settingsPanelOpen: open ?? !state.settingsPanelOpen })),
  toggleHoverPreview: (enabled) => set((state) => ({ hoverPreviewEnabled: enabled ?? !state.hoverPreviewEnabled })),

  runAudit: async () => {
    set({ auditModalOpen: true, auditLoading: true, auditResult: null });
    try {
      const res = await fetch('/api/audit', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Audit failed');
      }
      const data = await res.json();
      set({ auditResult: data.audit, auditLoading: false });
    } catch (err: any) {
      set({ auditResult: `**Error:** ${err.message}`, auditLoading: false });
    }
  },

  closeAudit: () => set({ auditModalOpen: false, auditResult: null, auditLoading: false }),

  toggleConductor: (open) => set((state) => ({ conductorOpen: open ?? !state.conductorOpen })),

  setActiveConductorConversation: (id) => set({ activeConductorConversationId: id }),
}));
