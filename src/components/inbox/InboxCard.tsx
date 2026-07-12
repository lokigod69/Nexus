'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Archive, ChevronDown, RotateCw } from 'lucide-react';
import type { Capture } from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';
import { useCaptureStore, projectLabel } from '@/stores/captureStore';
import { spring, exitSpring, fade, quickFade, receive } from '@/components/motion';
import {
  CardMeta,
  EnrichSkeleton,
  SuggestionChip,
  TagPill,
} from '@/components/common/cardBits';
import { DeleteButton } from '@/components/common/DeleteButton';
import { ProjectPicker } from './ProjectPicker';

type ExitAction = 'route' | 'archive' | 'delete';

/**
 * One inbox capture. Primary: confirm the AI's suggested project (single
 * tap stays the fast path). Secondary: the multi-select picker. Tertiary:
 * archive; a quiet delete sits last. Committed cards exit with a spring —
 * routed to the right, archived to the left, deleted in place.
 */
export function InboxCard({
  capture,
  index = 0,
}: {
  capture: Capture;
  /** Position in the inbox list — drives the subtle entrance stagger. */
  index?: number;
}) {
  const reduced = useReducedMotion();
  const projects = useCaptureStore((s) => s.projects);
  const route = useCaptureStore((s) => s.route);
  const archive = useCaptureStore((s) => s.archive);
  const enrich = useCaptureStore((s) => s.enrich);
  const deleteCapture = useCaptureStore((s) => s.deleteCapture);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [exitAction, setExitAction] = useState<ExitAction>('route');
  const [busy, setBusy] = useState(false);
  const pickerToggleRef = useRef<HTMLButtonElement>(null);

  const closePicker = () => {
    setPickerOpen(false);
    pickerToggleRef.current?.focus(); // Escape hands focus back to the trigger
  };

  const suggested = capture.suggestedProject;
  const suggestedLabel = projectLabel(suggested, projects);

  const confirmSuggested = async () => {
    if (busy || !suggested) return;
    setBusy(true);
    setExitAction('route');
    const ok = await route(capture.id, [suggested]);
    if (!ok) setBusy(false);
  };

  const routeTo = async (slugs: string[]) => {
    if (busy || slugs.length === 0) return;
    setBusy(true);
    setExitAction('route');
    const ok = await route(capture.id, slugs);
    if (!ok) setBusy(false);
  };

  const archiveCapture = async () => {
    if (busy) return;
    setBusy(true);
    setExitAction('archive');
    const ok = await archive(capture.id);
    if (!ok) setBusy(false);
  };

  const removeCapture = async () => {
    if (busy) return;
    setBusy(true);
    setExitAction('delete');
    const ok = await deleteCapture(capture.id);
    if (!ok) setBusy(false);
  };

  return (
    <motion.li
      layout={!reduced}
      custom={exitAction}
      variants={{
        initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 },
        // Lists cascade in (~50ms apart, capped) instead of popping as a block.
        animate: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: reduced
            ? fade
            : { ...spring, delay: Math.min(index * 0.05, 0.25) },
        },
        // The one place momentum exists: a committed card leaves with a
        // slight bounce, in the direction of its verb. Delete is not a
        // momentum commit — it settles out in place, no bounce.
        exit: (action: ExitAction) =>
          reduced
            ? { opacity: 0, transition: fade }
            : action === 'delete'
              ? { opacity: 0, scale: 0.96, transition: spring }
              : {
                  opacity: 0,
                  x: action === 'archive' ? -56 : 56,
                  scale: 0.97,
                  transition: exitSpring,
                },
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduced ? fade : spring}
      className="list-none rounded-xl border border-line bg-surface p-4 sm:p-5"
    >
      <CardMeta capture={capture} />

      {/* Not clamped — the routing decision deserves the full title — so no
          tooltip; break-words keeps bare URLs inside the card at 375px. */}
      <h3 className="mt-2 text-pretty break-words text-lg font-medium leading-snug tracking-[-0.01em] text-ink">
        {capture.title ?? capture.content}
      </h3>

      <AnimatePresence mode="wait" initial={false}>
        {capture.enrichStatus === 'pending' ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: fade }}
            exit={{ opacity: 0, transition: quickFade }}
          >
            <EnrichSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="enriched"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: quickFade }}
            // Enrichment fields arrive ~45ms apart — the card receives its
            // information rather than re-rendering. Reduced: one cross-fade.
            variants={{
              hidden: reduced ? { opacity: 0 } : {},
              show: reduced
                ? { opacity: 1, transition: fade }
                : { transition: { staggerChildren: 0.045 } },
            }}
          >
            {capture.summary && (
              <motion.p
                variants={reduced ? undefined : receive}
                className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-secondary"
              >
                {capture.summary}
              </motion.p>
            )}
            {capture.takeaway && (
              <motion.p
                variants={reduced ? undefined : receive}
                className="mt-3 max-w-[62ch] border-l-2 border-accent/60 pl-3 text-sm leading-relaxed text-ink"
              >
                {capture.takeaway}
              </motion.p>
            )}
            {capture.tags.length > 0 && (
              <motion.div
                variants={reduced ? undefined : receive}
                className="mt-3 flex flex-wrap gap-1.5"
              >
                {capture.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} />
                ))}
              </motion.div>
            )}
            {suggested && (
              <motion.div
                variants={reduced ? undefined : receive}
                className="mt-4"
              >
                <SuggestionChip label={suggestedLabel} reason={capture.suggestedReason} />
              </motion.div>
            )}
            {capture.enrichStatus === 'failed' && (
              <motion.div
                variants={reduced ? undefined : receive}
                className="mt-3 flex items-center gap-2"
              >
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
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {suggested && capture.enrichStatus === 'done' && (
          <button
            type="button"
            onClick={() => void confirmSuggested()}
            disabled={busy}
            className="flex h-11 items-center rounded-lg bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-40"
          >
            Route to {suggestedLabel}
          </button>
        )}
        <button
          ref={pickerToggleRef}
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          disabled={busy}
          aria-expanded={pickerOpen}
          className="flex h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-[14px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          {suggested && capture.enrichStatus === 'done'
            ? 'Change projects'
            : 'Choose projects'}
          <motion.span
            animate={{ rotate: pickerOpen ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : spring}
            className="grid place-items-center"
            aria-hidden
          >
            <ChevronDown size={15} />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => void archiveCapture()}
          disabled={busy}
          className="ml-auto flex h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-ink-muted hover:bg-elevated hover:text-ink-secondary disabled:opacity-40"
        >
          <Archive size={15} aria-hidden />
          Archive capture
        </button>
        <DeleteButton
          busy={busy}
          delivered={capture.status === 'delivered'}
          onConfirm={() => void removeCapture()}
        />
      </div>

      <AnimatePresence initial={false}>
        {pickerOpen && (
          <ProjectPickerBoundary
            key="picker"
            suggestedSlug={suggested}
            initialSelected={
              suggested && capture.enrichStatus === 'done' ? [suggested] : []
            }
            busy={busy}
            onCommit={(slugs) => {
              setPickerOpen(false);
              void routeTo(slugs);
            }}
            onDismiss={closePicker}
          />
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// Small indirection so the picker reads the registry itself.
function ProjectPickerBoundary({
  suggestedSlug,
  initialSelected,
  busy,
  onCommit,
  onDismiss,
}: {
  suggestedSlug: string | null;
  initialSelected: string[];
  busy: boolean;
  onCommit: (slugs: string[]) => void;
  onDismiss?: () => void;
}) {
  const projects = useCaptureStore((s) => s.projects);
  return (
    <ProjectPicker
      projects={projects.filter((p) => p.slug !== GENERAL_PROJECT_SLUG)}
      suggestedSlug={suggestedSlug}
      initialSelected={initialSelected}
      busy={busy}
      onCommit={onCommit}
      onDismiss={onDismiss}
    />
  );
}
