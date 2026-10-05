'use client';

import * as React from 'react';
import { motionReduced, onMotionChange } from '../../motion/reduced';

/* ─────────────────────────────────────────────────────────
 * DOT DISPLAY: square dots on one pitch, printed into a well
 *
 *   dots      one ink index per dot, row by row; the caller draws the picture (a sky, a sticker)
 *   inks      index → a px colour, or [colour, alpha] for a dimmer dot (a glow, fog)
 *   geometry  the recipe's pitch and dot: the SVG draws whole cells, the dot-display utility masks
 *             each down to its square, so no size lives in code
 *   motion    a slow display: useDotTick steps on the recipe's step (6 a second) and never tweens;
 *             it holds still under reduced motion, in a hidden tab and while off screen
 * A part: no role of its own. The object around it names what it shows.
 * ───────────────────────────────────────────────────────── */

/** The dot colours (tokens colorways px-*): an unlit dot, then the lit ones; ink marks "now". */
export type DotColour = 'off' | 'hz' | 'hill' | 'sun' | 'moon' | 'star' | 'cloud' | 'cloud-dark' | 'rain' | 'snow' | 'ink';
/** A colour, or a colour at an alpha. */
export type DotInk = DotColour | readonly [DotColour, number];

export interface DotDisplayProps extends Omit<React.SVGProps<SVGSVGElement>, 'children' | 'ref'> {
  cols: number;
  rows: number;
  /** One ink index per dot, row by row (`cols × rows` long). An index with no ink is unlit. */
  dots: ArrayLike<number>;
  inks: readonly DotInk[];
  /** default (pitch 8, dot 6) or mini (pitch 3, dot 2.4): a glyph in a row of text. */
  size?: 'default' | 'mini';
}

const fillOf = (ink: DotInk | undefined) => {
  const [colour, alpha] = typeof ink === 'string' ? [ink, 1] : ink ?? ['off', 1];
  return { fill: colour === 'ink' ? 'var(--mu-ink)' : `var(--mu-px-${colour})`, fillOpacity: alpha };
};

export const DotDisplay = React.forwardRef<SVGSVGElement, DotDisplayProps>(function DotDisplay({ cols, rows, dots, inks, size = 'default', className, style, ...props }, ref) {
  // One path per ink: every dot of that ink as a unit cell.
  const paths = React.useMemo(() => {
    const byInk: string[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = dots[y * cols + x] ?? 0;
      const at = inks[i] === undefined ? 0 : i;
      byInk[at] = (byInk[at] ?? '') + `M${x} ${y}h1v1h-1Z`;
    }
    return byInk;
  }, [cols, rows, dots, inks]);
  const own = size === 'mini' ? 'dot-display dot-display-mini' : 'dot-display';
  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      data-cols={cols}
      data-rows={rows}
      data-size={size}
      className={className ? `${own} ${className}` : own}
      style={{ width: `calc(${cols} * var(--dot-pitch))`, height: `calc(${rows} * var(--dot-pitch))`, ...style }}
      {...props}
    >
      {paths.map((d, i) => (d ? <path key={i} d={d} data-ink={i} style={i === 0 ? fillOf('off') : fillOf(inks[i])} /> : null))}
    </svg>
  );
});

const stepMs = (el: Element | null) => {
  const raw = el ? getComputedStyle(el).getPropertyValue('--mu-r-dot-display-self-step').trim() : '';
  const n = parseFloat(raw);
  return raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : n;
};

/**
 * The display's clock: a frame number that steps on the recipe's step. It holds still under reduced
 * motion, in a hidden tab and while `ref` is off screen, and resumes where it stopped.
 */
export function useDotTick(ref: React.RefObject<Element | null>, running = true) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!running || !el) return;
    let seen = true;
    let timer = 0;
    const sync = () => {
      window.clearInterval(timer);
      timer = 0;
      const ms = stepMs(el);
      if (motionReduced(el) || document.hidden || !seen || !(ms > 0)) return;
      timer = window.setInterval(() => setTick((t) => t + 1), ms);
    };
    const watch = new IntersectionObserver(([e]) => { seen = e?.isIntersecting ?? true; sync(); });
    watch.observe(el);
    const unwatch = onMotionChange(sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      window.clearInterval(timer);
      watch.disconnect();
      unwatch();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref, running]);
  return tick;
}
