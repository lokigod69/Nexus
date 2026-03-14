'use client';

import { create } from 'zustand';
import type { ViewMode } from '@/types';

interface UIState {
  viewMode: ViewMode;
  detailPanelOpen: boolean;
  sidebarOpen: boolean;
  captureModalOpen: boolean;
  commandPaletteOpen: boolean;
  settingsPanelOpen: boolean;
}

interface UIActions {
  setViewMode: (mode: ViewMode) => void;
  toggleDetailPanel: (open?: boolean) => void;
  toggleSidebar: () => void;
  toggleCaptureModal: (open?: boolean) => void;
  toggleCommandPalette: (open?: boolean) => void;
  toggleSettingsPanel: (open?: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  viewMode: 'grid',
  detailPanelOpen: false,
  sidebarOpen: true,
  captureModalOpen: false,
  commandPaletteOpen: false,
  settingsPanelOpen: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleDetailPanel: (open) => set((state) => ({ detailPanelOpen: open ?? !state.detailPanelOpen })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleCaptureModal: (open) => set((state) => ({ captureModalOpen: open ?? !state.captureModalOpen })),
  toggleCommandPalette: (open) => set((state) => ({ commandPaletteOpen: open ?? !state.commandPaletteOpen })),
  toggleSettingsPanel: (open) => set((state) => ({ settingsPanelOpen: open ?? !state.settingsPanelOpen })),
}));
