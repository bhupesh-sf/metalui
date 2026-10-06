'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { springOf, useRowMotion } from '../../motion/rows';
import { refuse } from '../../motion/refuse';
import { haptic } from '../../motion/haptic';

/* ─────────────────────────────────────────────────────────
 * SORTABLE, the drag that reorders a list, a row or a grid (an instrument)
 *
 *   lift      press and move (a still press on touch; at once on a grip), or Space: the item rises
 *             on the surface spring onto a raised plate with the floating shadow, a hair larger,
 *             and follows the hand from where it was grabbed; the slot it left is a sunk recess
 *   move      the item under the hand is the target: the order changes live (onValueChange), the
 *             others glide from where they were (useRowMotion, FLIP in 2D) and the recess glides
 *             to the new slot on the settle spring; near the scroller's edge it scrolls
 *   drop      the item travels from the hand into its slot and lands on the object spring;
 *             onValueCommit(next, previous): a rejected promise glides it all back to previous
 *   cancel    Escape: home on the settle spring, the others glide back
 *   keys      Space or Enter lifts, arrows move one place (grid: up and down to the nearest),
 *             Home and End to the ends, Space or Enter drops, Escape cancels, Tab drops where it is;
 *             every step is said in a live region
 *   pinned    a disabled item can't be lifted and nothing takes its place; trying shakes it
 *   busy      while a save is out the list says aria-busy and nothing lifts
 * Reduce Motion: no scale, no travel; following the hand stays and the plate still fades.
 * An instrument hosted by any list: the items are the host's; this draws only what shows while
 * something is held. useSortable is the engine (any element whose children carry itemProps);
 * Sortable is the hook with a div list, its recess and its live region.
 * Slots: Sortable.Root, Sortable.Item, Sortable.Handle.
 * ───────────────────────────────────────────────────────── */

export type SortableOrientation = 'vertical' | 'horizontal' | 'grid';

/** What the live region says. `label` is the item's name, `at` its position (from 1), `of` the count. */
export interface SortableWords {
  instructions: string;
  handle: (label: string) => string;
  lifted: (label: string, at: number, of: number) => string;
  moved: (label: string, at: number, of: number) => string;
  dropped: (label: string, at: number, of: number) => string;
  cancelled: (label: string, at: number, of: number) => string;
  failed: (label: string, at: number, of: number) => string;
  pinned: (label: string) => string;
}

const spoken: SortableWords = {
  instructions: 'Press Space to lift. Arrow keys move it, Space drops it, Escape puts it back.',
  handle: (l) => `Move ${l}`,
  lifted: (l, at, of) => `Lifted ${l}. Position ${at} of ${of}.`,
  moved: (l, at, of) => `${l}, position ${at} of ${of}.`,
  dropped: (l, at, of) => `Dropped ${l} at position ${at} of ${of}.`,
  cancelled: (l, at, of) => `Put ${l} back at position ${at} of ${of}.`,
  failed: (l, at, of) => `Couldn’t save the order. ${l} is back at position ${at} of ${of}.`,
  pinned: (l) => `${l} can’t be moved.`,
};

export interface UseSortableOptions {
  /** The items' keys in order. */
  value: readonly string[];
  /** The order while moving (live, so the list always shows where things would land) and on cancel or rollback. */
  onValueChange: (next: string[]) => void;
  /** Once, on a drop that changed the order. Return a promise to hold the list busy; a rejection rolls back to `previous`. */
  onValueCommit?: (next: string[], previous: string[]) => void | Promise<unknown>;
  /** Which keys move it, and which way the list runs. Vertical by default. */
  orientation?: SortableOrientation;
  /** Lift only by a `handleProps` grip (items that hold controls). The whole item by default. */
  handle?: boolean;
  /** Nothing lifts. */
  disabled?: boolean;
  words?: Partial<SortableWords>;
}

interface Box { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }

