import type { Transition, Variants } from 'motion/react';

/** House spring: critically damped, no overshoot (damping 1.0 / response ~0.35). */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.35 };

/**
 * Commit-exit spring: slight bounce, ONLY for card exits after a commit
 * action (route/archive) — the one place momentum exists.
 */
export const exitSpring: Transition = { type: 'spring', bounce: 0.2, duration: 0.45 };

/** Reduced-motion fallback: a plain cross-fade. */
export const fade: Transition = { duration: 0.2, ease: 'easeOut' };

/**
 * Quick fade for outgoing placeholder content (skeleton → enriched fields):
 * the exit gets out of the way fast so the incoming state carries the motion.
 */
export const quickFade: Transition = { duration: 0.12, ease: 'easeOut' };

/**
 * One enrichment field arriving. Used inside a parent that staggers its
 * children ~45ms apart, so the card reads as receiving information
 * (title, then summary, then tags) rather than re-rendering as a block.
 */
export const receive: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: spring },
};
