'use client';

import * as React from 'react';
import { SlidingIndicator } from '../../motion/indicator';
import { motionReduced } from '../../motion/reduced';
import { trackParts } from '../switcher/switcher';

/* ─────────────────────────────────────────────────────────
 * SCROLLSPY, the section being read, in a table of contents
 *
 *   rail      (vertical, the default) links in ui type and ink2; the current one in ink on one
 *             marker: the row's raised option plate with its green rail, gliding entry to entry on
 *             the settle spring (free travel, like a list's one highlight)
 *   strip     (horizontal) the switcher's track; the current entry under its thumb, on the part
 *             spring (the Tabs look). Wider than its box, the strip scrolls and keeps the current
 *             entry in view (it scrolls itself, never the page)
 *   reading   the current section is the last whose top has crossed the offset line (the scroller's
 *             scroll-padding-top unless `offset` is set); at the end of the scroll, the last one.
 *             Found by an IntersectionObserver on a one-pixel line: nothing runs while you read
 *   jump      pick an entry: the page scrolls smoothly to the section, landing under the offset; the
 *             marker goes straight to the entry and waits there until the scroll ends; focus moves
 *             to the section without a second scroll
 *   hash      (opt-in) the address follows the current section by replaceState, never a new entry
 *   nested    level 2 entries are indented one step
 * Reduce Motion: the marker moves at once and the jump is instant.
 * ───────────────────────────────────────────────────────── */

export interface ScrollspyItem {
  /** The id of the section element this entry marks and jumps to. */
  id: string;
  label: React.ReactNode;
  /** 2 indents the entry one step (an h3 under its h2). */
  level?: 1 | 2;
}

export interface ScrollspyProps {
  items: ScrollspyItem[];
  /** The scrolling element (a ref or the element itself). The window when absent. */
  root?: React.RefObject<HTMLElement | null> | HTMLElement | null;
  /** Pixels from the scroller's top that a section must cross to be current, and where a jump lands. Defaults to the scroller's CSS scroll-padding-top. */
  offset?: number;
  /** vertical (the default): a side rail. horizontal: a strip of tabs. */
  orientation?: 'vertical' | 'horizontal';
  /** regular (32) or compact (28) entries; the strip takes the switcher's two heights. */
  size?: 'regular' | 'compact';
  /** The URL hash follows the current section (replaceState), and a hash on arrival lands on its section. */
  hash?: boolean;
  /** Called with the id of the section that becomes current. */
  onValueChange?: (id: string) => void;
  /** Name the landmark ("On this page"). */
  'aria-label': string;
  className?: string;
}

const NAV = 'mu-scrollspy';
const RAIL = 'relative';
const RAIL_LIST = 'm-0 p-0 list-none grid gap-scrollspy-entry-gap';
const INDENT = 'data-[level=2]:ms-scrollspy-entry-indent';
const ENTRY = {
  regular: 'min-h-scrollspy-entry-height py-scrollspy-entry-pad-y',
  compact: 'min-h-scrollspy-entry-height-compact py-scrollspy-entry-pad-y-compact',
};
const ENTRY_BASE = 'mu-scrollspy-entry relative z-1 flex items-center px-scrollspy-entry-pad-x rounded-scrollspy-entry-radius type-ui text-ink2 no-underline outline-none transition-colors duration-settle hover:text-ink aria-[current=location]:text-ink focus-visible:focus-ring';
const RAIL_MARK = {
  regular: 'before:top-scrollspy-rail-inset before:bottom-scrollspy-rail-inset',
  compact: 'before:top-scrollspy-rail-inset-compact before:bottom-scrollspy-rail-inset-compact',
};
const MARK = 'rounded-scrollspy-entry-radius recipe-row-option-on before:absolute before:left-row-rail-offset before:w-row-rail-w before:rounded-row-rail-radius before:bg-row-rail-color';
const STRIP = `${trackParts.TRACK} scrollspy-strip`;
const STRIP_LIST = 'm-0 p-0 list-none flex';
const WATCH = ['aria-current'];

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

function scrollerOf(root: ScrollspyProps['root']): HTMLElement | null {
  if (!root) return null;
  return root instanceof HTMLElement ? root : root.current;
}

/** The line a section crosses to be current: the offset, or the scroller's own scroll-padding-top. */
function lineOf(scroller: HTMLElement | null, offset: number | undefined) {
  if (offset != null) return offset;
  return parseFloat(getComputedStyle(scroller ?? document.documentElement).scrollPaddingTop) || 0;
}

