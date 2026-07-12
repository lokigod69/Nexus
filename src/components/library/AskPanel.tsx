'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CircleAlert } from 'lucide-react';
import type { AskReference } from '@/types';
import { useLibraryStore } from '@/stores/libraryStore';
import { spring, fade } from '@/components/motion';

/**
 * Ask Nexus — the deliberate act, distinct from instant search. One
 * question in, one answer out; a new question replaces the old answer.
 * Failures render inline and honest, never as a toast.
 */
export function AskPanel() {
  const reduced = useReducedMotion();
  const question = useLibraryStore((s) => s.question);
  const setQuestion = useLibraryStore((s) => s.setQuestion);
  const answer = useLibraryStore((s) => s.answer);
  const references = useLibraryStore((s) => s.references);
  const asking = useLibraryStore((s) => s.asking);
  const askError = useLibraryStore((s) => s.askError);
  const ask = useLibraryStore((s) => s.ask);
  const focusReference = useLibraryStore((s) => s.focusReference);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask Nexus
        </label>
        <div className="flex gap-2">
          <input
            id="ask-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about anything you have captured"
            autoComplete="off"
            className="h-12 w-full min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-[15px] text-ink transition-colors duration-150 placeholder:text-ink-muted focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={!question.trim() || asking}
            className="flex h-12 shrink-0 items-center rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-40"
          >
            Ask Nexus
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {asking ? (
          // Quiet thinking state — the house shimmer, no spinner-circus.
          <div className="max-w-[62ch]">
            <span className="sr-only">Thinking</span>
            <div aria-hidden className="flex flex-col gap-2.5">
              <div className="shimmer h-3.5 w-full" />
              <div className="shimmer h-3.5 w-11/12" />
              <div className="shimmer h-3.5 w-3/5" />
            </div>
          </div>
        ) : askError ? (
          <p className="flex max-w-[62ch] items-start gap-2 text-sm leading-relaxed text-danger">
            <CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
            <span>{askError}. Your captures are safe; try asking again.</span>
          </p>
        ) : answer ? (
          <motion.div
            key={answer}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? fade : spring}
          >
            <div className="max-w-[62ch] whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">
              {answer}
            </div>

            {references.length > 0 && (
              <div className="mt-8">
                <h3 className="font-mono text-xs text-ink-muted">
                  grounded in {references.length}{' '}
                  {references.length === 1 ? 'capture' : 'captures'}
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {references.map((ref, i) => (
                    <ReferenceCard
                      key={ref.id}
                      reference={ref}
                      index={i}
                      onOpen={() => focusReference(ref.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ) : (
          <p className="max-w-[62ch] text-pretty text-sm leading-relaxed text-ink-secondary">
            Ask a question and Nexus answers from your capture history only,
            not from project memory files. Search is instant; asking takes a
            moment.
          </p>
        )}
      </div>
    </div>
  );
}

function ReferenceCard({
  reference,
  index = 0,
  onOpen,
}: {
  reference: AskReference;
  /** Position in the grid — the citations trail the answer in a cascade. */
  index?: number;
  onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  let host: string | null = null;
  if (reference.url) {
    try {
      host = new URL(reference.url).hostname.replace(/^www\./, '');
    } catch {
      host = null;
    }
  }

  return (
    <motion.li
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: reduced
          ? fade
          : { ...spring, delay: Math.min(index * 0.04, 0.2) },
      }}
      className="list-none"
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2.5 text-left hover:border-line-strong hover:bg-elevated"
      >
        <span className="block truncate text-[13px] font-medium text-ink">
          {reference.title ?? 'Untitled capture'}
        </span>
        <span className="mt-1 block truncate font-mono text-[11px] text-ink-muted">
          {reference.status}
          {reference.projects.length > 0 && ` → ${reference.projects.join(', ')}`}
          {host && ` · ${host}`}
        </span>
      </button>
    </motion.li>
  );
}
