'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * WAIT, the one clock for showing that something is working (the spinner recipe's timing)
 *
 *   working    quiet: the item is held (busy) but shows nothing yet, so fast work never flashes
 *   + delay    shown: the sign of waiting appears (a ring, a lit edge, a breathing lamp)
 *   + still    `still` turns true: the words can say more ("Still exporting…")
 *   ends       once shown, the sign stays at least `minimum` (no flash), then the result:
 *                done    the result (a check) for `result`, then idle on its own
 *                failed  held until the host moves on (it shows Try again)
 *                idle    cancelled: back to rest
 *   fast       work that ends inside the delay goes straight to its result: nothing, then the check
 * Every duration is a token (--mu-r-spinner-self-*), read from the host's element when given, so a
 * wrapper that tunes the tokens (a docs panel, a dense table) tunes every wait inside it.
 * ───────────────────────────────────────────────────────── */

/** What the work is doing, as the host knows it. */
export type WaitWork = 'idle' | 'working' | 'done' | 'failed';
/** What to show: `quiet` holds the item without a sign, `shown` shows the sign, `done` the result. */
export type WaitPhase = 'idle' | 'quiet' | 'shown' | 'done' | 'failed';

export interface Wait {
  phase: WaitPhase;
  /** Hold the item: aria-busy, refuse a second action (quiet or shown). */
  busy: boolean;
  /** The sign (or its result) occupies the slot: shown or done. */
  showing: boolean;
  /** The work has run past the `still` token: say more. */
  still: boolean;
}

interface Timing { delay: number; minimum: number; result: number; still: number }

const ms = (value: string) => (/ms$/.test(value) ? parseFloat(value) : parseFloat(value) * 1000) || 0;

/** The wait tokens as they apply to `el` (or the document). */
export function waitTiming(el?: Element | null): Timing {
  if (typeof window === 'undefined') return { delay: 0, minimum: 0, result: 0, still: 0 };
  const s = getComputedStyle(el ?? document.documentElement);
  const v = (name: string) => ms(s.getPropertyValue(`--mu-r-spinner-self-${name}`).trim());
  return { delay: v('delay'), minimum: v('minimum'), result: v('result'), still: v('still') };
}

const settled = (work: WaitWork): WaitPhase => (work === 'failed' ? 'failed' : 'idle');

/**
 * Turns the host's work into what to show, with the spinner's timing: a show delay, a minimum time on
 * screen, the result, and `still` after a long wait. Pass a ref to read the tokens from the host's place.
 */
export function useWait(work: WaitWork, ref?: React.RefObject<Element | null>): Wait {
  const [seen, setSeen] = React.useState(work);
  const [phase, setPhase] = React.useState<WaitPhase>(work === 'working' ? 'quiet' : settled(work));
  const [still, setStill] = React.useState(false);
  const shownAt = React.useRef(0);

  // A change of work moves the phase in the same render (so busy is never a frame late); timers follow.
  if (seen !== work) {
    setSeen(work);
    if (work === 'working') {
      setStill(false);
      if (phase !== 'shown') setPhase('quiet'); // back to work during the minimum hold: the sign stays
    } else if (seen === 'working') {
      if (phase !== 'shown') setPhase(work === 'done' ? 'done' : settled(work)); // fast: straight to the result
    } else if (phase !== 'shown') setPhase(settled(work));
  }

  React.useEffect(() => {
    const t = waitTiming(ref?.current);
    let timer = 0;
    if (phase === 'quiet') {
      timer = window.setTimeout(() => { shownAt.current = performance.now(); setPhase('shown'); }, t.delay);
    } else if (phase === 'shown' && work !== 'working') {
      const left = t.minimum - (performance.now() - shownAt.current);
      timer = window.setTimeout(() => setPhase(work === 'done' ? 'done' : settled(work)), Math.max(0, left));
    } else if (phase === 'done') {
      timer = window.setTimeout(() => setPhase('idle'), t.result);
    }
    return () => window.clearTimeout(timer);
  }, [phase, work, ref]);

  React.useEffect(() => {
    if (work !== 'working') return;
    const timer = window.setTimeout(() => setStill(true), waitTiming(ref?.current).still);
    return () => window.clearTimeout(timer);
  }, [work, ref]);

  const busy = phase === 'quiet' || (phase === 'shown');
  return { phase, busy, showing: phase === 'shown' || phase === 'done', still: still && busy };
}
