// Enrichment-model preference: which registry model to force on the NEXT
// enrich call, for A/B comparison. 'auto' (the default) means the server's
// normal fallback chain — this module only ever stores an override.
// SSR-inert, same pattern as sound.ts's mute gate.

const MODEL_KEY = 'nexus-model';
export const AUTO_MODEL = 'auto';

/** Fired on window whenever the preferred model changes. */
export const MODEL_CHANGE_EVENT = 'nexus-model-change';

export function getPreferredModel(): string {
  if (typeof window === 'undefined') return AUTO_MODEL;
  try {
    return window.localStorage.getItem(MODEL_KEY) || AUTO_MODEL;
  } catch {
    return AUTO_MODEL;
  }
}

export function setPreferredModel(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MODEL_KEY, id);
  } catch {
    // preference just won't persist
  }
  window.dispatchEvent(new Event(MODEL_CHANGE_EVENT));
}
