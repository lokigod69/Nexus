'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { startOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { FeedCard } from './FeedCard';
import { DateSeparator } from './DateSeparator';
import { SignalModal } from './SignalModal';
import { ChatModal } from './ChatModal';
import { EmptyState } from '@/components/common/EmptyState';
import type { Signal } from '@/types';

interface DateGroup {
  date: string;
  signals: Signal[];
}

function groupByDate(signals: Signal[]): DateGroup[] {
  const map = new Map<string, Signal[]>();
  for (const signal of signals) {
    const dayKey = startOfDay(new Date(signal.createdAt)).toISOString();
    const group = map.get(dayKey);
    if (group) {
      group.push(signal);
    } else {
      map.set(dayKey, [signal]);
    }
  }
  // Sort within each date group: by category (alphabetical), then newest first
  return Array.from(map.entries()).map(([date, sigs]) => ({
    date,
    signals: sigs.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
  }));
}

function AnimatedEntry({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const hasAnimated = useRef(false);
  const wasInitiallyVisible = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      wasInitiallyVisible.current = true;
      hasAnimated.current = true;
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const delay = Math.min(index * 30, 150);

  return (
    <div
      ref={ref}
      style={wasInitiallyVisible.current ? undefined : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: visible
          ? `opacity 0.4s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.4s cubic-bezier(0.4,0,0.2,1) ${delay}ms`
          : 'none',
      }}
    >
      {children}
    </div>
  );
}

export function FeedView() {
  const signals = useSignalStore(s => s.signals);
  const loading = useSignalStore(s => s.loading);
  const error = useSignalStore(s => s.error);
  const fetchSignals = useSignalStore(s => s.fetchSignals);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);

  // Ensure signals are fetched on mount (defensive — page.tsx also fetches)
  useEffect(() => {
    if (signals.length === 0 && !loading) {
      fetchSignals();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [chatModal, setChatModal] = useState<{ signalId: string; signalTitle: string } | null>(null);
  const [modalSignalId, setModalSignalId] = useState<string | null>(null);

  const groups = useMemo(() => groupByDate(signals), [signals]);

  if (loading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-sm text-danger font-mono">Failed to load signals</p>
          <p className="text-xs text-text-muted">{error}</p>
          <button
            onClick={() => fetchSignals()}
            className="cursor-pointer mt-2 px-3 py-1.5 text-xs text-text-secondary border border-border-subtle rounded hover:text-text-primary transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loading && signals.length === 0) {
    return (
      <div className="feed-container">
        <EmptyState variant="no-signals" onAction={() => toggleCaptureModal(true)} />
      </div>
    );
  }

  return (
    <>
      <div className="feed-container">
        {groups.map((group) => (
          <div key={group.date}>
            <DateSeparator date={group.date} signalCount={group.signals.length} signals={group.signals} />
            <div className="flex flex-col gap-6">
              {group.signals.map((signal, i) => (
                <AnimatedEntry key={signal.id} index={i}>
                  <FeedCard
                    signal={signal}
                    onOpenModal={(id) => setModalSignalId(id)}
                  />
                </AnimatedEntry>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalSignalId && (
        <SignalModal
          signalId={modalSignalId}
          onClose={() => setModalSignalId(null)}
          onOpenChat={(id, title) => setChatModal({ signalId: id, signalTitle: title })}
        />
      )}

      {chatModal && (
        <ChatModal
          signalId={chatModal.signalId}
          signalTitle={chatModal.signalTitle}
          onClose={() => setChatModal(null)}
        />
      )}
    </>
  );
}
