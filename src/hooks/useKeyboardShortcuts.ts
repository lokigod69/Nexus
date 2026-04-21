'use client';

import { useEffect } from 'react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import toast from 'react-hot-toast';

export function useKeyboardShortcuts() {
  const selectSignal = useSignalStore(s => s.selectSignal);
  const updateSignal = useSignalStore(s => s.updateSignal);
  const deleteSignal = useSignalStore(s => s.deleteSignal);

  const setViewMode = useUIStore(s => s.setViewMode);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);
  const toggleCommandPalette = useUIStore(s => s.toggleCommandPalette);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      // Read current state at event time (avoids stale closure / re-render issues)
      const { selectedSignalId, signals } = useSignalStore.getState();
      const { commandPaletteOpen, viewMode } = useUIStore.getState();

      // Mod+K: Command palette (always works)
      if (mod && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Mod+Shift+N: Capture Brain Dump
      if (mod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        toggleCaptureModal(true, 'brain_dump');
        return;
      }

      // Mod+N: Capture URL (always works)
      if (mod && e.key === 'n') {
        e.preventDefault();
        toggleCaptureModal(true);
        return;
      }

      // Mod+1-4: Switch views (always works)
      if (mod && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const views = ['universe', 'grid', 'timeline', 'triage'] as const;
        setViewMode(views[parseInt(e.key) - 1]);
        return;
      }

      // Escape: close panels
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          toggleCommandPalette(false);
          return;
        }
        selectSignal(null);
        toggleDetailPanel(false);
        return;
      }

      // Don't handle single-key shortcuts in inputs or when triage view is active
      // (triage has its own keyboard handlers)
      if (isInput || viewMode === 'triage') return;

      // Single-key shortcuts require a selected signal
      if (!selectedSignalId) return;
      const signal = signals.find(s => s.id === selectedSignalId);
      if (!signal) return;

      switch (e.key.toLowerCase()) {
        case 's': {
          e.preventDefault();
          const newStatus = signal.status === 'starred' ? 'active' : 'starred';
          updateSignal(signal.id, { status: newStatus } as any);
          toast.success(newStatus === 'starred' ? 'Signal starred' : 'Star removed');
          break;
        }
        case 'a': {
          e.preventDefault();
          const newStatus = signal.status === 'archived' ? 'active' : 'archived';
          updateSignal(signal.id, { status: newStatus } as any);
          toast.success(newStatus === 'archived' ? 'Signal archived' : 'Signal restored');
          break;
        }
        case 'd': {
          e.preventDefault();
          if (confirm('Delete this signal?')) {
            deleteSignal(signal.id);
            selectSignal(null);
            toggleDetailPanel(false);
            toast.success('Signal deleted');
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectSignal, updateSignal, deleteSignal, setViewMode, toggleCaptureModal, toggleCommandPalette, toggleDetailPanel]);
}
