'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from './layout-effect';
import { motionReduced } from './reduced';

/* ─────────────────────────────────────────────────────────
 * ROWS IN A LIST (Transitions T9): people, files, tasks
 *
 *   land    a new row comes from one nest above on the object spring, fading in
 *   leave   a row goes one nest down, fading, on the release spring; then the host removes it
 *   close   the rows after it travel up into the gap on the settle spring (FLIP), and rows that
 *           moved for any reason travel from where they were
 * Reduce Motion: all of it at once. Leaving is travel even though the release travel token stays
 * whole for presses, so a row under Reduce Motion goes without a fade.
 * Rows are the list's direct children marked data-row="<key>".
 * ───────────────────────────────────────────────────────── */

/** A spring's duration in ms (0 when motion is reduced here) and its curve, read from the element's tokens. */
export function springOf(el: Element, name: 'settle' | 'object' | 'release') {
  const s = getComputedStyle(el);
  const ms = motionReduced(el) ? 0 : parseFloat(s.getPropertyValue(`--mu-spring-${name}-d`)) * 1000;
  return { ms: ms || 0, easing: s.getPropertyValue(`--mu-spring-${name}`).trim() || 'ease-out' };
}

const nestOf = (el: Element) => parseFloat(getComputedStyle(el).getPropertyValue('--mu-motion-nest')) || 6;

/** Rows leave one nest down, fading, on the release spring; then `done` (remove them there). At once under Reduce Motion. */
export function leaveRows(rows: (HTMLElement | null)[], done: () => void) {
  const live = rows.filter((r): r is HTMLElement => !!r);
  const { ms, easing } = live[0] ? springOf(live[0], 'release') : { ms: 0, easing: '' };
  if (!ms) return done();
  const nest = nestOf(live[0]);
  Promise.all(live.map((row) => {
    row.style.pointerEvents = 'none';
    return row.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${nest}px)` }], { duration: ms, easing, fill: 'forwards' }).finished;
  })).then(done, done);
}

/**
 * Moves the rows of a list when `order` (their keys, joined) changes: rows that moved travel from where
 * they were, so the list closes up after a leave; new rows land when `land` says so (true for every new
 * row, or a set of keys, taken out as they land). The first render only records.
 */
export function useRowMotion(list: React.RefObject<HTMLElement | null>, order: string, land: boolean | Set<string> = false) {
  const tops = React.useRef<Map<string, number> | null>(null);
  useIsoLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const glide = springOf(el, 'settle');
    const drop = springOf(el, 'object');
    const nest = nestOf(el);
    const next = new Map<string, number>();
    el.querySelectorAll<HTMLElement>(':scope > [data-row]').forEach((row) => {
      const key = row.dataset.row!;
      next.set(key, row.offsetTop);
      if (!tops.current) return;
      const was = tops.current.get(key);
      if (was == null) {
        const lands = land === true || (land instanceof Set && land.delete(key));
        if (lands && drop.ms) row.animate([{ opacity: 0, transform: `translateY(${-nest}px)` }, { opacity: 1, transform: 'none' }], { duration: drop.ms, easing: drop.easing });
      } else if (was !== row.offsetTop && glide.ms) {
        row.animate([{ transform: `translateY(${was - row.offsetTop}px)` }, { transform: 'none' }], { duration: glide.ms, easing: glide.easing, composite: 'add' });
      }
    });
    tops.current = next;
  }, [list, order, land]);
}
