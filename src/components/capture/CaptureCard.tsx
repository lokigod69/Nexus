'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, RotateCw } from 'lucide-react';
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
import { ProjectPicker } from '@/components/inbox/ProjectPicker';

type ExitAction = 'fade' | 'route' | 'delete';

/**
 * A recent capture on the capture screen. Appears optimistically the
 * instant the user submits; enrichment fields animate in when they land.
 * Once enrichment resolves, the suggestion chip is the quick-route fast
 * path; the compact chevron beside it opens the multi-select picker.
 */
export function CaptureCard({
  capture,
  index = 0,
}: {
  capture: Capture;
  /** Position in the recent list — drives the subtle entrance stagger. */
  index?: number;
}) {
  const reduced = useReducedMotion();
  const enrich = useCaptureStore((s) => s.enrich);
  const route = useCaptureStore((s) => s.route);
  const deleteCapture = useCaptureStore((s) => s.deleteCapture);
  const projects = useCaptureStore((s) => s.projects);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [exitAction, setExitAction] = useState<ExitAction>('fade');
  const [busy, setBusy] = useState(false);
  const pickerToggleRef = useRef<HTMLButtonElement>(null);

  const closePicker = () => {
    setPickerOpen(false);
    pickerToggleRef.current?.focus(); // Escape hands focus back to the trigger
  };

  const suggested = capture.suggestedProject;
  // The optimistic placeholder has no server id yet — no actions on it.
  const actionable = !capture.id.startsWith('optimistic-');

  const routeTo = async (slugs: string[]) => {
    if (busy || slugs.length === 0) return;
    setBusy(true);
    setExitAction('route');
    const ok = await route(capture.id, slugs);
    if (!ok) {
      setExitAction('fade');
      setBusy(false);
    }
  };

  const removeCapture = async () => {
    if (busy) return;
    setBusy(true);
    setExitAction('delete');
    const ok = await deleteCapture(capture.id);
    if (!ok) {
      setExitAction('fade');
      setBusy(false);
    }
  };

  const pickerToggle = (
    <button
      ref={pickerToggleRef}
      type="button"
      onClick={() => setPickerOpen((open) => !open)}
      disabled={busy}
      aria-expanded={pickerOpen}
      aria-label="Choose projects"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink-secondary hover:border-line-strong hover:text-ink disabled:opacity-40"
    >
      <motion.span
        animate={{ rotate: pickerOpen ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : spring}
        className="grid place-items-center"
        aria-hidden
      >
        <ChevronDown size={15} />
      </motion.span>
    </button>
  );

  return (
    <motion.li
      layout={!reduced}
      custom={exitAction}
      variants={{
        initial: reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 },
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
        // Routing is the one commit with momentum — it leaves to the right
        // with a slight bounce. Delete settles out in place; everything
        // else (sliding out of the recent five) is a plain cross-fade.
        exit: (action: ExitAction) =>
          reduced || action === 'fade'
            ? { opacity: 0, transition: fade }
            : action === 'delete'
              ? { opacity: 0, scale: 0.96, transition: spring }
              : { opacity: 0, x: 56, scale: 0.97, transition: exitSpring },
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduced ? fade : spring}
      className="list-none rounded-xl border border-line bg-surface p-4"
    >
      <CardMeta capture={capture} />

      <AnimatePresence mode="wait" initial={false}>
        {capture.enrichStatus === 'pending' ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: fade }}
            // The skeleton gets out of the way fast; the arriving fields
            // carry the motion — a tight handoff, not a re-render.
            exit={{ opacity: 0, transition: quickFade }}
          >
            <p className="mt-2 line-clamp-2 break-words text-[15px] leading-relaxed text-ink-secondary">
              {capture.content}
            </p>
            <EnrichSkeleton />
            {actionable && (
              <div className="mt-1 flex">
                <DeleteButton
                  busy={busy}
                  delivered={false}
                  onConfirm={() => void removeCapture()}
                  className="ml-auto"
                />
              </div>
            )}
          </motion.div>
        ) : capture.enrichStatus === 'done' ? (
          <motion.div
            key="done"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: quickFade }}
            // The card "receives" its enrichment: title, then summary, then
            // tags, then actions, ~45ms apart. Reduced motion: one cross-fade.
            variants={{
              hidden: reduced ? { opacity: 0 } : {},
              show: reduced
                ? { opacity: 1, transition: fade }
                : { transition: { staggerChildren: 0.045 } },
            }}
          >
            <motion.h3
              variants={reduced ? undefined : receive}
              title={capture.title ?? capture.content}
              className="mt-2 line-clamp-2 text-pretty break-words text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink"
            >
              {capture.title ?? capture.content}
            </motion.h3>
            {capture.summary && (
              <motion.p
                variants={reduced ? undefined : receive}
                className="mt-1.5 line-clamp-3 max-w-[62ch] text-sm leading-relaxed text-ink-secondary"
              >
                {capture.summary}
              </motion.p>
            )}
            {capture.tags.length > 0 && (
              <motion.div
                variants={reduced ? undefined : receive}
                className="mt-3 flex flex-wrap items-center gap-1.5"
              >
                {capture.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} />
                ))}
              </motion.div>
            )}
            {actionable && (
              <motion.div
                variants={reduced ? undefined : receive}
                className="mt-3 flex items-center gap-2"
              >
                {suggested && (
                  <SuggestionChip
                    label={projectLabel(suggested, projects)}
                    reason={null}
                    disabled={busy}
                    onClick={() => void routeTo([suggested])}
                  />
                )}
                {pickerToggle}
                <DeleteButton
                  busy={busy}
                  delivered={capture.status === 'delivered'}
                  onConfirm={() => void removeCapture()}
                  className="ml-auto"
                />
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: quickFade }}
            transition={fade}
          >
            <p className="mt-2 line-clamp-2 break-words text-[15px] leading-relaxed text-ink">
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
              {actionable && (
                <>
                  {pickerToggle}
                  <DeleteButton
                    busy={busy}
                    delivered={capture.status === 'delivered'}
                    onConfirm={() => void removeCapture()}
                    className="ml-auto"
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {pickerOpen && (
          <ProjectPicker
            key="picker"
            projects={projects.filter((p) => p.slug !== GENERAL_PROJECT_SLUG)}
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
