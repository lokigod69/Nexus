'use client';

import { useSignalStore } from '@/stores/signalStore';
import { SignalCard } from './SignalCard';
import { SignalCardSkeleton } from '@/components/common/SignalCardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { useUIStore } from '@/stores/uiStore';

export function SignalGrid() {
  const signals = useSignalStore(s => s.signals);
  const loading = useSignalStore(s => s.loading);
  const filters = useSignalStore(s => s.filters);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SignalCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    if (filters.search || filters.category) {
      return <EmptyState variant={filters.category ? 'no-category' : 'no-results'} />;
    }
    return <EmptyState variant="no-signals" onAction={() => toggleCaptureModal(true)} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {signals.map(signal => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