/** One drag, from lift to landing. */
interface Session {
  key: string;
  el: HTMLElement;
  focus: HTMLElement | null;
  mode: 'pointer' | 'keyboard';
  start: string[];
  pinned: Set<string>;
  slots: Map<string, Box>;
  /** Where the hand holds the item, inside its slot. */
  grab: Point;
  /** The pointer, in client coordinates. */
  pointer: Point;
  /** The held item's offset from its slot (pointer mode). */
  t: Point;
  /** The slot the item glides from on a key move. */
  at: Point;
  /** The item just traded with: no trading back until the hand leaves it (mixed sizes never flicker). */
  skip: string | null;
  scroller: HTMLElement | null;
  edge: number;
  speed: number;
  frame: number;
  returning: Point | null;
}

interface Pending {
  key: string;
  el: HTMLElement;
  focus: HTMLElement | null;
  id: number;
  x: number;
  y: number;
  touch: boolean;
  timer: number;
  pinned: boolean;
}

const interactive = 'input, textarea, select, button, a[href], [contenteditable=""], [contenteditable=true], [data-no-drag]';
const px = (el: Element, name: string, fallback: number) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || fallback;
const inside = (b: Box, p: Point) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const labelOf = (el: HTMLElement) => el.dataset.label || el.textContent?.trim() || '';

/** Moves `key` to `target`'s place among the keys that aren't pinned; pinned keys keep their index. */
export function moveTo(order: readonly string[], key: string, target: string, pinned: ReadonlySet<string> = new Set()) {
  const free = order.filter((k) => !pinned.has(k));
  const from = free.indexOf(key);
  const to = free.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  free.splice(from, 1);
  free.splice(to, 0, key);
  let i = 0;
  return order.map((k) => (pinned.has(k) ? k : free[i++]));
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((k, i) => k === b[i]);

function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if ((/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) || (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth)) return n;
  }
  return null; // the window
}

/**
 * The drag that reorders: pointer, touch, keys, auto-scroll, announcements and rollback over any list
 * whose children carry `itemProps`. Render `slotRef` (the recess) inside the list and `announcerRef`
 * (a live region) and `instructionsId` anywhere; Sortable does all three.
 */
