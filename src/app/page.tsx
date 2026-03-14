'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SignalGrid } from '@/components/signals/SignalGrid';
import { SignalDetail } from '@/components/signals/SignalDetail';
import { URLInput } from '@/components/capture/URLInput';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const UniverseView = dynamic(
  () => import('@/components/universe/UniverseView').then(m => ({ default: m.UniverseView })),
  { ssr: false }
);
const TriageView = dynamic(
  () => import('@/components/triage/TriageView').then(m => ({ default: m.TriageView })),
  { ssr: false }
);
const TimelineView = dynamic(
  () => import('@/components/timeline/TimelineView').then(m => ({ default: m.TimelineView })),
  { ssr: false }
);

function MainView() {
  const viewMode = useUIStore(s => s.viewMode);
  switch (viewMode) {
    case 'universe':
      return <UniverseView />;
    case 'triage':
      return <TriageView />;
    case 'timeline':
      return <TimelineView />;
    case 'grid':
    default:
      return <SignalGrid />;
  }
}

export default function Home() {
  const fetchSignals = useSignalStore(s => s.fetchSignals);
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const detailPanelOpen = useUIStore(s => s.detailPanelOpen);
  const selectedSignalId = useSignalStore(s => s.selectedSignalId);
  const captureModalOpen = useUIStore(s => s.captureModalOpen);
  const commandPaletteOpen = useUIStore(s => s.commandPaletteOpen);
  const settingsPanelOpen = useUIStore(s => s.settingsPanelOpen);
  const viewMode = useUIStore(s => s.viewMode);

  useKeyboardShortcuts();

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const isFullscreen = viewMode === 'universe' || viewMode === 'triage';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className={`flex-1 overflow-hidden ${isFullscreen ? '' : 'overflow-y-auto p-4'}`}>
          <MainView />
        </main>
        {detailPanelOpen && selectedSignalId && viewMode !== 'triage' && (
          <SignalDetail signalId={selectedSignalId} />
        )}
      </div>
      {captureModalOpen && <URLInput />}
      {commandPaletteOpen && <CommandPalette />}
      {settingsPanelOpen && <SettingsPanel />}
    </div>
  );
}
