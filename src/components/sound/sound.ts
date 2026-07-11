// Sound gate for cuelume. The app owns the mute preference (localStorage);
// cuelume only applies it via setEnabled(). SSR-inert: every call is
// window-guarded, and cuelume's play() is itself a no-op without Web Audio.
import { play, setEnabled, type SoundName } from 'cuelume';

const MUTE_KEY = 'nexus-muted';

/** Fired on window whenever the mute preference changes. */
export const MUTE_CHANGE_EVENT = 'nexus-mute-change';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the preference and gate ALL cuelume playback (incl. data attributes). */
export function applyMute(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // preference just won't persist
  }
  setEnabled(!muted);
  window.dispatchEvent(new Event(MUTE_CHANGE_EVENT));
}

/** Imperative cue — only 'success' (enrichment done) and 'tick' (route confirm). */
export function playCue(name: SoundName): void {
  if (typeof window === 'undefined' || isMuted()) return;
  play(name);
}
