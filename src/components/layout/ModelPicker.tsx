'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { api } from '@/stores/api';
import type { ModelOption } from '@/types';
import {
  AUTO_MODEL,
  getPreferredModel,
  MODEL_CHANGE_EVENT,
  setPreferredModel,
} from '@/stores/modelPreference';
import { fade, spring } from '@/components/motion';

function subscribe(callback: () => void) {
  window.addEventListener(MODEL_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(MODEL_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Which model enriches the NEXT capture. Defaults to "Auto" (the server's
 * fallback chain) — this is for comparing candidates, not daily use.
 */
export function ModelPicker() {
  const preferred = useSyncExternalStore(subscribe, getPreferredModel, () => AUTO_MODEL);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[] | null>(null);

  useEffect(() => {
    if (open && !models) {
      api.listModels().then((r) => setModels(r.models)).catch(() => setModels([]));
    }
  }, [open, models]);

  const activeName =
    preferred === AUTO_MODEL ? 'Auto' : models?.find((m) => m.id === preferred)?.name || 'Auto';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Enrichment model"
        className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-muted hover:bg-elevated hover:text-ink-secondary"
      >
        <Sparkles size={15} aria-hidden />
        <span className="hidden font-mono sm:inline">{activeName}</span>
        <ChevronDown size={13} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close model picker"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              role="listbox"
              aria-label="Enrichment model"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
              transition={reduced ? fade : { ...spring, duration: 0.2 }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 top-full z-50 mt-1 w-[min(14rem,calc(100vw-1.5rem))] overflow-hidden overscroll-contain rounded-xl border border-line bg-elevated p-1 shadow-lg"
            >
              <ModelOption
                label="Auto"
                sub="Default fallback chain"
                active={preferred === AUTO_MODEL}
                onClick={() => {
                  setPreferredModel(AUTO_MODEL);
                  setOpen(false);
                }}
              />
              {models === null ? (
                <div className="px-3 py-2 text-xs text-ink-muted">Loading…</div>
              ) : (
                models.map((m) => (
                  <ModelOption
                    key={m.id}
                    label={m.name}
                    sub={m.free ? 'Free tier' : undefined}
                    active={preferred === m.id}
                    onClick={() => {
                      setPreferredModel(m.id);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelOption({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${
        active ? 'bg-accent/15 text-accent-strong' : 'text-ink-secondary hover:bg-surface hover:text-ink'
      }`}
    >
      <span>{label}</span>
      {sub && <span className="font-mono text-[11px] text-ink-muted">{sub}</span>}
    </button>
  );
}
