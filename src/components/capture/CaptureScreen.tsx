'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useCaptureStore } from '@/stores/captureStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { spring } from '@/components/motion';
import { CaptureCard } from './CaptureCard';

const URL_RE = /^https?:\/\/\S+$/i;

/**
 * `/` — the capture screen. One giant focused input; a submitted capture
 * appears optimistically below and enrichment fills it in live.
 */
export function CaptureScreen({ initialText = '' }: { initialText?: string }) {
  const [value, setValue] = useState(initialText);
  // AI enrichment on by default; toggle off to save the capture raw.
  const [enrichOn, setEnrichOn] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const captures = useCaptureStore((s) => s.captures);
  const inboxLoaded = useCaptureStore((s) => s.inboxLoaded);
  const capture = useCaptureStore((s) => s.capture);
  const fetchInbox = useCaptureStore((s) => s.fetchInbox);
  const fetchProjects = useCaptureStore((s) => s.fetchProjects);

  const recent = captures.slice(0, 5);

  useEffect(() => {
    void fetchInbox();
    void fetchProjects(); // suggestion chips show registry names
  }, [fetchInbox, fetchProjects]);

  // The input grows with the thought; never scrolls internally until ~40vh.
  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  }, []);

  useEffect(() => {
    autosize();
  }, [value, autosize]);

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // Clear immediately — never lock the input while the request runs.
      setValue('');
      const ok = await capture(trimmed, !enrichOn);
      if (!ok) setValue(trimmed); // give the thought back on failure
    },
    [capture, enrichOn],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submitText(value);
    }
  };

  // Paste-and-go: a URL pasted into the empty input submits itself.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!value.trim() && URL_RE.test(pasted)) {
      e.preventDefault();
      void submitText(pasted);
    }
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto w-full max-w-[640px] px-5 pb-24 pt-10 sm:pt-14">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitText(value);
          }}
        >
          <label
            htmlFor="capture-input"
            className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-secondary"
          >
            New capture
          </label>
          <textarea
            ref={textareaRef}
            id="capture-input"
            autoFocus
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Paste a link or type a thought…"
            className="min-h-[120px] w-full resize-none rounded-xl border border-line bg-surface px-4 py-3.5 text-[17px] leading-relaxed text-ink transition-colors duration-150 placeholder:text-ink-muted focus:border-accent/50"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <AiEnrichToggle on={enrichOn} onToggle={() => setEnrichOn((v) => !v)} />
            <button
              type="submit"
              disabled={!value.trim()}
              data-cuelume-press
              data-cuelume-release
              className="flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-40"
            >
              {enrichOn ? 'Capture signal' : 'Save raw'}
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </form>

        <section className="mt-14" aria-label="Recent captures">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-ink-secondary">
              Recent captures
            </h2>
            <Link
              href="/inbox"
              className="font-mono text-xs text-ink-muted hover:text-ink-secondary"
            >
              open inbox →
            </Link>
          </div>

          {inboxLoaded && recent.length === 0 ? (
            <p className="mt-6 text-pretty text-sm leading-relaxed text-ink-secondary">
              Nothing captured yet. Paste a link above and it lands here.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {recent.map((c, i) => (
                  <CaptureCard key={c.id} capture={c} index={i} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * AI-enrich toggle. On by default → the capture is scraped + summarized +
 * routing-suggested. Off → "save raw": the thought is stored verbatim with
 * no AI, still routable, and can be enriched later from its card.
 */
function AiEnrichToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Enrich with AI"
      onClick={onToggle}
      className="flex h-11 items-center gap-2 rounded-lg px-1 text-[13px] font-medium text-ink-secondary"
    >
      <Sparkles
        size={14}
        aria-hidden
        className={on ? 'text-accent' : 'text-ink-muted'}
      />
      <span className={on ? 'text-ink-secondary' : 'text-ink-muted'}>AI enrich</span>
      <span
        aria-hidden
        className={`relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors ${
          on ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <motion.span
          layout={!reduced}
          transition={reduced ? { duration: 0 } : spring}
          className="absolute top-[3px] h-3 w-3 rounded-full bg-void"
          style={{ left: on ? 15 : 3 }}
        />
      </span>
    </button>
  );
}
