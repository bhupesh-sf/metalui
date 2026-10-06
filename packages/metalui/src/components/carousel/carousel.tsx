'use client';

import * as React from 'react';
import { ChevronIcon } from '../../icons/components.generated';
import { SwapText } from '../../motion/swap';
import { motionReduced } from '../../motion/reduced';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { IconButton } from '../icon-button/icon-button';

/* ─────────────────────────────────────────────────────────
 * CAROUSEL, a few peers looked at one or a few at a time
 *
 *   rest      the slides in a row that scrolls natively with mandatory snap (touch, trackpad, wheel);
 *             each snaps its start edge. By default a slide is the box minus the peek, so the next
 *             one shows at the edge. The box bleeds above and below and pads each side: raised
 *             slides keep their shadows and focus rings
 *   controls  one row under the slides: the readout at the start ("3 / 8", or the range fully in
 *             view, "3–5 / 8", the number turning on the drum), Previous and Next together at the
 *             end, the graphite tool keys with the set's chevron
 *   step      a key, or ← → Home End on the focused box: one slide, its start landing at the box's
 *             start, gliding (scrollTo smooth)
 *   ends      the key that would go past an end is off (aria-disabled, 40 %): it stays, so focus does
 *   reading   an IntersectionObserver on the slides: only a slide crossing the edge wakes it. A
 *             polite status says "3 of 8" once the scroll settles, not for every slide passed
 *   never     rotates on its own (no autoplay, no loop)
 * Reduce Motion: a step jumps instead of gliding; the drum crossfades.
 * WAI-ARIA APG carousel (basic): a section, roledescription "carousel"; slides are groups,
 * roledescription "slide", named "3 of 8".
 * ───────────────────────────────────────────────────────── */

export interface CarouselProps {
  /** What the slides are ("Listing photos"): the carousel's accessible name. */
  'aria-label': string;
  /** Each slide's width, any CSS length ("240px", "48%"). Absent: the box minus the peek. */
  slideWidth?: string;
  /** The slide to open on, from 0, landed without motion. */
  defaultIndex?: number;
  /** Called with the first slide fully in view, from 0, when it changes. */
  onIndexChange?: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export interface CarouselSlideProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Its name, when it has one ("Kitchen"); otherwise "3 of 8". */
  'aria-label'?: string;
}

const ROOT = 'mu-carousel grid min-w-0 gap-carousel-slide-gap';
const VIEWPORT = 'mu-carousel-viewport carousel-viewport relative gap-carousel-slide-gap py-carousel-box-bleed -my-carousel-box-bleed px-carousel-box-bleed scroll-px-carousel-box-bleed outline-none focus-visible:focus-ring';
const SLIDE = 'mu-carousel-slide carousel-slide';
const CONTROLS = 'mu-carousel-controls flex items-center justify-between gap-carousel-controls-gap px-carousel-box-bleed';
const READOUT = 'mu-carousel-readout inline-flex items-baseline type-readout text-ink2 tabular-nums';
const KEYS = 'flex gap-carousel-controls-gap';
const OFF = 'aria-disabled:opacity-button-disabled aria-disabled:cursor-default aria-disabled:pointer-events-none';
/** A slide counts as in view from this much of it. */
const FULL = 0.97;
/** The status speaks once the slides have been still this long. */
const SETTLE_MS = 400;

const Place = React.createContext<{ index: number; count: number }>({ index: 0, count: 1 });

