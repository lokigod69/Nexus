'use client';

import { useEffect } from 'react';
import { bind, setEnabled } from 'cuelume';
import { isMuted } from './sound';

/**
 * Wires cuelume exactly once, client-side only. bind() delegates the
 * data-cuelume-press / data-cuelume-release attributes (capture button);
 * setEnabled applies the persisted mute preference before anything plays.
 */
export function SoundProvider() {
  useEffect(() => {
    setEnabled(!isMuted());
    bind();
  }, []);

  return null;
}