export function useSortable<T extends HTMLElement = HTMLElement>({ value, onValueChange, onValueCommit, orientation = 'vertical', handle = false, disabled = false, words: own }: UseSortableOptions) {
  const listRef = React.useRef<T | null>(null);
  const slotRef = React.useRef<HTMLDivElement | null>(null);
  const announcerRef = React.useRef<HTMLDivElement | null>(null);
  const instructionsId = React.useId();
  const [lifted, setLifted] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const words = React.useMemo(() => ({ ...spoken, ...own }), [own]);

  const latest = React.useRef({ value, onValueChange, onValueCommit, orientation, handle, disabled, busy, words });
  latest.current = { value, onValueChange, onValueCommit, orientation, handle, disabled, busy, words };
  const session = React.useRef<Session | null>(null);
  const pending = React.useRef<Pending | null>(null);
  const unlisten = React.useRef<() => void>(() => {});

  const order = value.join('\n');
  useRowMotion(listRef, order);

  const say = React.useCallback((text: string) => {
    if (announcerRef.current) announcerRef.current.textContent = text;
  }, []);
  const where = (key: string, list: readonly string[] = latest.current.value) => [list.indexOf(key) + 1, list.length] as const;

  /** The items' slots, in their offset parent's content box (transforms don't count). */
  const measure = React.useCallback((list: HTMLElement) => {
    const slots = new Map<string, Box>();
    for (const el of Array.from(list.children) as HTMLElement[]) {
      if (el.dataset.sortableItem == null || el.dataset.row == null) continue;
      slots.set(el.dataset.row, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    }
    return slots;
  }, []);

  /** A client point in the items' offset parent's content box. */
  const local = (s: Session, p: Point): Point => {
    const origin = (s.el.offsetParent as HTMLElement | null) ?? document.body;
    const r = origin.getBoundingClientRect();
    return { x: p.x - r.left - origin.clientLeft + origin.scrollLeft, y: p.y - r.top - origin.clientTop + origin.scrollTop };
  };

  const placeSlot = (s: Session, first = false) => {
    const slot = slotRef.current;
    const box = s.slots.get(s.key);
    if (!slot || !box) return;
    if (first) {
      slot.style.width = `${box.w}px`;
      slot.style.height = `${box.h}px`;
      slot.style.borderRadius = getComputedStyle(s.el).borderRadius;
    }
    slot.style.translate = `${box.x}px ${box.y}px`;
    if (first) {
      void slot.offsetWidth; // the recess starts where the item is, then shows; it never slides in from the corner
      slot.dataset.shown = '';
    }
  };

  /** Keeps the held item under the hand. */
  const follow = (s: Session) => {
    const box = s.slots.get(s.key);
    if (!box) return;
    const p = local(s, s.pointer);
    s.t = { x: p.x - s.grab.x - box.x, y: p.y - s.grab.y - box.y };
    s.el.style.translate = `${s.t.x}px ${s.t.y}px`;
  };

  const reorder = (s: Session, target: string | null) => {
    if (!target) return;
    const { value: now, onValueChange: change } = latest.current;
    const next = moveTo(now, s.key, target, s.pinned);
    if (same(next, now)) return;
    s.skip = target;
    s.at = { x: s.slots.get(s.key)?.x ?? 0, y: s.slots.get(s.key)?.y ?? 0 };
    change(next);
  };

  /** The item under the hand (not the held one, not a pinned one, not the one just traded with). */
  const hit = (s: Session, p: Point) => {
    const skipped = s.skip ? s.slots.get(s.skip) : undefined;
    if (skipped && !inside(skipped, p)) s.skip = null;
    for (const [k, b] of s.slots) {
      if (k === s.key || s.pinned.has(k) || !inside(b, p)) continue;
      return k === s.skip ? null : k;
    }
    if (latest.current.orientation === 'grid') return null;
    // Past either end of a list: the end it is past.
    const free = latest.current.value.filter((k) => !s.pinned.has(k) && s.slots.has(k));
    const first = s.slots.get(free[0]);
    const last = s.slots.get(free[free.length - 1]);
    const axis = latest.current.orientation === 'horizontal' ? 'x' : 'y';
    if (first && p[axis] < first[axis]) return free[0];
    if (last && p[axis] > last[axis] + (axis === 'x' ? last.w : last.h)) return free[free.length - 1];
    return null;
  };

  /** Scrolls toward an edge the hand is near; true while it moved. */
  const scroll = (s: Session) => {
    const view = s.scroller ? s.scroller.getBoundingClientRect() : { top: 0, left: 0, bottom: innerHeight, right: innerWidth };
    const speed = (d: number) => (d < s.edge ? Math.ceil(s.speed * (1 - Math.max(d, 0) / s.edge)) : 0);
    const dy = speed(s.pointer.y - view.top) ? -speed(s.pointer.y - view.top) : speed(view.bottom - s.pointer.y);
    const dx = speed(s.pointer.x - view.left) ? -speed(s.pointer.x - view.left) : speed(view.right - s.pointer.x);
    if (!dx && !dy) return false;
    const box = s.scroller ?? document.scrollingElement ?? document.documentElement;
    const was = [box.scrollLeft, box.scrollTop];
    if (s.scroller) s.scroller.scrollBy(dx, dy);
    else window.scrollBy(dx, dy);
    return box.scrollLeft !== was[0] || box.scrollTop !== was[1];
  };

  const tick = () => {
    const s = session.current;
    if (!s || s.mode !== 'pointer') return;
    s.frame = 0;
    follow(s);
    reorder(s, hit(s, local(s, s.pointer)));
    if (scroll(s)) s.frame = requestAnimationFrame(tick);
  };
  const schedule = (s: Session) => {
    if (!s.frame) s.frame = requestAnimationFrame(tick);
  };

  const finish = (s: Session) => {
    cancelAnimationFrame(s.frame);
    unlisten.current();
    unlisten.current = () => {};
    session.current = null;
    delete s.el.dataset.rowHeld;
    delete slotRef.current?.dataset.shown;
    setLifted(null);
    setDragging(false);
  };

  /** The held item travels from `from` (its offset from its slot) to rest on a spring. */
  const land = (el: HTMLElement, from: Point, spring: 'object' | 'settle') => {
    el.style.translate = '';
    const { ms, easing } = springOf(el, spring);
    if (!ms || (!from.x && !from.y)) return;
    el.dataset.landing = '';
    el.animate([{ translate: `${from.x}px ${from.y}px` }, { translate: '0px 0px' }], { duration: ms, easing })
      .finished.then(() => delete el.dataset.landing, () => delete el.dataset.landing);
  };

  const lift = (key: string, el: HTMLElement, focus: HTMLElement | null, mode: Session['mode'], pointer: Point) => {
    const list = listRef.current;
    if (!list) return;
    const pinned = new Set<string>();
    for (const c of Array.from(list.children) as HTMLElement[]) if (c.dataset.sortableItem != null && c.dataset.disabled != null && c.dataset.row) pinned.add(c.dataset.row);
    const slots = measure(list);
    const box = slots.get(key);
    if (!box) return;
    const s: Session = {
      key, el, focus, mode, pinned, slots, pointer, start: [...latest.current.value],
      grab: { x: 0, y: 0 }, t: { x: 0, y: 0 }, at: { x: box.x, y: box.y }, skip: null,
      scroller: scrollerOf(list), edge: px(list, '--mu-r-sortable-self-edge', 48), speed: px(list, '--mu-r-sortable-self-speed', 18), frame: 0, returning: null,
    };
    if (mode === 'pointer') {
      const p = local(s, pointer);
      s.grab = { x: p.x - box.x, y: p.y - box.y };
    }
    session.current = s;
    el.dataset.rowHeld = '';
    el.getAnimations().forEach((a) => a.finish());
    placeSlot(s, true);
    setLifted(key);
    setDragging(mode === 'pointer');
    const [at, of] = where(key);
    say(latest.current.words.lifted(labelOf(el), at, of));
    if (mode === 'pointer') haptic('alignment');
  };

  const drop = () => {
    const s = session.current;
    if (!s) return;
    const t = s.t;
    finish(s);
    land(s.el, t, 'object');
    if (s.mode === 'pointer') haptic('detent');
    const { value: next, onValueCommit: commit, onValueChange: change, words: w } = latest.current;
    const label = labelOf(s.el);
    const [at, of] = where(s.key, next);
    say(w.dropped(label, at, of));
    if (same(next, s.start) || !commit) return;
    const previous = s.start;
    const saved = commit([...next], previous);
    if (!saved || typeof (saved as Promise<unknown>).then !== 'function') return;
    setBusy(true);
    (saved as Promise<unknown>).then(
      () => setBusy(false),
      () => {
        setBusy(false);
        change(previous);
        const [was, n] = where(s.key, previous);
        say(latest.current.words.failed(label, was, n));
      },
    );
  };

  const goHome = (s: Session) => {
    const list = listRef.current;
    if (list) s.slots = measure(list);
    const box = s.slots.get(s.key);
    const from = s.returning ?? { x: 0, y: 0 };
    finish(s);
    land(s.el, box ? { x: from.x - box.x, y: from.y - box.y } : { x: 0, y: 0 }, 'settle');
    const [at, of] = where(s.key, s.start);
    say(latest.current.words.cancelled(labelOf(s.el), at, of));
  };

  const cancel = () => {
    const s = session.current;
    if (!s || s.returning) return;
    const box = s.slots.get(s.key) ?? { x: 0, y: 0 };
    s.returning = { x: box.x + s.t.x, y: box.y + s.t.y };
    cancelAnimationFrame(s.frame);
    s.frame = 0;
    if (same(latest.current.value, s.start)) goHome(s);
    else latest.current.onValueChange([...s.start]); // the layout effect below takes it home
  };

  // After the order changes under a held item: new slots, the recess follows, the item stays under the
  // hand (pointer) or glides one place (keys); a return in flight lands.
  useIsoLayoutEffect(() => {
    const s = session.current;
    const list = listRef.current;
    if (!s || !list) return;
    if (s.returning) return goHome(s);
    s.slots = measure(list);
    placeSlot(s);
    if (s.mode === 'pointer') return follow(s);
    if (s.focus && document.activeElement !== s.focus) s.focus.focus({ preventScroll: true }); // a moved node loses focus
    const box = s.slots.get(s.key);
    s.el.style.translate = '';
    s.el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (box) land(s.el, { x: s.at.x - box.x, y: s.at.y - box.y }, 'settle');
    const [at, of] = where(s.key);
    say(latest.current.words.moved(labelOf(s.el), at, of));
  }, [order]);

  // Nothing outlives the list.
  React.useEffect(() => () => {
    unlisten.current();
    if (session.current) cancelAnimationFrame(session.current.frame);
    if (pending.current) clearTimeout(pending.current.timer);
  }, []);

  /** The item (and its grip) a DOM event belongs to, when it is this list's own. */
  const itemOf = (target: EventTarget | null) => {
    const list = listRef.current;
    if (!list || !(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>('[data-sortable-item]');
    if (!el || el.parentElement !== list || !el.dataset.row) return null;
    const grip = target.closest<HTMLElement>('[data-sortable-handle]');
    const ownGrip = grip && grip.closest('[data-sortable-item]') === el ? grip : null;
    return { el, key: el.dataset.row, grip: ownGrip };
  };

  const refused = (el: HTMLElement) => {
    refuse(el);
    haptic('refusal');
    say(latest.current.words.pinned(labelOf(el)));
  };

  const onPointerDown = (e: React.PointerEvent<T>) => {
    const { busy: isBusy, disabled: off, handle: byGrip } = latest.current;
    if (isBusy || off || session.current || pending.current || e.button !== 0 || !e.isPrimary) return;
    const found = itemOf(e.target);
    if (!found) return;
    if (byGrip && !found.grip) return;
    if (!byGrip && e.target instanceof Element && e.target !== found.el && e.target.closest(interactive)) return;
    const list = listRef.current!;
    const threshold = px(list, '--mu-r-sortable-self-threshold', 4);
    const hold = px(list, '--mu-r-sortable-self-hold', 250);
    const p: Pending = {
      key: found.key, el: found.el, focus: found.grip ?? found.el, id: e.pointerId, x: e.clientX, y: e.clientY,
      touch: e.pointerType === 'touch' && !byGrip, timer: 0, pinned: found.el.dataset.disabled != null,
    };
    pending.current = p;
    let moved = false;

    const start = (pointer: Point) => {
      pending.current = null;
      if (p.pinned) return refused(p.el);
      p.el.setPointerCapture?.(p.id);
      getSelection()?.removeAllRanges();
      lift(p.key, p.el, p.focus, 'pointer', pointer);
      moved = true;
    };
    if (p.touch) p.timer = window.setTimeout(() => start({ x: p.x, y: p.y }), hold);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== p.id) return;
      const s = session.current;
      if (s) {
        s.pointer = { x: ev.clientX, y: ev.clientY };
        return schedule(s);
      }
      if (pending.current !== p || Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < threshold) return;
      if (p.touch) return end(); // a swipe before the press held still: the page scrolls
      start({ x: ev.clientX, y: ev.clientY });
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== p.id) return;
      if (session.current) drop();
      end();
    };
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== p.id) return;
      if (session.current) cancel();
      end();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !session.current) return;
      ev.preventDefault();
      ev.stopPropagation();
      cancel();
    };
    // Once held, a touch drag must not scroll the page, and a long press must not open a menu.
    const onTouch = (ev: TouchEvent) => { if (session.current) ev.preventDefault(); };
    const onMenu = (ev: Event) => { if (session.current || pending.current === p) ev.preventDefault(); };
    // The click that ends a drag is the drag's, not the item's.
    const onClick = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); };
    const end = () => {
      clearTimeout(p.timer);
      if (pending.current === p) pending.current = null;
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onCancel);
      removeEventListener('keydown', onKey, true);
      removeEventListener('touchmove', onTouch);
      removeEventListener('contextmenu', onMenu, true);
      if (moved) {
        addEventListener('click', onClick, true);
        setTimeout(() => removeEventListener('click', onClick, true));
      }
    };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onCancel);
    addEventListener('keydown', onKey, true);
    addEventListener('touchmove', onTouch, { passive: false });
    addEventListener('contextmenu', onMenu, true);
    unlisten.current = end;
  };

  const step = (s: Session, key: string) => {
    const { value: now, orientation: o } = latest.current;
    const free = now.filter((k) => !s.pinned.has(k));
    const i = free.indexOf(s.key);
    const by = (d: number) => free[Math.min(Math.max(i + d, 0), free.length - 1)];
    const back = o === 'horizontal' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp', 'ArrowLeft'];
    const ahead = o === 'horizontal' ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown', 'ArrowRight'];
    if (key === 'Home') return free[0];
    if (key === 'End') return free[free.length - 1];
    if (o === 'grid' && (key === 'ArrowUp' || key === 'ArrowDown')) {
      // The nearest item above or below, by where the items actually are.
      const a = s.slots.get(s.key);
      if (!a) return null;
      const c = centre(a);
      let best: string | null = null;
      let score = Infinity;
      for (const k of free) {
        const b = s.slots.get(k);
        if (k === s.key || !b) continue;
        const d = centre(b);
        const along = key === 'ArrowUp' ? c.y - d.y : d.y - c.y;
        if (along <= 1) continue;
        const sc = along + Math.abs(d.x - c.x) * 2;
        if (sc < score) { score = sc; best = k; }
      }
      return best;
    }
    if (back.includes(key)) return by(-1);
    if (ahead.includes(key)) return by(1);
    return null;
  };

  const onKeyDown = (e: React.KeyboardEvent<T>) => {
    const found = itemOf(e.target);
    if (!found) return;
    const { handle: byGrip, busy: isBusy, disabled: off } = latest.current;
    const focus = byGrip ? found.grip : found.el;
    if (!focus || e.target !== focus) return;
    const s = session.current;
    const lifting = e.key === ' ' || e.key === 'Enter';
    if (!s) {
      if (!lifting || off) return;
      e.preventDefault();
      if (isBusy) return;
      if (found.el.dataset.disabled != null) return refused(found.el);
      return lift(found.key, found.el, focus, 'keyboard', { x: 0, y: 0 });
    }
    if (s.mode !== 'keyboard' || s.key !== found.key) return;
    if (e.key === 'Tab') return drop();
    e.preventDefault();
    if (lifting) return drop();
    if (e.key === 'Escape') {
      e.stopPropagation();
      return cancel();
    }
    reorder(s, step(s, e.key));
  };

  // Focus that leaves a held item drops it there; focus lost to a node React moved comes back.
  const onBlur = (e: React.FocusEvent<T>) => {
    const s = session.current;
    if (!s || s.mode !== 'keyboard' || e.target !== s.focus) return;
    setTimeout(() => {
      if (session.current !== s) return;
      const now = document.activeElement;
      if (!now || now === document.body) s.focus?.focus({ preventScroll: true });
      else if (now !== s.focus) drop();
    });
  };

  const listProps = {
    'data-orientation': orientation,
    'data-dragging': dragging ? '' : undefined,
    'aria-busy': busy || undefined,
    onPointerDown,
    onKeyDown,
    onBlur,
    // An image or a link inside an item would start the browser's own drag, which cancels ours.
    onDragStart: (e: React.DragEvent<T>) => { if (itemOf(e.target)) e.preventDefault(); },
  };

  /** Props for each item, a direct child of the list. `label` names it in announcements (its text otherwise). */
  const itemProps = (key: string, { disabled: pinned, label }: { disabled?: boolean; label?: string } = {}) => ({
    'data-row': key,
    'data-sortable-item': '',
    'data-label': label,
    'data-disabled': pinned ? '' : undefined,
    'data-lifted': lifted === key ? '' : undefined,
    'data-grab': !handle && !pinned && !disabled ? '' : undefined,
    ...(handle ? {} : {
      tabIndex: disabled ? undefined : 0,
      'aria-roledescription': 'sortable item',
      'aria-describedby': instructionsId,
      'aria-disabled': pinned || undefined,
    }),
  });

  /** Props for an item's grip, when `handle` is set. */
  const handleProps = (label: string, { disabled: pinned }: { disabled?: boolean } = {}) => ({
    type: 'button' as const,
    'data-sortable-handle': '',
    'aria-label': words.handle(label),
    'aria-describedby': instructionsId,
    'aria-disabled': pinned || disabled || undefined,
  });

  return { listRef, slotRef, announcerRef, instructionsId, instructions: words.instructions, listProps, itemProps, handleProps, lifted, dragging, busy };
}

