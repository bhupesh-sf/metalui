'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from '../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * INHERITED COLORWAY, for popups portalled out of their place
 *
 * A colorway is data-mu-colorway on any ancestor. A popup portalled to <body>
 * leaves that ancestor behind and would open in the page's colorway; placed
 * inside the Portal, InheritColorway gives the portal the colorway its trigger
 * sits in, when it opens.
 * ───────────────────────────────────────────────────────── */

/** The colorway set on `el` or its nearest ancestor (data-mu-colorway), if any. */
export function colorwayOf(el: Element | null | undefined): string | undefined {
  return el?.closest('[data-mu-colorway]')?.getAttribute('data-mu-colorway') ?? undefined;
}

export interface ColorwayAnchor {
  /** Pass to the trigger (any element). */
  ref: (el: Element | null) => void;
  current: Element | null;
}

/** Where a popup's trigger sits: give `anchor.ref` to the trigger and `anchor` to InheritColorway. */
export function useColorwayAnchor(): ColorwayAnchor {
  const [anchor] = React.useState<ColorwayAnchor>(() => {
    const a: ColorwayAnchor = { current: null, ref: (el) => { a.current = el; } };
    return a;
  });
  return anchor;
}

// One observer for every mounted portal; some (Select's) stay mounted between openings.
const listeners = new Set<() => void>();
let stopWatching: (() => void) | null = null;
function onColorwayChange(run: () => void) {
  listeners.add(run);
  if (!stopWatching) {
    const watch = new MutationObserver(() => listeners.forEach((l) => l()));
    watch.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-mu-colorway'] });
    stopWatching = () => watch.disconnect();
  }
  return () => {
    listeners.delete(run);
    if (!listeners.size) { stopWatching?.(); stopWatching = null; }
  };
}

/** Put first inside a Portal: the portal takes the colorway that the anchor (the trigger) sits in, and follows it. */
export function InheritColorway({ anchor }: { anchor: ColorwayAnchor }) {
  const self = React.useRef<HTMLSpanElement>(null);
  useIsoLayoutEffect(() => {
    const apply = () => {
      const portal = self.current?.parentElement;
      if (!portal) return;
      const colorway = colorwayOf(anchor.current);
      // Only on a change: the observer sees this attribute too.
      if (portal.getAttribute('data-mu-colorway') === (colorway ?? null)) return;
      if (colorway) portal.setAttribute('data-mu-colorway', colorway);
      else portal.removeAttribute('data-mu-colorway');
    };
    apply();
    return onColorwayChange(apply);
  }, [anchor]);
  return <span hidden ref={self} />;
}
