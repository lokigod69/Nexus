import type { Transition } from 'motion/react';

/** House spring: critically damped, no overshoot (damping 1.0 / response ~0.35). */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.35 };

/**
 * Commit-exit spring: slight bounce, ONLY for card exits after a commit
 * action (route/archive) — the one place momentum exists.
 */
export const exitSpring: Transition = { type: 'spring', bounce: 0.2, duration: 0.45 };

/** Reduced-motion fallback: a plain cross-fade. */
export const fade: Transition = { duration: 0.2, ease: 'easeOut' };
