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
 * Sortable is the hook with a div list, its recess and its live region. useSortableLists is the same
 * drag between several lists (below).
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
  pinned: boolean;
}

const interactive = 'input, textarea, select, button, a[href], [contenteditable=""], [contenteditable=true], [data-no-drag]';
const px = (el: Element, name: string, fallback: number) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || fallback;
const inside = (b: Box, p: Point) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
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

/** Scrolls `box` (the window when null) toward an edge `p` is within `edge` of, faster the closer; true while it moved. */
function nudge(box: HTMLElement | null, p: Point, edge: number, speed: number) {
  const view = box ? box.getBoundingClientRect() : { top: 0, left: 0, bottom: innerHeight, right: innerWidth };
  const v = (d: number) => (d < edge ? Math.ceil(speed * (1 - Math.max(d, 0) / edge)) : 0);
  const dy = v(p.y - view.top) ? -v(p.y - view.top) : v(view.bottom - p.y);
  const dx = v(p.x - view.left) ? -v(p.x - view.left) : v(view.right - p.x);
  if (!dx && !dy) return false;
  const el = box ?? document.scrollingElement ?? document.documentElement;
  const was = [el.scrollLeft, el.scrollTop];
  if (box) box.scrollBy(dx, dy);
  else window.scrollBy(dx, dy);
  return el.scrollLeft !== was[0] || el.scrollTop !== was[1];
}

interface Press {
  id: number;
  x: number;
  y: number;
  /** A whole item on touch: it lifts after a still press, and a swipe before that scrolls the page. */
  touch: boolean;
  threshold: number;
  hold: number;
  /** Lifts; false when it refused. */
  start: (pointer: Point) => boolean;
  /** Something is held. */
  held: () => boolean;
  move: (pointer: Point) => void;
  up: () => void;
  cancel: () => void;
  /** The press is over (lifted or not). */
  done: () => void;
}

