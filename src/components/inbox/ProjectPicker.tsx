'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { BrainProject } from '@/types';
import { GENERAL_PROJECT_SLUG } from '@/types';
import { spring, fade } from '@/components/motion';

interface PickerTarget {
  slug: string;
  name: string;
  description: string;
}

/**
 * Inline disclosure (anchored to its trigger, not a floating modal) listing
 * the synced registry plus the ever-present 'general' target.
 */
export function ProjectPicker({
  projects,
  suggestedSlug,
  onPick,
}: {
  projects: BrainProject[];
  suggestedSlug: string | null;
  onPick: (slug: string) => void;
}) {
  const reduced = useReducedMotion();

  const targets: PickerTarget[] = [
    ...projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
    })),
    {
      slug: GENERAL_PROJECT_SLUG,
      name: 'General',
      description: 'No single project — goes to the shared raw/ inbox',
    },
  ];

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={reduced ? fade : spring}
      className="overflow-hidden"
    >
      <div className="mt-3 border-t border-line pt-2" role="listbox" aria-label="Route to project">
        {targets.map((t) => (
          <button
            key={t.slug}
            type="button"
            role="option"
            aria-selected={t.slug === suggestedSlug}
            onClick={() => onPick(t.slug)}
            className="flex min-h-11 w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left hover:bg-elevated"
          >
            <span
              className={`shrink-0 text-[14px] font-medium ${
                t.slug === suggestedSlug ? 'text-accent-strong' : 'text-ink'
              }`}
            >
              {t.name}
            </span>
            {t.description && (
              <span className="min-w-0 truncate text-xs text-ink-muted">
                {t.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
