'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
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
 * the synced registry plus the ever-present 'general' target. Multi-select:
 * checkbox rows accumulate targets; the sticky commit button below the list
 * counts them ("Route to TRADERBOT", "Route to 2 projects").
 */
export function ProjectPicker({
  projects,
  suggestedSlug,
  initialSelected = [],
  busy = false,
  onCommit,
  onDismiss,
}: {
  projects: BrainProject[];
  suggestedSlug: string | null;
  /** Preselected slugs — usually the AI suggestion. */
  initialSelected?: string[];
  busy?: boolean;
  onCommit: (slugs: string[]) => void;
  /** Escape-to-close while focus is inside the picker. */
  onDismiss?: () => void;
}) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const targets: PickerTarget[] = [
    ...projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
    })),
    {
      slug: GENERAL_PROJECT_SLUG,
      name: 'General',
      description: 'No single project; goes to the shared raw/ inbox',
    },
  ];

  const toggle = (slug: string) => {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  };

  const commitLabel =
    selected.length === 0
      ? 'Route capture'
      : selected.length === 1
        ? `Route to ${
            targets.find((t) => t.slug === selected[0])?.name ?? selected[0]
          }`
        : `Route to ${selected.length} projects`;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={reduced ? fade : spring}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onDismiss) {
          e.stopPropagation();
          onDismiss();
        }
      }}
      className="overflow-hidden"
    >
      <div className="mt-3 border-t border-line pt-2">
        <div
          role="group"
          aria-label="Route to projects"
          className="max-h-72 overflow-y-auto overscroll-contain"
        >
          {targets.map((t) => {
            const checked = selected.includes(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(t.slug)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-elevated"
              >
                <span
                  aria-hidden
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border ${
                    checked
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line-strong bg-transparent'
                  }`}
                >
                  {checked && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="flex min-w-0 items-baseline gap-3">
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
                </span>
              </button>
            );
          })}
        </div>

        {/* Commit sits below the scrolling list, always in reach. */}
        <div className="sticky bottom-0 mt-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => onCommit(selected)}
            disabled={busy || selected.length === 0}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-40"
          >
            {commitLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