/** One press on an item, from pointer down until it lifts and lands, or comes to nothing. Returns its end. */
function press(o: Press) {
  let waiting = true;
  let moved = false;
  let timer = 0;
  const begin = (pointer: Point) => {
    waiting = false;
    moved = o.start(pointer);
  };
  if (o.touch) timer = window.setTimeout(() => begin({ x: o.x, y: o.y }), o.hold);

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== o.id) return;
    if (o.held()) return o.move({ x: ev.clientX, y: ev.clientY });
    if (!waiting || Math.hypot(ev.clientX - o.x, ev.clientY - o.y) < o.threshold) return;
    if (o.touch) return end(); // a swipe before the press held still: the page scrolls
    begin({ x: ev.clientX, y: ev.clientY });
  };
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== o.id) return;
    if (o.held()) o.up();
    end();
  };
  const onCancel = (ev: PointerEvent) => {
    if (ev.pointerId !== o.id) return;
    if (o.held()) o.cancel();
    end();
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' || !o.held()) return;
    ev.preventDefault();
    ev.stopPropagation();
    o.cancel();
  };
  // Once held, a touch drag must not scroll the page, and a long press must not open a menu.
  const onTouch = (ev: TouchEvent) => { if (o.held()) ev.preventDefault(); };
  const onMenu = (ev: Event) => { if (o.held() || waiting) ev.preventDefault(); };
  // The click that ends a drag is the drag's, not the item's.
  const onClick = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); };
  const end = () => {
    clearTimeout(timer);
    waiting = false;
    o.done();
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onCancel);
    removeEventListener('keydown', onKey, true);
    removeEventListener('touchmove', onTouch);
    removeEventListener('contextmenu', onMenu, true);
    if (moved) {
      moved = false;
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
  return end;
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
  const scroll = (s: Session) => nudge(s.scroller, s.pointer, s.edge, s.speed);

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
    const p: Pending = {
      key: found.key, el: found.el, focus: found.grip ?? found.el, id: e.pointerId, x: e.clientX, y: e.clientY,
      touch: e.pointerType === 'touch' && !byGrip, pinned: found.el.dataset.disabled != null,
    };
    pending.current = p;
    unlisten.current = press({
      id: p.id, x: p.x, y: p.y, touch: p.touch,
      threshold: px(list, '--mu-r-sortable-self-threshold', 4),
      hold: px(list, '--mu-r-sortable-self-hold', 250),
      start: (pointer) => {
        pending.current = null;
        if (p.pinned) {
          refused(p.el);
          return false;
        }
        p.el.setPointerCapture?.(p.id);
        getSelection()?.removeAllRanges();
        lift(p.key, p.el, p.focus, 'pointer', pointer);
        return true;
      },
      held: () => !!session.current,
      move: (pointer) => {
        const s = session.current!;
        s.pointer = pointer;
        schedule(s);
      },
      up: drop,
      cancel,
      done: () => { if (pending.current === p) pending.current = null; },
    });
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

/* ─────────────────────────────────────────────────────────
 * BETWEEN LISTS (useSortableLists): the same drag over several lists under one root (Kanban's columns)
 *
 *   lift      as above, but what follows the hand is a copy on the overlay layer (a list that scrolls
 *             can't clip it, and the item can change list mid-drag); the item itself is the recess
 *   move      the nearest list to the hand is the target; in the item's own list the item under the
 *             hand gives up its place, entering another it goes before the item under the hand (upper
 *             half) or after it; past the last, at the end. Every item that moves glides from where it
 *             was, across lists too (FLIP over the root); near a scroller's edge it scrolls, both ways
 *   drop      the copy travels into the recess on the object spring, then the item shows
 *   keys      up and down in the list, left and right to the next list that takes items (same place,
 *             or its end), Home and End, Space drops, Escape puts it back; said with the list's name
 * A list marked disabled takes nothing; a collapsed one (not rendered) is passed over. Lists run top
 * to bottom.
 * ───────────────────────────────────────────────────────── */

/** Lists of keys by list id. */
export type SortableLists = Record<string, string[]>;

/** What the live region says between lists: `list` is the list's name. */
export interface SortableListsWords {
  instructions: string;
  lifted: (label: string, at: number, of: number, list: string) => string;
  moved: (label: string, at: number, of: number, list: string) => string;
  dropped: (label: string, at: number, of: number, list: string) => string;
  cancelled: (label: string, at: number, of: number, list: string) => string;
  failed: (label: string, at: number, of: number, list: string) => string;
  pinned: (label: string) => string;
}

const spokenLists: SortableListsWords = {
  instructions: 'Press Space to lift. Up and down move it, left and right to the next list, Space drops it, Escape puts it back.',
  lifted: (l, at, of, list) => `Lifted ${l}. ${list}, position ${at} of ${of}.`,
  moved: (l, at, of, list) => `${l}, ${list}, position ${at} of ${of}.`,
  dropped: (l, at, of, list) => `Dropped ${l} in ${list} at position ${at} of ${of}.`,
  cancelled: (l, at, of, list) => `Put ${l} back in ${list} at position ${at} of ${of}.`,
  failed: (l, at, of, list) => `Couldn’t save. ${l} is back in ${list} at position ${at} of ${of}.`,
  pinned: (l) => `${l} can’t be moved.`,
};

type ListsValue = Readonly<Record<string, readonly string[]>>;

export interface UseSortableListsOptions {
  /** Each list's keys in order, by list id. */
  value: ListsValue;
  /** The lists while moving (live), and on cancel or rollback. */
  onValueChange: (next: SortableLists) => void;
  /** Once, on a drop that changed anything. Return a promise to hold the lists busy; a rejection rolls back to `previous`. */
  onValueCommit?: (next: SortableLists, previous: SortableLists) => void | Promise<unknown>;
  /** Nothing lifts. */
  disabled?: boolean;
  words?: Partial<SortableListsWords>;
}

/** Moves `key` into `list` at `index` (counted without it; its end by default); every other list keeps its order. */
export function moveBetween(value: ListsValue, key: string, list: string, index?: number): SortableLists {
  const next: SortableLists = {};
  for (const [id, keys] of Object.entries(value)) next[id] = keys.filter((k) => k !== key);
  const to = (next[list] ??= []);
  to.splice(Math.min(Math.max(index ?? to.length, 0), to.length), 0, key);
  return next;
}

const copyLists = (v: ListsValue): SortableLists => Object.fromEntries(Object.entries(v).map(([k, keys]) => [k, [...keys]]));
const sameLists = (a: ListsValue, b: ListsValue) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, keys]) => !!b[k] && same(keys, b[k]));
const listHolding = (v: ListsValue, key: string) => Object.keys(v).find((id) => v[id].includes(key)) ?? '';
/** Fields keep their presses; a link doesn't (a card that opens still lifts; the click that ends a drag is the drag's). */
const fields = 'input, textarea, select, button, [contenteditable=""], [contenteditable=true], [data-no-drag]';
const GLIDE = 'mu-sortable-glide';

