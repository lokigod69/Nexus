'use client';

import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { applyMute, isMuted, MUTE_CHANGE_EVENT } from '@/components/sound/sound';
import { fade, spring } from '@/components/motion';

function subscribe(callback: () => void) {
  window.addEventListener(MUTE_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(MUTE_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** One-tap sound gate, persisted in localStorage, applied via cuelume setEnabled. */
export function MuteToggle() {
  // Server snapshot: unmuted (matches the default preference).
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  const reduced = useReducedMotion();

  const toggle = () => applyMute(!muted);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={muted}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="relative grid h-11 w-11 place-items-center rounded-lg text-ink-muted hover:bg-elevated hover:text-ink-secondary"
    >
      {/* The state change is acknowledged: icons crossfade with a soft
          scale instead of hard-swapping. */}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={muted ? 'muted' : 'sound-on'}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          transition={reduced ? fade : { ...spring, duration: 0.25 }}
          className="grid place-items-center"
        >
          {muted ? (
            <VolumeX size={17} aria-hidden />
          ) : (
            <Volume2 size={17} aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
