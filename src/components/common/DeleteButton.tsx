'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { fade, spring } from '@/components/motion';

const DISARM_MS = 3000;

/**
 * The quiet trash affordance, everywhere a capture appears. Never a primary
 * button: an icon-only ghost that morphs inline into its own confirm step
 * ("Delete forever?") for ~3s instead of raising a modal. Delivered captures
 * get honest copy — the raw/ file already written stays on disk.
 * No sound here, ever (cuelume is reserved for its existing moments).
 */
export function DeleteButton({
  delivered = false,
  busy = false,
  onConfirm,
  className = '',
}: {
  /** True when the capture was already pulled into a project's memory/raw/. */
  delivered?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );

  const handleClick = () => {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      disarmTimer.current = setTimeout(() => setArmed(false), DISARM_MS);
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={armed ? undefined : 'Delete capture'}
      // px-3 in both states: the icon stays put while the label morphs in.
      className={`flex min-h-11 min-w-11 items-center justify-center px-3 py-1.5 text-[13px] font-medium rounded-lg disabled:opacity-40 ${
        armed
          ? 'text-danger hover:bg-danger/10'
          : 'text-ink-muted hover:bg-elevated hover:text-ink-secondary'
      } ${className}`}
    >
      <Trash2 size={15} aria-hidden className="shrink-0" />
      <AnimatePresence initial={false}>
        {armed && (
          <motion.span
            key="confirm"
            // The confirm step morphs out of the icon — width springs open
            // and closes again on disarm, interruptible mid-flight. The
            // delivered sentence wraps, so it fades instead of measuring.
            initial={
              reduced || delivered ? { opacity: 0 } : { opacity: 0, width: 0 }
            }
            animate={
              reduced || delivered
                ? { opacity: 1 }
                : { opacity: 1, width: 'auto' }
            }
            exit={
              reduced || delivered
                ? { opacity: 0, transition: fade }
                : { opacity: 0, width: 0, transition: spring }
            }
            transition={reduced ? fade : spring}
            className={
              // The delivered copy is a sentence; let it wrap to two calm lines.
              delivered
                ? 'max-w-[24ch] pl-1.5 text-left leading-tight'
                : 'overflow-hidden whitespace-nowrap'
            }
          >
            <span className={delivered ? undefined : 'pl-1.5'}>
              {delivered
                ? 'Delete from Nexus? Delivered files stay in place'
                : 'Delete forever?'}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
