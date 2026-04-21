'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { DotGrid } from '@/components/common/DotGrid';
import { AuditModal } from '@/components/common/AuditModal';
import { ConductorButton } from '@/components/conductor/ConductorButton';
import { ConductorPanel } from '@/components/conductor/ConductorPanel';
import { SignalModal } from '@/components/feed/SignalModal';
import { ChatModal } from '@/components/feed/ChatModal';

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
const FeedView = dynamic(
  () => import('@/components/feed/FeedView').then(m => ({ default: m.FeedView })),
  { ssr: false }
);
const DocsView = dynamic(
  () => import('@/components/docs/DocsView').then(m => ({ default: m.DocsView })),
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
      return <SignalGrid />;
    case 'docs':
      return <DocsView />;
    case 'feed':
    default:
      return <FeedView />;
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

  // Conductor-triggered signal modal
  const [conductorModalSignalId, setConductorModalSignalId] = useState<string | null>(null);
  const [conductorChatModal, setConductorChatModal] = useState<{ signalId: string; signalTitle: string } | null>(null);
  const signals = useSignalStore(s => s.signals);

  useKeyboardShortcuts();

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals, viewMode]);

  // Listen for conductor signal-open events
  useEffect(() => {
    const handler = (e: Event) => {
      const { signalId } = (e as CustomEvent).detail;
      setConductorModalSignalId(signalId);
    };
    window.addEventListener('conductor:open-signal', handler);
    return () => window.removeEventListener('conductor:open-signal', handler);
  }, []);

  const isFullscreen = viewMode === 'universe' || viewMode === 'triage';
  const isFeed = viewMode === 'feed';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DotGrid />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className={`flex-1 ${isFullscreen ? 'overflow-hidden' : isFeed ? 'overflow-x-hidden overflow-y-auto' : 'overflow-x-hidden overflow-y-auto p-4'}`}>
          <MainView />
        </main>
        {detailPanelOpen && selectedSignalId && viewMode !== 'triage' && viewMode !== 'feed' && (
          <SignalDetail signalId={selectedSignalId} />
        )}
      </div>
      {captureModalOpen && <URLInput />}
      {commandPaletteOpen && <CommandPalette />}
      {settingsPanelOpen && <SettingsPanel />}
      <AuditModal />

      {/* Conductor */}
      <ConductorButton />
      <ConductorPanel />

      {/* Conductor-triggered signal modal */}
      {conductorModalSignalId && (
        <SignalModal
          signalId={conductorModalSignalId}
          onClose={() => setConductorModalSignalId(null)}
          onOpenChat={(id, title) => {
            setConductorModalSignalId(null);
            setConductorChatModal({ signalId: id, signalTitle: title });
          }}
        />
      )}
      {conductorChatModal && (
        <ChatModal
          signalId={conductorChatModal.signalId}
          signalTitle={conductorChatModal.signalTitle}
          onClose={() => setConductorChatModal(null)}
        />
      )}
    </div>
  );
}