function Slide({ className, ...props }: CarouselSlideProps) {
  const { index, count } = React.useContext(Place);
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}`}
      data-carousel-slide=""
      {...props}
      className={className ? `${SLIDE} ${className}` : SLIDE}
    />
  );
}

/** A few peers in a row narrower than all of them: a gallery, onboarding cards, a shelf on a narrow screen. */
function Root({ slideWidth, defaultIndex = 0, onIndexChange, className, children, ...aria }: CarouselProps) {
  const id = React.useId();
  const box = React.useRef<HTMLDivElement>(null);
  const slides = React.Children.toArray(children);
  const count = slides.length;
  // The slides fully in view: [first, last], from 0.
  const [range, setRange] = React.useState<[number, number]>([defaultIndex, defaultIndex]);
  const [said, setSaid] = React.useState('');
  // While a step glides, the next step counts from where it is going, not from where it is.
  const going = React.useRef<number | null>(null);
  const baseline = React.useRef<string | null>(null);
  const change = React.useRef(onIndexChange);
  change.current = onIndexChange;

  const slideEls = () => [...(box.current?.querySelectorAll<HTMLElement>(':scope > [data-carousel-slide]') ?? [])];

  const go = React.useCallback((to: number, instant = false) => {
    const vp = box.current;
    const all = slideEls();
    const i = Math.max(0, Math.min(all.length - 1, to));
    if (!vp || !all[i]) return;
    going.current = i;
    const left = all[i].offsetLeft - (parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0);
    vp.scrollTo({ left, behavior: instant || motionReduced(vp) ? 'instant' : 'smooth' });
  }, []);

  // Open on defaultIndex, without motion.
  const arrival = React.useRef(defaultIndex);
  useIsoLayoutEffect(() => {
    if (arrival.current > 0) go(arrival.current, true);
  }, [go]);

  // Reading: a slide crossing the edge is the only time what's in view changes.
  React.useEffect(() => {
    const vp = box.current;
    if (!vp) return;
    const els = slideEls();
    const ratio = new Map<Element, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) ratio.set(e.target, e.intersectionRatio);
      const r = els.map((el) => ratio.get(el) ?? 0);
      let first = r.findIndex((v) => v >= FULL);
      let last = r.length - 1 - [...r].reverse().findIndex((v) => v >= FULL);
      // A slide wider than the box is never whole: the most-shown one is in view.
      if (first < 0) first = last = r.indexOf(Math.max(...r));
      // Where it opened is the baseline: nothing is said or told for it.
      baseline.current ??= `${first}-${last}`;
      setRange((cur) => (cur[0] === first && cur[1] === last ? cur : [first, last]));
    }, { root: vp, threshold: [0, 0.5, FULL] });
    els.forEach((el) => io.observe(el));
    const end = () => { going.current = null; };
    vp.addEventListener('scrollend', end);
    return () => { io.disconnect(); vp.removeEventListener('scrollend', end); };
  }, [count]);

  // Tell the host, and the status once the slides are still; never for where it opened.
  const told = React.useRef(range[0]);
  React.useEffect(() => {
    const key = `${range[0]}-${range[1]}`;
    if (baseline.current == null || key === baseline.current) return;
    baseline.current = '';
    if (told.current !== range[0]) { told.current = range[0]; change.current?.(range[0]); }
    const words = range[0] === range[1] ? `${range[0] + 1} of ${count}` : `${range[0] + 1} to ${range[1] + 1} of ${count}`;
    const t = window.setTimeout(() => { setSaid(words); going.current = null; }, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [range, count]);

  const [first, last] = range;
  const atStart = first <= 0;
  const atEnd = last >= count - 1;
  const step = (by: -1 | 1) => go((going.current ?? first) + by);

  const keys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only the box's own keys: a field inside a slide keeps its arrows.
    if (e.target !== e.currentTarget) return;
    const to = { ArrowLeft: (going.current ?? first) - 1, ArrowRight: (going.current ?? first) + 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  const face = first === last ? `${first + 1}` : `${first + 1}–${last + 1}`;

  return (
    <section aria-roledescription="carousel" aria-label={aria['aria-label']} className={className ? `${ROOT} ${className}` : ROOT}>
      <div
        ref={box}
        id={id}
        role="group"
        aria-label="Slides"
        tabIndex={0}
        onKeyDown={keys}
        className={VIEWPORT}
        style={slideWidth ? ({ '--carousel-slide-width': slideWidth } as React.CSSProperties) : undefined}
      >
        {slides.map((slide, index) => (
          <Place.Provider key={React.isValidElement(slide) && slide.key != null ? slide.key : index} value={{ index, count }}>
            {slide}
          </Place.Provider>
        ))}
      </div>
      <div className={CONTROLS}>
        <span aria-hidden data-face={`${face} / ${count}`} className={READOUT}>
          <SwapText value={face} />
          <span className="whitespace-pre">{` / ${count}`}</span>
        </span>
        <span role="status" className="sr-only">{said}</span>
        <span className={KEYS}>
          <IconButton variant="tool" label="Previous slide" icon={<ChevronIcon turn={90} />} aria-controls={id} aria-disabled={atStart || undefined} className={OFF} onClick={() => { if (!atStart) step(-1); }} />
          <IconButton variant="tool" label="Next slide" icon={<ChevronIcon turn={270} />} aria-controls={id} aria-disabled={atEnd || undefined} className={OFF} onClick={() => { if (!atEnd) step(1); }} />
        </span>
      </div>
    </section>
  );
}

export const Carousel = Object.assign(Root, { Slide, Root });
