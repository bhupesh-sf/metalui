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

/* ─────────────────────────────────────────────────────────
 * WHAT FOLLOWS A PANEL (Collapsible): a panel opens and closes in place without animating height
 *
 *   open    the panel takes its place at once; everything after it (in its root, then after each
 *           ancestor up to the body) travels down from where it was on the settle spring
 *   close   while the panel slides back, what follows travels up to where it will be once the panel
 *           is gone (measured by hiding the panel for one layout) on the release spring, and holds
 *           there; when the panel goes the travel is dropped, and the layout stands where it held
 *   again   an open or a close in flight is taken over from where things are seen
 * Reduce Motion: what follows jumps. Only transform animates.
 * ───────────────────────────────────────────────────────── */

type Seen = Map<HTMLElement, DOMRect>;

function followersOf(root: HTMLElement, panel: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  const add = (n: Element | null) => {
    for (; n; n = n.nextElementSibling) if (n instanceof HTMLElement && n !== panel) out.push(n);
  };
  add(root.firstElementChild);
  for (let n: HTMLElement | null = root; n && n !== document.body; n = n.parentElement) add(n.nextElementSibling);
  return out;
}

const rects = (els: Iterable<HTMLElement>): Seen => new Map([...els].map((n) => [n, n.getBoundingClientRect()]));
const offscreen = (a: DOMRect, b: DOMRect) => Math.min(a.top, b.top) > window.innerHeight || Math.max(a.bottom, b.bottom) < 0;

/**
 * Makes the content after `panel` travel when `open` changes, instead of jumping. Call the returned
 * `before` just before `open` changes (in the change handler, or while rendering a new `open` prop),
 * so the travel starts from where things were seen.
 */
export function useTravelAfter(root: React.RefObject<HTMLElement | null>, panel: React.RefObject<HTMLElement | null>, open: boolean) {
  const seen = React.useRef<Seen | null>(null);
  const running = React.useRef(new Map<HTMLElement, Animation>());
  const closing = React.useRef(false);
  const was = React.useRef(open);

  const before = React.useCallback(() => {
    const el = root.current;
    if (el && typeof window !== 'undefined') seen.current = rects(followersOf(el, panel.current));
  }, [root, panel]);

  useIsoLayoutEffect(() => {
    if (was.current === open) return;
    was.current = open;
    const el = root.current;
    if (!el) return;
    const followers = followersOf(el, panel.current);
    // Where each follower was seen: the snapshot, or (without one) where a travel in flight has it.
    const at: Seen = seen.current ?? new Map();
    if (!seen.current) running.current.forEach((_, n) => at.set(n, n.getBoundingClientRect()));
    seen.current = null;
    running.current.forEach((a) => a.cancel());
    running.current.clear();
    closing.current = false;
    const spring = springOf(el, open ? 'settle' : 'release');
    if (!spring.ms) return;
    const now = rects(followers);
    // Where each follower will be once a closing panel is gone: hide it for one layout.
    let end: Seen | null = null;
    const p = panel.current;
    if (!open && p) {
      const display = p.style.display;
      p.style.display = 'none';
      end = rects(followers);
      p.style.display = display;
    }
    for (const n of followers) {
      const here = now.get(n)!, from = at.get(n) ?? here, to = end?.get(n) ?? here;
      const dx = from.left - here.left, dy = from.top - here.top;
      const tx = to.left - here.left, ty = to.top - here.top;
      if ((Math.abs(dx - tx) < 0.5 && Math.abs(dy - ty) < 0.5) || offscreen(from, to)) continue;
      running.current.set(n, n.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${tx}px, ${ty}px)` }],
        { duration: spring.ms, easing: spring.easing, composite: 'add', fill: open ? 'none' : 'forwards' },
      ));
    }
    closing.current = !open && running.current.size > 0;
  }, [open, root, panel]);

  // The closing panel is gone (removed, or hidden when kept mounted): the layout now stands where the
  // travel held things. A mutation is heard before the next frame, so the hand-over is never painted.
  React.useEffect(() => {
    const el = root.current;
    if (!el || typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(() => {
      const p = panel.current;
      if (!closing.current || (p?.isConnected && !p.hidden)) return;
      running.current.forEach((a) => a.cancel());
      running.current.clear();
      closing.current = false;
    });
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    return () => mo.disconnect();
  }, [root, panel]);

  return before;
}