interface ListsSession {
  key: string;
  el: HTMLElement;
  mode: 'pointer' | 'keyboard';
  start: SortableLists;
  /** The copy that follows the hand (pointer). */
  copy: HTMLElement | null;
  /** Where the hand holds the item, from its top left. */
  grab: Point;
  pointer: Point;
  /** The item just traded with: no trading back until the hand leaves it. */
  skip: string | null;
  edge: number;
  speed: number;
  frame: number;
  returning: boolean;
}

/**
 * The drag between lists under one root. Spread `rootProps` and `ref={rootRef}` on the root (positioned),
 * `listProps(id, { label })` on each list (positioned; its items are its direct children) and
 * `itemProps(key)` on each item; render `<div ref={overlayRef} className="sortable-overlay" />` inside the
 * root, and the announcer and instructions as for `useSortable`.
 */
export function useSortableLists<T extends HTMLElement = HTMLElement>({ value, onValueChange, onValueCommit, disabled = false, words: own }: UseSortableListsOptions) {
  const rootRef = React.useRef<T | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const announcerRef = React.useRef<HTMLDivElement | null>(null);
  const instructionsId = React.useId();
  const [lifted, setLifted] = React.useState<string | null>(null);
  const [overlaid, setOverlaid] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const words = React.useMemo(() => ({ ...spokenLists, ...own }), [own]);

  const latest = React.useRef({ value, onValueChange, onValueCommit, disabled, busy, words });
  latest.current = { value, onValueChange, onValueCommit, disabled, busy, words };
  const session = React.useRef<ListsSession | null>(null);
  const returning = React.useRef<ListsSession | null>(null);
  const pressing = React.useRef(false);
  const unlisten = React.useRef<() => void>(() => {});
  const landing = React.useRef<(() => void) | null>(null);
  const before = React.useRef<Map<string, Point> | null>(null);

  const say = React.useCallback((text: string) => {
    if (announcerRef.current) announcerRef.current.textContent = text;
  }, []);

  const lists = () => {
    const root = rootRef.current;
    return root ? Array.from(root.querySelectorAll<HTMLElement>('[data-sortable-list]')).filter((l) => l.closest('[data-sortable-lists]') === root) : [];
  };
  /** The lists that take items now: not disabled, and shown. */
  const open = () => lists().filter((l) => l.dataset.listDisabled == null && l.getClientRects().length > 0);
  const items = (list: HTMLElement) => (Array.from(list.children) as HTMLElement[]).filter((c) => c.dataset.sortableItem != null && c.dataset.row != null);
  const itemEl = (key: string) => lists().flatMap(items).find((c) => c.dataset.row === key) ?? null;
  const nameOf = (id: string) => {
    const l = lists().find((n) => n.dataset.sortableList === id);
    return l?.dataset.label || l?.getAttribute('aria-label') || id;
  };
  /** What to say about `key` in `v`: its position, its list's count and its list's name. */
  const where = (key: string, v: ListsValue = latest.current.value) => {
    const id = listHolding(v, key);
    return [(v[id]?.indexOf(key) ?? -1) + 1, v[id]?.length ?? 0, nameOf(id)] as const;
  };

  /** Notes where every item is, so they glide from there once `next` is laid out. */
  const change = (next: SortableLists) => {
    const was = new Map<string, Point>();
    for (const el of lists().flatMap(items)) was.set(el.dataset.row!, centre(boxOf(el)));
    before.current = was;
    latest.current.onValueChange(next);
  };

  const glide = (was: Map<string, Point>) => {
    const all = lists().flatMap(items);
    all.forEach((el) => el.getAnimations().forEach((a) => { if (a.id === GLIDE) a.cancel(); }));
    const root = rootRef.current;
    const { ms, easing } = root ? springOf(root, 'settle') : { ms: 0, easing: '' };
    if (!ms) return;
    for (const el of all) {
      const from = was.get(el.dataset.row!);
      if (!from) continue;
      const to = centre(boxOf(el));
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing, id: GLIDE });
    }
  };

  /** The copy, under the hand. */
  const follow = (s: ListsSession) => {
    const layer = overlayRef.current;
    if (!s.copy || !layer) return;
    const o = layer.getBoundingClientRect();
    s.copy.style.translate = `${s.pointer.x - s.grab.x - o.left}px ${s.pointer.y - s.grab.y - o.top}px`;
  };

  /** Where the hand would put the item: the nearest list that takes it, then its place there. */
  const target = (s: ListsSession) => {
    const p = s.pointer;
    let best: HTMLElement | null = null;
    let far = Infinity;
    for (const l of open()) {
      const r = l.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - p.x, 0, p.x - r.right), Math.max(r.top - p.y, 0, p.y - r.bottom));
      if (d < far) { far = d; best = l; }
    }
    if (!best) return;
    const id = best.dataset.sortableList!;
    const now = latest.current.value;
    const y = p.y - best.getBoundingClientRect().top - best.clientTop + best.scrollTop;
    const others = items(best).filter((el) => el.dataset.row !== s.key).map((el) => ({ key: el.dataset.row!, top: el.offsetTop, h: el.offsetHeight }));
    const skipped = others.find((o) => o.key === s.skip);
    if (!skipped || y < skipped.top || y >= skipped.top + skipped.h) s.skip = null;
    const over = others.find((o) => y >= o.top && y < o.top + o.h);
    if (over && over.key === s.skip) return;
    const keys = (now[id] ?? []).filter((k) => k !== s.key);
    const last = others[others.length - 1];
    let index: number;
    if (over) index = listHolding(now, s.key) === id ? now[id].indexOf(over.key) : keys.indexOf(over.key) + (y < over.top + over.h / 2 ? 0 : 1);
    else if (!last || y < others[0].top) index = 0;
    else if (y >= last.top + last.h) index = keys.length;
    else return;
    const next = moveBetween(now, s.key, id, index);
    if (sameLists(next, now)) return;
    s.skip = over?.key ?? null;
    change(next);
  };

  /** Scrolls every scroller the hand is near the edge of, from the item's list out to the window. */
  const scroll = (s: ListsSession) => {
    let moved = false;
    for (let n = s.el.parentElement; n && n !== document.body; n = n.parentElement) {
      const st = getComputedStyle(n);
      if ((/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight) || (/(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth)) moved = nudge(n, s.pointer, s.edge, s.speed) || moved;
    }
    return nudge(null, s.pointer, s.edge, s.speed) || moved;
  };

  const tick = () => {
    const s = session.current;
    if (!s || s.mode !== 'pointer') return;
    s.frame = 0;
    follow(s);
    target(s);
    if (scroll(s)) s.frame = requestAnimationFrame(tick);
  };

  const end = (s: ListsSession) => {
    cancelAnimationFrame(s.frame);
    unlisten.current();
    unlisten.current = () => {};
    session.current = null;
  };

  /** The copy travels into the item's slot on `spring`, then goes and the item shows. */
  const land = (s: ListsSession, spring: 'object' | 'settle') => {
    const { copy } = s;
    const done = () => {
      copy?.remove();
      if (landing.current === done) landing.current = null;
      setLifted(null);
      setOverlaid(false);
    };
    landing.current = done;
    const home = itemEl(s.key);
    const layer = overlayRef.current;
    if (!copy || !home || !layer) return done();
    home.getAnimations().forEach((a) => { if (a.id === GLIDE) a.finish(); });
    const o = layer.getBoundingClientRect();
    const r = home.getBoundingClientRect();
    const from = copy.style.translate || '0px 0px';
    const to = `${r.left - o.left}px ${r.top - o.top}px`;
    copy.style.translate = to;
    delete copy.dataset.lifted; // the plate fades and the scale settles as it travels
    const { ms, easing } = springOf(layer, spring);
    if (!ms) return done();
    copy.animate([{ translate: from }, { translate: to }], { duration: ms, easing }).finished.then(done, done);
  };

  const commit = (s: ListsSession, label: string) => {
    const { value: next, onValueCommit: save } = latest.current;
    if (sameLists(next, s.start) || !save) return;
    const previous = s.start;
    const saved = save(copyLists(next), copyLists(previous));
    if (!saved || typeof (saved as Promise<unknown>).then !== 'function') return;
    setBusy(true);
    (saved as Promise<unknown>).then(
      () => setBusy(false),
      () => {
        setBusy(false);
        change(copyLists(previous));
        const [at, of, list] = where(s.key, previous);
        say(latest.current.words.failed(label, at, of, list));
      },
    );
  };

  const lift = (key: string, el: HTMLElement, mode: ListsSession['mode'], pointer: Point) => {
    landing.current?.();
    const root = rootRef.current;
    if (!root) return;
    const r = el.getBoundingClientRect();
    const s: ListsSession = {
      key, el, mode, start: copyLists(latest.current.value), copy: null, pointer, skip: null, frame: 0, returning: false,
      grab: { x: pointer.x - r.left, y: pointer.y - r.top },
      edge: px(root, '--mu-r-sortable-self-edge', 48), speed: px(root, '--mu-r-sortable-self-speed', 18),
    };
    const layer = overlayRef.current;
    if (mode === 'pointer' && layer) {
      const copy = el.cloneNode(true) as HTMLElement;
      for (const n of [copy, ...Array.from(copy.querySelectorAll('[id]'))]) n.removeAttribute('id');
      for (const a of ['tabindex', 'data-row', 'data-sortable-item', 'aria-describedby', 'aria-roledescription']) copy.removeAttribute(a);
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      copy.dataset.overlay = '';
      copy.style.width = `${r.width}px`;
      copy.style.height = `${r.height}px`;
      layer.append(copy);
      s.copy = copy;
      follow(s);
      void copy.offsetWidth; // it rises from where the item is
      copy.dataset.lifted = '';
    }
    session.current = s;
    setLifted(key);
    setOverlaid(mode === 'pointer');
    const [at, of, list] = where(key);
    say(latest.current.words.lifted(labelOf(el), at, of, list));
    if (mode === 'pointer') haptic('alignment');
  };

  const drop = () => {
    const s = session.current;
    if (!s) return;
    end(s);
    land(s, 'object');
    if (s.mode === 'pointer') haptic('detent');
    const label = labelOf(s.el);
    const [at, of, list] = where(s.key);
    say(latest.current.words.dropped(label, at, of, list));
    commit(s, label);
  };

  const goHome = (s: ListsSession) => {
    land(s, 'settle');
    const [at, of, list] = where(s.key, s.start);
    say(latest.current.words.cancelled(labelOf(s.el), at, of, list));
  };

  const cancel = () => {
    const s = session.current;
    if (!s || s.returning) return;
    s.returning = true;
    end(s);
    if (sameLists(latest.current.value, s.start)) return goHome(s);
    returning.current = s;
    change(copyLists(s.start)); // the layout effect below takes it home
  };

  // After the lists change: what moved glides; a held item is found again (in another list it is a new
  // node) and keeps its focus (keys); a return lands.
  const order = Object.entries(value).map(([k, keys]) => `${k}:${keys.join('\n')}`).join('\n\n');
  useIsoLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (was) glide(was);
    const back = returning.current;
    if (back) {
      returning.current = null;
      back.el = itemEl(back.key) ?? back.el;
      return goHome(back);
    }
    const s = session.current;
    if (!s) return;
    s.el = itemEl(s.key) ?? s.el;
    if (s.mode === 'pointer') return;
    if (document.activeElement !== s.el) s.el.focus({ preventScroll: true });
    s.el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const [at, of, list] = where(s.key);
    say(latest.current.words.moved(labelOf(s.el), at, of, list));
  }, [order]);

  // Nothing outlives the root.
  React.useEffect(() => () => {
    unlisten.current();
    if (session.current) cancelAnimationFrame(session.current.frame);
    session.current?.copy?.remove();
    landing.current?.();
  }, []);

  /** The item a DOM event belongs to, when it is in one of this root's lists. */
  const itemOf = (t: EventTarget | null) => {
    const root = rootRef.current;
    if (!root || !(t instanceof Element)) return null;
    const el = t.closest<HTMLElement>('[data-sortable-item]');
    const list = el?.parentElement;
    if (!el || !list || list.dataset.sortableList == null || list.closest('[data-sortable-lists]') !== root || !el.dataset.row) return null;
    return { el, key: el.dataset.row };
  };

  const refused = (el: HTMLElement) => {
    refuse(el);
    haptic('refusal');
    say(latest.current.words.pinned(labelOf(el)));
  };

  const onPointerDown = (e: React.PointerEvent<T>) => {
    const { busy: isBusy, disabled: off } = latest.current;
    if (isBusy || off || session.current || pressing.current || e.button !== 0 || !e.isPrimary) return;
    const found = itemOf(e.target);
    if (!found) return;
    if (e.target instanceof Element && e.target !== found.el && e.target.closest(fields)) return;
    const root = rootRef.current!;
    pressing.current = true;
    unlisten.current = press({
      id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch',
      threshold: px(root, '--mu-r-sortable-self-threshold', 4),
      hold: px(root, '--mu-r-sortable-self-hold', 250),
      start: (pointer) => {
        pressing.current = false;
        if (found.el.dataset.disabled != null) {
          refused(found.el);
          return false;
        }
        getSelection()?.removeAllRanges();
        lift(found.key, found.el, 'pointer', pointer);
        return true;
      },
      held: () => !!session.current,
      move: (pointer) => {
        const s = session.current!;
        s.pointer = pointer;
        if (!s.frame) s.frame = requestAnimationFrame(tick);
      },
      up: drop,
      cancel,
      done: () => { pressing.current = false; },
    });
  };

  const step = (s: ListsSession, key: string): SortableLists | null => {
    const now = latest.current.value;
    const id = listHolding(now, s.key);
    const keys = now[id] ?? [];
    const i = keys.indexOf(s.key);
    const last = keys.length - 1;
    if (key === 'ArrowUp') return i > 0 ? moveBetween(now, s.key, id, i - 1) : null;
    if (key === 'ArrowDown') return i < last ? moveBetween(now, s.key, id, i + 1) : null;
    if (key === 'Home') return i > 0 ? moveBetween(now, s.key, id, 0) : null;
    if (key === 'End') return i < last ? moveBetween(now, s.key, id, last) : null;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;
    const all = open();
    const here = all.findIndex((l) => l.dataset.sortableList === id);
    const next = here < 0 ? undefined : all[here + (key === 'ArrowLeft' ? -1 : 1)];
    return next ? moveBetween(now, s.key, next.dataset.sortableList!, i) : null;
  };

  const onKeyDown = (e: React.KeyboardEvent<T>) => {
    const found = itemOf(e.target);
    if (!found || e.target !== found.el) return;
    const s = session.current;
    const lifting = e.key === ' ' || e.key === 'Enter';
    if (!s) {
      const { busy: isBusy, disabled: off } = latest.current;
      if (!lifting || off) return;
      e.preventDefault();
      if (isBusy) return;
      if (found.el.dataset.disabled != null) return refused(found.el);
      return lift(found.key, found.el, 'keyboard', { x: 0, y: 0 });
    }
    if (s.mode !== 'keyboard' || s.key !== found.key) return;
    if (e.key === 'Tab') return drop();
    e.preventDefault();
    if (lifting) return drop();
    if (e.key === 'Escape') {
      e.stopPropagation();
      return cancel();
    }
    const next = step(s, e.key);
    if (next) change(next);
  };

  // Focus that leaves a held item drops it there; focus lost to a node React moved comes back.
  const onBlur = (e: React.FocusEvent<T>) => {
    const s = session.current;
    if (!s || s.mode !== 'keyboard' || e.target !== s.el) return;
    setTimeout(() => {
      if (session.current !== s) return;
      const now = document.activeElement;
      if (!now || now === document.body) s.el.focus({ preventScroll: true });
      else if (now !== s.el) drop();
    });
  };

  const rootProps = {
    'data-sortable-lists': '',
    'data-dragging': overlaid && lifted ? '' : undefined,
    'aria-busy': busy || undefined,
    onPointerDown,
    onKeyDown,
    onBlur,
    // An image or a link inside an item would start the browser's own drag, which cancels ours.
    onDragStart: (e: React.DragEvent<T>) => { if (itemOf(e.target)) e.preventDefault(); },
  };

  /** Props for a list; its items are its direct children. `label` names it when spoken; `disabled` takes nothing. */
  const listProps = (id: string, { label, disabled: closed }: { label?: string; disabled?: boolean } = {}) => ({
    'data-sortable-list': id,
    'data-label': label,
    'data-list-disabled': closed ? '' : undefined,
  });

  /** Props for each item. `label` names it when spoken (its text otherwise); `disabled` can't be lifted. */
  const itemProps = (key: string, { disabled: pinned, label }: { disabled?: boolean; label?: string } = {}) => ({
    'data-row': key,
    'data-sortable-item': '',
    'data-label': label,
    'data-disabled': pinned ? '' : undefined,
    'data-lifted': lifted === key ? '' : undefined,
    'data-placeholder': lifted === key && overlaid ? '' : undefined,
    'data-grab': !pinned && !disabled ? '' : undefined,
    tabIndex: disabled ? undefined : 0,
    'aria-roledescription': 'sortable item',
    'aria-describedby': instructionsId,
    'aria-disabled': pinned || undefined,
  });

  return { rootRef, overlayRef, announcerRef, instructionsId, instructions: words.instructions, rootProps, listProps, itemProps, lifted, dragging: overlaid && !!lifted, busy };
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