const LIST = 'mu-sortable sortable-list';
const SLOT = 'mu-sortable-slot sortable-slot';
const ITEM = 'mu-sortable-item sortable-item';
const GRIP = 'mu-sortable-grip sortable-grip';

type SortableState = ReturnType<typeof useSortable<HTMLDivElement>>;
const SortableContext = React.createContext<SortableState | null>(null);
const ItemContext = React.createContext<{ label?: string; disabled?: boolean; text: () => string }>({ text: () => '' });

const use = () => {
  const s = React.useContext(SortableContext);
  if (!s) throw new Error('Sortable.Item and Sortable.Handle go inside Sortable.Root.');
  return s;
};

export interface SortableRootProps extends UseSortableOptions, Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  children?: React.ReactNode;
}

function Root({ value, onValueChange, onValueCommit, orientation, handle, disabled, words, className, children, ...rest }: SortableRootProps) {
  const s = useSortable<HTMLDivElement>({ value, onValueChange, onValueCommit, orientation, handle, disabled, words });
  return (
    <SortableContext.Provider value={s}>
      <div ref={s.listRef} role="list" {...rest} {...s.listProps} className={className ? `${LIST} ${className}` : LIST}>
        {children}
        <div ref={s.slotRef} className={SLOT} aria-hidden />
      </div>
      <span id={s.instructionsId} hidden>{s.instructions}</span>
      <div ref={s.announcerRef} className="sr-only" aria-live="assertive" aria-atomic />
    </SortableContext.Provider>
  );
}

