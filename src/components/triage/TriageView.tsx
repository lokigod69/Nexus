'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { TriageCard } from './TriageCard';
import { MemePopup } from '@/components/enrichment/MemePopup';
import { fetchMemeList, getRandomMeme } from '@/lib/enrichment/meme';
import { Inbox } from 'lucide-react';
import type { Signal } from '@/types';

export function TriageView() {
  const signals = useSignalStore(s => s.signals);
  const updateSignal = useSignalStore(s => s.updateSignal);
  const deleteSignal = useSignalStore(s => s.deleteSignal);
  const setViewMode = useUIStore(s => s.setViewMode);
  const isEnabled = useEnrichmentStore(s => s.isEnabled);

  const inboxSignals = signals.filter(s => s.status === 'inbox');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount] = useState(inboxSignals.length);
  const [animatingOut, setAnimatingOut] = useState<'keep' | 'today' | 'discard' | null>(null);
  const [memePopup, setMemePopup] = useState<{ url: string; name: string } | null>(null);
  const memesRef = useRef<{ id: string; name: string; url: string; width: number; height: number }[]>([]);

  // Pre-fetch meme list on mount
  useEffect(() => {
    if (isEnabled('memes')) {
      fetchMemeList().then(memes => { memesRef.current = memes; });
    }
  }, [isEnabled]);

  const currentSignal = inboxSignals[0] as Signal | undefined;
  const currentSignalRef = useRef(currentSignal);
  currentSignalRef.current = currentSignal;

  const handleAction = useCallback(async (action: 'keep' | 'today' | 'discard') => {
    const signal = currentSignalRef.current;
    if (!signal) return;
    setAnimatingOut(action);

    // Wait for animation
    await new Promise(r => setTimeout(r, 300));

    if (action === 'keep') {
      await updateSignal(signal.id, { status: 'active' } as any);
    } else if (action === 'today') {
      await updateSignal(signal.id, { status: 'playground' } as any);
    } else {
      await deleteSignal(signal.id);

      // Meme easter egg: 5% chance on discard
      if (isEnabled('memes') && Math.random() < 0.05) {
        const meme = getRandomMeme(memesRef.current);
        if (meme) {
          setMemePopup({ url: meme.url, name: meme.name });
        }
      }
    }

    setAnimatingOut(null);
    setCurrentIndex(i => i + 1);
  }, [updateSignal, deleteSignal, isEnabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!currentSignalRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'k':
        case 'K':
          e.preventDefault();
          handleAction('keep');
          break;
        case 'ArrowDown':
        case 't':
        case 'T':
          e.preventDefault();
          handleAction('today');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleAction('discard');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction]);

  if (!currentSignal) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Inbox size={48} className="text-text-ghost" />
        <h2 className="text-xl font-sans text-text-secondary">All caught up!</h2>
        <p className="text-sm font-mono text-text-muted">No signals in your inbox</p>
        <button
          onClick={() => setViewMode('grid')}
          className="mt-4 px-4 py-2 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-sm font-mono hover:bg-accent-primary/20 transition-colors"
        >
          Back to Grid
        </button>
      </div>
    );
  }

  const triaged = currentIndex;
  const total = totalCount || inboxSignals.length + triaged;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
          <span>{triaged} of {total} triaged</span>
          <span>{inboxSignals.length} remaining</span>
        </div>
        <div className="w-full h-1 bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-primary rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(triaged / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <TriageCard
          signal={currentSignal}
          animatingOut={animatingOut}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 px-6 pb-6">
        <button
          onClick={() => handleAction('keep')}
          className="flex flex-col items-center gap-1 px-8 py-3 rounded-xl bg-success/10 border border-success/30 text-success hover:bg-success/20 transition-colors"
        >
          <span className="text-lg font-sans font-bold">Keep</span>
          <span className="text-[10px] font-mono opacity-60">← / K</span>
        </button>
        <button
          onClick={() => handleAction('today')}
          className="flex flex-col items-center gap-1 px-8 py-3 rounded-xl bg-accent-prompts/10 border border-accent-prompts/30 text-accent-prompts hover:bg-accent-prompts/20 transition-colors"
        >
          <span className="text-lg font-sans font-bold">Do Today</span>
          <span className="text-[10px] font-mono opacity-60">↓ / T</span>
        </button>
        <button
          onClick={() => handleAction('discard')}
          className="flex flex-col items-center gap-1 px-8 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors"
        >
          <span className="text-lg font-sans font-bold">Discard</span>
          <span className="text-[10px] font-mono opacity-60">→ / D</span>
        </button>
      </div>

      {/* Meme Easter Egg */}
      {memePopup && (
        <MemePopup
          memeUrl={memePopup.url}
          memeName={memePopup.name}
          onClose={() => setMemePopup(null)}
        />
      )}
    </div>
  );
}
