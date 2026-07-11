'use client';

import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { applyMute, isMuted, MUTE_CHANGE_EVENT } from '@/components/sound/sound';

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

  const toggle = () => applyMute(!muted);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={muted}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="grid h-11 w-11 place-items-center rounded-lg text-ink-muted hover:bg-elevated hover:text-ink-secondary"
    >
      {muted ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
    </button>
  );
}