export interface SortableItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Its key in the list's `value`. */
  value: string;
  /** Pinned: it can't be lifted and nothing takes its place. */
  disabled?: boolean;
  /** Its name in announcements and on its grip; its text otherwise. */
  label?: string;
}

function Item({ value, disabled, label, className, children, ...rest }: SortableItemProps) {
  const s = use();
  const ref = React.useRef<HTMLDivElement>(null);
  const item = React.useMemo(() => ({ label, disabled, text: () => ref.current?.textContent?.trim() ?? '' }), [label, disabled]);
  return (
    <ItemContext.Provider value={item}>
      <div ref={ref} role="listitem" {...rest} {...s.itemProps(value, { disabled, label })} className={className ? `${ITEM} ${className}` : ITEM}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

export interface SortableHandleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {}

/** The grip: six engraved dimples. Put one in each item when the list has `handle`. */
function Handle({ className, ...rest }: SortableHandleProps) {
  const s = use();
  const item = React.useContext(ItemContext);
  const [text, setText] = React.useState('');
  React.useEffect(() => { if (!item.label) setText(item.text()); }, [item]);
  return <button {...rest} {...s.handleProps(item.label ?? text, { disabled: item.disabled })} className={className ? `${GRIP} ${className}` : GRIP} />;
}

export const Sortable = { Root, Item, Handle };
export type SortableProps = SortableRootProps;
