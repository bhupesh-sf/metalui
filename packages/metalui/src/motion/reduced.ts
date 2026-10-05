'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * REDUCED MOTION, the one check for script-driven motion
 *
 * Motion is reduced by the system setting or by the library's switch,
 * data-mu-motion="reduce", on the element or any ancestor (a page, a block).
 * CSS reads both through the reduced-motion variant and the travel tokens;
 * anything that animates from script asks here instead of matchMedia alone.
 * ───────────────────────────────────────────────────────── */

const QUERY = '(prefers-reduced-motion: reduce)';

/** Whether motion is reduced for `el` (the system setting, or data-mu-motion="reduce" on it or an ancestor). Without `el`, the document's. */
export function motionReduced(el?: Element | null): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches || !!(el ?? document.documentElement).closest('[data-mu-motion="reduce"]');
}

// One media listener and one attribute observer for every subscriber: icons mount by the dozen.
const listeners = new Set<() => void>();
let stopWatching: (() => void) | null = null;

/** Calls `run` whenever reduced motion may have changed: the system setting, or any data-mu-motion switch. Returns the unsubscribe. */
export function onMotionChange(run: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  listeners.add(run);
  if (!stopWatching) {
    const fire = () => listeners.forEach((l) => l());
    const media = window.matchMedia(QUERY);
    const watch = new MutationObserver(fire);
    media.addEventListener('change', fire);
    watch.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-mu-motion'] });
    stopWatching = () => { media.removeEventListener('change', fire); watch.disconnect(); };
  }
  return () => {
    listeners.delete(run);
    if (!listeners.size) { stopWatching?.(); stopWatching = null; }
  };
}

/** `motionReduced` as state that follows changes. Pass a ref when a switch on an ancestor should count. */
export function useReducedMotion(ref?: React.RefObject<Element | null>): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const read = () => setReduced(motionReduced(ref?.current));
    read();
    return onMotionChange(read);
  }, [ref]);
  return reduced;
}