/** Marks the section being read in a table of contents, and jumps to a section when you pick its entry. */
export function Scrollspy({ items, root, offset, orientation = 'vertical', size = 'regular', hash = false, onValueChange, className, ...aria }: ScrollspyProps) {
  const [current, setCurrent] = React.useState<string | null>(null);
  // While a jump scrolls, the marker waits on its target instead of ticking through every section passed.
  const hold = React.useRef<string | null>(null);
  const holdTimer = React.useRef(0);
  const strip = React.useRef<HTMLDivElement>(null);
  const ids = items.map((i) => i.id).join(' ');
  const change = React.useRef(onValueChange);
  change.current = onValueChange;

  // Lets go of a jump's hold and reads the page again (set by the reading effect).
  const settle = React.useRef(() => { hold.current = null; });

  const jump = React.useCallback((id: string, instant = false) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const scroller = scrollerOf(root);
    const base = scroller ? scroller.getBoundingClientRect().top - scroller.scrollTop : -window.scrollY;
    const top = el.getBoundingClientRect().top - base - lineOf(scroller, offset);
    const behavior: ScrollBehavior = instant || motionReduced(el) ? 'instant' : 'smooth';
    hold.current = id;
    setCurrent(id);
    window.clearTimeout(holdTimer.current);
    // scrollend lets go; this catches a jump that doesn't scroll at all, or a browser without scrollend.
    holdTimer.current = window.setTimeout(() => settle.current(), behavior === 'smooth' ? 1200 : 100);
    (scroller ?? window).scrollTo({ top, behavior });
    // Keyboard and readers land too: focus the section without scrolling again.
    if (!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea, summary')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    return true;
  }, [root, offset]);

  // Reading: an IntersectionObserver on a one-pixel line at the offset fires only when a section's
  // edge crosses it, which is the only time the current section can change.
  React.useEffect(() => {
    const list = ids ? ids.split(' ') : [];
    const sections = list.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const scroller = scrollerOf(root);
    const target: HTMLElement | Window = scroller ?? window;
    let io: IntersectionObserver | null = null;

    const pick = () => {
      if (hold.current) return;
      const line = lineOf(scroller, offset);
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const scrolled = scroller ? scroller.scrollTop : window.scrollY;
      const height = scroller ? scroller.clientHeight : window.innerHeight;
      const full = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
      // At the end of the scroll a short last section can never reach the line: it is the one being read.
      if (scrolled > 0 && scrolled + height >= full - 2) return setCurrent(sections[sections.length - 1].id);
      let id = sections[0].id;
      for (const s of sections) if (s.getBoundingClientRect().top <= top + line + 1) id = s.id;
      setCurrent(id);
    };
    const observe = () => {
      io?.disconnect();
      const line = lineOf(scroller, offset);
      const height = scroller ? scroller.clientHeight : window.innerHeight;
      io = new IntersectionObserver(pick, { root: scroller, rootMargin: `${-line}px 0px ${-Math.max(0, height - line - 1)}px 0px` });
      sections.forEach((s) => io!.observe(s));
    };
    // A jump that ends keeps its entry while its section is still where the jump put it (at the line, or
    // below it at the bottom, where the last section would otherwise win). Scrolled away since, it reads again.
    const end = () => {
      const held = hold.current ? document.getElementById(hold.current) : null;
      window.clearTimeout(holdTimer.current);
      hold.current = null;
      if (held) {
        const at = held.getBoundingClientRect().top - (scroller ? scroller.getBoundingClientRect().top : 0) - lineOf(scroller, offset);
        const height = scroller ? scroller.clientHeight : window.innerHeight;
        if (at >= -2 && at < height) return;
      }
      pick();
    };
    settle.current = end;

    observe();
    pick();
    // A resize moves the line (and the sections); it is not a frame loop.
    const ro = new ResizeObserver(() => { observe(); pick(); });
    ro.observe(scroller ?? document.documentElement);
    // ponytail: scrollend marks the bottom of the scroll; a browser without it lights the last entry only when its top reaches the line.
    target.addEventListener('scrollend', end);
    return () => { io?.disconnect(); ro.disconnect(); target.removeEventListener('scrollend', end); settle.current = () => { hold.current = null; }; };
  }, [ids, root, offset]);

  // Arriving with a hash: land on its section once, without motion.
  const arrived = React.useRef(false);
  React.useEffect(() => {
    if (!hash || arrived.current || !ids) return;
    arrived.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id && ids.split(' ').includes(id)) jump(id, true);
  }, [hash, ids, jump]);

  // The first current section is where the page opened; only changes after that are told and written.
  const previous = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (current == null) return;
    const first = previous.current == null;
    if (previous.current === current) return;
    previous.current = current;
    if (first) return;
    change.current?.(current);
    if (hash && window.location.hash.slice(1) !== current) window.history.replaceState(window.history.state, '', `#${current}`);
  }, [current, hash]);

  // The strip keeps the current entry in view, scrolling only itself.
  React.useEffect(() => {
    const s = strip.current;
    const on = s?.querySelector<HTMLElement>("[aria-current=location]");
    if (!s || !on || s.scrollWidth <= s.clientWidth) return;
    const left = on.offsetLeft - (s.clientWidth - on.offsetWidth) / 2;
    s.scrollTo({ left, behavior: motionReduced(s) ? 'instant' : 'smooth' });
  }, [current]);

  React.useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const horizontal = orientation === 'horizontal';
  const link = (item: ScrollspyItem) => (
    <a
      href={`#${item.id}`}
      aria-current={item.id === current ? 'location' : undefined}
      data-active={horizontal && item.id === current ? '' : undefined}
      className={horizontal ? trackParts.OPTION[size] : join(ENTRY_BASE, ENTRY[size])}
      onClick={(e) => {
        // A new tab or window keeps the browser's own behaviour.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (jump(item.id)) e.preventDefault();
      }}
    >
      {item.label}
    </a>
  );

  return (
    <nav aria-label={aria['aria-label']} data-orientation={orientation} data-size={size} className={join(NAV, className)}>
      {horizontal ? (
        <div ref={strip} className={STRIP}>
          <SlidingIndicator activeSelector="[aria-current=location]" watch={WATCH} className={trackParts.THUMB} />
          <ol className={STRIP_LIST}>
            {items.map((item) => <li key={item.id}>{link(item)}</li>)}
          </ol>
        </div>
      ) : (
        <div className={RAIL}>
          <SlidingIndicator activeSelector="[aria-current=location]" watch={WATCH} spring="settle" className={join(MARK, RAIL_MARK[size])} />
          <ol className={RAIL_LIST}>
            {items.map((item) => <li key={item.id} data-level={item.level ?? 1} className={INDENT}>{link(item)}</li>)}
          </ol>
        </div>
      )}
    </nav>
  );
}
