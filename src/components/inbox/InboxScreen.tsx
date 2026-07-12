'use client';

import { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { useCaptureStore } from '@/stores/captureStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { InboxCard } from './InboxCard';

/**
 * `/inbox` — every capture awaiting a routing decision. Confirm the AI's
 * suggestion, pick another project, or archive; committed cards spring out.
 */
export function InboxScreen() {
  const captures = useCaptureStore((s) => s.captures);
  const inboxLoaded = useCaptureStore((s) => s.inboxLoaded);
  const fetchInbox = useCaptureStore((s) => s.fetchInbox);
  const fetchProjects = useCaptureStore((s) => s.fetchProjects);

  useEffect(() => {
    void fetchInbox();
    void fetchProjects();
  }, [fetchInbox, fetchProjects]);

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto w-full max-w-[640px] px-5 pb-24 pt-10 sm:pt-14">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            Inbox
          </h1>
          {inboxLoaded && captures.length > 0 && (
            <span className="font-mono text-sm text-ink-muted">
              {captures.length} waiting
            </span>
          )}
        </div>

        {!inboxLoaded ? (
          <div
            aria-label="Loading inbox"
            className="mt-6 rounded-xl border border-line bg-surface p-5"
          >
            <div className="shimmer h-3 w-24" />
            <div className="shimmer mt-4 h-5 w-2/3" />
            <div className="shimmer mt-3 h-3 w-full" />
            <div className="shimmer mt-2 h-3 w-4/5" />
          </div>
        ) : captures.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-28 text-center">
            <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
            <p className="text-pretty text-[15px] leading-relaxed text-ink-secondary">
              Inbox zero. Everything is where it belongs.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-4">
            <AnimatePresence initial={false} mode="popLayout">
              {captures.map((c, i) => (
                <InboxCard key={c.id} capture={c} index={i} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </div>
  );
}
