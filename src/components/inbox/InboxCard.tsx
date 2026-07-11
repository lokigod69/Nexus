'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Archive, ChevronDown, RotateCw } from 'lucide-react';
import type { Capture } from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';
import { useCaptureStore, projectLabel } from '@/stores/captureStore';
import { playCue } from '@/components/sound/sound';
import { spring, exitSpring, fade } from '@/components/motion';
import {
  CardMeta,
  EnrichSkeleton,
  SuggestionChip,
  TagPill,
} from '@/components/common/cardBits';
import { ProjectPicker } from './ProjectPicker';

type ExitAction = 'route' | 'archive';

/**
 * One inbox capture. Primary: confirm the AI's suggested project.
 * Secondary: pick a different one. Tertiary: archive. Committed cards
 * exit with a spring — routed to the right, archived to the left.
 */
export function InboxCard({ capture }: { capture: Capture }) {
  const reduced = useReducedMotion();
  const projects = useCaptureStore((s) => s.projects);
  const route = useCaptureStore((s) => s.route);
  const archive = useCaptureStore((s) => s.archive);
  const enrich = useCaptureStore((s) => s.enrich);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [exitAction, setExitAction] = useState<ExitAction>('route');
  const [busy, setBusy] = useState(false);

  const suggested = capture.suggestedProject;
  const suggestedLabel = projectLabel(suggested, projects);

  const confirmSuggested = async () => {
    if (busy || !suggested) return;
    setBusy(true);
    setExitAction('route');
    const ok = await route(capture.id, suggested);
    if (ok) playCue('tick');
    else setBusy(false);
  };

  const routeTo = async (slug: string) => {
    if (busy) return;
    setBusy(true);
    setExitAction('route');
    const ok = await route(capture.id, slug);
    if (!ok) setBusy(false);
  };

  const archiveCapture = async () => {
    if (busy) return;
    setBusy(true);
    setExitAction('archive');
    const ok = await archive(capture.id);
    if (!ok) setBusy(false);
  };

  return (
    <motion.li
      layout={!reduced}
      custom={exitAction}
      variants={{
        initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        // The one place momentum exists: a committed card leaves with a
        // slight bounce, in the direction of its verb.
        exit: (action: ExitAction) =>
          reduced
            ? { opacity: 0, transition: fade }
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

      <h3 className="mt-2 text-lg font-medium leading-snug tracking-[-0.01em] text-ink">
        {capture.title ?? capture.content}
      </h3>

      {capture.enrichStatus === 'pending' ? (
        <EnrichSkeleton />
      ) : (
        <>
          {capture.summary && (
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-secondary">
              {capture.summary}
            </p>
          )}
          {capture.takeaway && (
            <p className="mt-3 max-w-[62ch] border-l-2 border-accent/60 pl-3 text-sm leading-relaxed text-ink">
              {capture.takeaway}
            </p>
          )}
          {capture.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {capture.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          )}
          {suggested && (
            <div className="mt-4">
              <SuggestionChip label={suggestedLabel} reason={capture.suggestedReason} />
            </div>
          )}
          {capture.enrichStatus === 'failed' && (
            <div className="mt-3 flex items-center gap-2">
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
          )}
        </>
      )}

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
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          disabled={busy}
          aria-expanded={pickerOpen}
          className="flex h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-[14px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          {suggested && capture.enrichStatus === 'done'
            ? 'Change project'
            : 'Choose project'}
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
      </div>

      <AnimatePresence initial={false}>
        {pickerOpen && (
          <ProjectPickerBoundary
            key="picker"
            suggestedSlug={suggested}
            onPick={(slug) => {
              setPickerOpen(false);
              void routeTo(slug);
            }}
          />
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// Small indirection so the picker reads the registry itself.
function ProjectPickerBoundary({
  suggestedSlug,
  onPick,
}: {
  suggestedSlug: string | null;
  onPick: (slug: string) => void;
}) {
  const projects = useCaptureStore((s) => s.projects);
  return (
    <ProjectPicker
      projects={projects.filter((p) => p.slug !== GENERAL_PROJECT_SLUG)}
      suggestedSlug={suggestedSlug}
      onPick={onPick}
    />
  );
}
