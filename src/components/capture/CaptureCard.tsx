'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RotateCw } from 'lucide-react';
import type { Capture } from '@/types';
import { useCaptureStore, projectLabel } from '@/stores/captureStore';
import { spring, fade } from '@/components/motion';
import {
  CardMeta,
  EnrichSkeleton,
  SuggestionChip,
  TagPill,
} from '@/components/common/cardBits';

/**
 * A recent capture on the capture screen. Appears optimistically the
 * instant the user submits; enrichment fields animate in when they land.
 */
export function CaptureCard({ capture }: { capture: Capture }) {
  const reduced = useReducedMotion();
  const enrich = useCaptureStore((s) => s.enrich);
  const projects = useCaptureStore((s) => s.projects);

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: fade }}
      transition={reduced ? fade : spring}
      className="list-none rounded-xl border border-line bg-surface p-4"
    >
      <CardMeta capture={capture} />

      <AnimatePresence mode="wait" initial={false}>
        {capture.enrichStatus === 'pending' ? (
          <motion.div key="pending" exit={{ opacity: 0, transition: fade }}>
            <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-secondary">
              {capture.content}
            </p>
            <EnrichSkeleton />
          </motion.div>
        ) : capture.enrichStatus === 'done' ? (
          <motion.div
            key="done"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? fade : spring}
          >
            <h3 className="mt-2 text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink">
              {capture.title ?? capture.content}
            </h3>
            {capture.summary && (
              <p className="mt-1.5 line-clamp-3 max-w-[62ch] text-sm leading-relaxed text-ink-secondary">
                {capture.summary}
              </p>
            )}
            {(capture.tags.length > 0 || capture.suggestedProject) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {capture.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} />
                ))}
                {capture.suggestedProject && (
                  <SuggestionChip
                    label={projectLabel(capture.suggestedProject, projects)}
                    reason={null}
                  />
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fade}
          >
            <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink">
              {capture.content}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-xs text-ink-muted">
                enrichment failed
              </span>
              <span aria-hidden className="text-ink-muted">
                ·
              </span>
              <button
                type="button"
                onClick={() => void enrich(capture.id)}
                className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[13px] font-medium text-accent hover:text-accent-strong"
              >
                <RotateCw size={13} aria-hidden />
                Retry enrichment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
