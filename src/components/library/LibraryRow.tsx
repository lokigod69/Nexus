'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { format } from 'date-fns';
import type { Capture } from '@/types';
import { spring, fade } from '@/components/motion';
import { TagPill } from '@/components/common/cardBits';
import { DeleteButton } from '@/components/common/DeleteButton';

/**
 * One library row — denser than an inbox card. Title, then a mono data
 * line (source, date, status, routed-to projects), then tags. Archived
 * rows can be restored to the inbox; every row can be quietly deleted.
 */
export function LibraryRow({
  capture,
  index = 0,
  highlighted,
  onDelete,
  onRestore,
}: {
  capture: Capture;
  /** Position in the result list — drives a very tight entrance stagger. */
  index?: number;
  /** Flash target after tapping an Ask reference. */
  highlighted: boolean;
  onDelete: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
}) {
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState(false);

  const source = capture.source ?? (capture.kind === 'url' ? 'link' : 'thought');
  const date = format(new Date(capture.createdAt * 1000), 'yyyy-MM-dd');

  const handleDelete = async () => {
    setBusy(true);
    const ok = await onDelete();
    if (!ok) setBusy(false); // success removes the row; failure re-arms it
  };

  const handleRestore = async () => {
    setBusy(true);
    const ok = await onRestore();
    if (!ok) setBusy(false);
  };

  return (
    <motion.li
      id={`capture-${capture.id}`}
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      // Search results land often — the cascade stays almost subliminal
      // (20ms/row, capped at 120ms) so typing never feels waited-on.
      animate={{
        opacity: 1,
        y: 0,
        transition: reduced
          ? fade
          : { ...spring, delay: Math.min(index * 0.02, 0.12) },
      }}
      exit={
        reduced
          ? { opacity: 0, transition: fade }
          : { opacity: 0, scale: 0.97, transition: spring }
      }
      transition={reduced ? fade : spring}
      className={`flex list-none items-start gap-3 px-4 py-3 transition-colors duration-500 ${
        highlighted ? 'bg-accent/10' : 'bg-transparent'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          title={capture.title ?? capture.content}
          className="truncate text-[15px] font-medium leading-snug text-ink"
        >
          {capture.title ?? capture.content}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-ink-muted">
          {source} · {date} ·{' '}
          <span className="text-ink-secondary">{capture.status}</span>
          {capture.projects.length > 0 && (
            <span> → {capture.projects.join(', ')}</span>
          )}
        </p>
        {capture.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {capture.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {capture.status === 'archived' && (
          <button
            type="button"
            onClick={() => void handleRestore()}
            disabled={busy}
            className="flex h-11 items-center rounded-lg px-3 text-[13px] font-medium text-ink-secondary hover:bg-elevated hover:text-ink disabled:opacity-40"
          >
            Restore to inbox
          </button>
        )}
        <DeleteButton
          busy={busy}
          delivered={capture.status === 'delivered'}
          onConfirm={() => void handleDelete()}
        />
      </div>
    </motion.li>
  );
}
