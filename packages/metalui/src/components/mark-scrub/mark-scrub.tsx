'use client';

import * as React from 'react';
import { Mark, type MarkProps } from '../mark/mark';
import { SwapText } from '../../motion/swap';
import { haptic } from '../../motion/haptic';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * MARK SCRUB, a number, a duration or a time of day inside the text that you change in place
 *
 *   rest      the Mark exactly (its glyph, line and chip); the cursor says ns-resize
 *   press     the words take focus; no text selection starts
 *   drag      up raises, down lowers: one detent per scrub.pixels of travel; Shift takes the large
 *             step, Alt the small, read at each detent. Each detent:
 *     0ms       the words are rewritten (onWordsChange); the digits turn on the drum, up or down
 *     0ms       the scale beside the words moves one tick with the hand; the detent haptic plays
 *   hold      while dragging the words keep the widest width of the gesture; the hold drops on release
 *   scale     an engraved ruler (the groove's ink and lip), shown only while dragging: fades in and
 *             out on the settle spring
 *   release   one commit (onWordsCommit) when the words changed: the host's one undo step
 *   keys      ↑ ↓ step (Shift large, Alt small), Page Up / Down large, Home / End to the limits;
 *             each press is one change and one commit
 *   limit     a push past min or max shakes only the words, once per push (refusal)
 * The words are the value: the scale reads it from them and rewrites only the part that carries it
 * ("tomorrow 4pm" keeps "tomorrow"). Scales: number, duration (minutes, never below 0), clock
 * (minutes after midnight, wrapping). Reduce Motion: the drum crossfades; the scale comes and goes at once.
 * ───────────────────────────────────────────────────────── */

export type MarkScrubScale = 'number' | 'duration' | 'clock';

/** The value a scale reads in the words, and how to write another value back into the same words. */
export interface MarkScrubReading {
  value: number;
  write: (value: number) => string;
}

const NUMBER = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/;
const DURATION = /(\d+)\s*h(?:\s*(\d{1,2})\s*(?:min|m)?)?(?![a-z])|(\d+)(\s*)(min|m)\b/i;
const CLOCK = /(\d{1,2})(?::(\d{2}))?(\s?)(am|pm)\b|(\d{1,2}):(\d{2})/i;
const DAY = 1440;

const pad2 = (n: number) => String(n).padStart(2, '0');
const places = (s: string) => (s.split('.')[1] ?? '').length;

/** Reads the value in `words` on `scale`, or null when the words carry none. */
export function markScrubRead(words: string, scale: MarkScrubScale = 'number'): MarkScrubReading | null {
  const re = scale === 'number' ? NUMBER : scale === 'duration' ? DURATION : CLOCK;
  const m = re.exec(words);
  if (!m) return null;
  const put = (next: string) => words.slice(0, m.index) + next + words.slice(m.index + m[0].length);

  if (scale === 'number') {
    const grouped = m[0].includes(',');
    // Fixed places when the words show them ("$40.00", "6.0h"); otherwise as few as the value needs ("6.5h" → "24h").
    const kept = /\.\d*0$/.test(m[0]) ? places(m[0]) : 0;
    return {
      value: parseFloat(m[0].replace(/,/g, '')),
      write: (v) => {
        const d = Math.max(kept, places(String(parseFloat(v.toFixed(10)))));
        return put(grouped ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : v.toFixed(d));
      },
    };
  }

  if (scale === 'duration') {
    const minutesOnly = m[3] != null;
    return {
      value: minutesOnly ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2] ?? 0),
      // Minutes stay minutes ("45 min" → "50 min"); hours are written "1h05", or minutes alone under an hour.
      write: (v) => {
        if (minutesOnly) return put(`${v}${m[4]}${m[5]}`);
        const h = Math.floor(v / 60), r = v % 60;
        return put(h ? `${h}h${r ? pad2(r) : ''}` : `${r}min`);
      },
    };
  }

  const twelve = m[4] != null;
  const value = twelve ? ((Number(m[1]) % 12) + (m[4].toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(m[2] ?? 0) : Number(m[5]) * 60 + Number(m[6]);
  return {
    value,
    write: (v) => {
      const at = ((v % DAY) + DAY) % DAY, h = Math.floor(at / 60), min = at % 60;
      if (!twelve) return put(`${m[5].length === 2 ? pad2(h) : h}:${pad2(min)}`);
      const ap = h < 12 ? 'am' : 'pm';
      return put(`${h % 12 || 12}${min || m[2] ? `:${pad2(min)}` : ''}${m[3]}${m[4] === m[4].toUpperCase() ? ap.toUpperCase() : ap}`);
    },
  };
}

const NAMES: Record<MarkScrubScale, string> = { number: 'Number', duration: 'Duration', clock: 'Time' };

export interface MarkScrubProps extends Omit<MarkProps, 'children'> {
  /** The words as written ("6h", "$40", "tomorrow 4pm"). They are the value: rewrite them from onWordsChange. */
  children: string;
  /** How the words carry the value: number (default), duration (minutes) or clock (minutes after midnight, wrapping). */
  scale?: MarkScrubScale;
  /** A detent's step, and the Alt (small) and Shift (large) steps. Defaults per scale from the recipe. */
  step?: number;
  smallStep?: number;
  largeStep?: number;
  /** Limits (number and duration; a duration never goes below 0, a clock wraps). */
  min?: number;
  max?: number;
  /** Every change, live while dragging: the new words and their value. */
  onWordsChange?: (words: string, value: number) => void;
  /** Once per gesture (a drag that changed something, or a key press): the host's one undo step. */
  onWordsCommit?: (words: string, value: number) => void;
}

type Drag = { id: number; y: number; acc: number; px: number; moved: number; reading: MarkScrubReading; value: number; from: string; words: string; pinned: boolean };

const FACE = 'mu-cue-scrub-face inline-grid justify-items-start';
const SCALE = 'mu-cue-scrub-scale mark-scrub-scale';

/** A recognised number, duration or time you drag or step in place. Composes Mark; the words stay the source. */
export const MarkScrub = React.forwardRef<HTMLSpanElement, MarkScrubProps>(function MarkScrub(
  { children: words, scale = 'number', step, smallStep, largeStep, min, max, onWordsChange, onWordsCommit, label, className, style, onPointerDown, onKeyDown, ...props },
  ref,
) {
  const root = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(ref, () => root.current as HTMLSpanElement);
  const face = React.useRef<HTMLSpanElement>(null);
  const drag = React.useRef<Drag | null>(null);
  const [down, setDown] = React.useState(false);
  const [scrubbing, setScrubbing] = React.useState(false);
  const [hold, setHold] = React.useState<number>();
  const [moved, setMoved] = React.useState(0);
  const reading = markScrubRead(words, scale);
  const lo = scale === 'duration' ? (min ?? 0) : scale === 'clock' ? undefined : min;
  const hi = scale === 'clock' ? undefined : max;

  // While dragging, the words keep the widest width they've had (the drum's own measure of the new face).
  useIsoLayoutEffect(() => {
    if (!scrubbing) return;
    const w = face.current?.querySelector('.mu-swap-text-measure')?.getBoundingClientRect().width;
    if (w && w > (hold ?? 0)) setHold(w);
  });

  const cssStep = (key: 'step' | 'small' | 'large') => parseFloat(getComputedStyle(root.current as Element).getPropertyValue(`--mu-r-mark-scrub-${scale}-${key}`)) || 1;
  const amountFor = (e: { shiftKey: boolean; altKey: boolean }) =>
    e.shiftKey ? (largeStep ?? cssStep('large')) : e.altKey ? (smallStep ?? cssStep('small')) : (step ?? cssStep('step'));

  const move = (from: number, delta: number) => {
    const next = parseFloat((from + delta).toFixed(10));
    if (scale === 'clock') return ((next % DAY) + DAY) % DAY;
    return Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, next));
  };

  if (!reading) return <Mark ref={root} label={label} className={className} style={style} {...props}>{words}</Mark>;

  const keys = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const at = reading.value;
    let target: number | undefined;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') target = move(at, (e.key === 'ArrowUp' ? 1 : -1) * amountFor(e));
    else if (e.key === 'PageUp' || e.key === 'PageDown') target = move(at, (e.key === 'PageUp' ? 1 : -1) * (largeStep ?? cssStep('large')));
    else if (e.key === 'Home' && lo != null) target = lo;
    else if (e.key === 'End' && hi != null) target = hi;
    if (target === undefined) return;
    e.preventDefault();
    const up = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'End';
    if (target === at) { refuse(face.current, up ? 1 : -1); return; }
    const next = reading.write(target);
    setDown(!up);
    onWordsChange?.(next, target);
    onWordsCommit?.(next, target);
  };

  const press = (e: React.PointerEvent<HTMLSpanElement>) => {
    onPointerDown?.(e);
    if (e.defaultPrevented || e.button !== 0) return;
    const el = e.currentTarget;
    e.preventDefault(); // no text selection; focus by hand, without the keyboard's ring
    el.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    el.setPointerCapture(e.pointerId);
    const px = parseFloat(getComputedStyle(el).getPropertyValue('--mu-r-mark-scrub-scrub-pixels')) || 4;
    drag.current = { id: e.pointerId, y: e.clientY, acc: 0, px, moved: 0, reading, value: reading.value, from: words, words, pinned: false };
    setHold(face.current?.getBoundingClientRect().width);
    setMoved(0);
    setScrubbing(true);
  };

  const pull = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    d.acc += d.y - e.clientY;
    d.y = e.clientY;
    const n = Math.trunc(d.acc / d.px);
    if (!n) return;
    d.acc -= n * d.px;
    const next = move(d.value, n * amountFor(e));
    if (next === d.value) {
      if (!d.pinned) refuse(face.current, n > 0 ? 1 : -1);
      d.pinned = true;
      return;
    }
    d.pinned = false;
    d.moved += n;
    d.value = next;
    d.words = d.reading.write(next);
    setDown(n < 0);
    setMoved(d.moved);
    haptic('detent');
    onWordsChange?.(d.words, next);
  };

  const release = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setScrubbing(false);
    setHold(undefined);
    if (d.words !== d.from) onWordsCommit?.(d.words, d.value);
  };

  return (
    <Mark
      ref={root}
      role="spinbutton"
      tabIndex={0}
      aria-label={props['aria-label'] ?? label ?? NAMES[scale]}
      aria-valuenow={reading.value}
      aria-valuetext={props['aria-valuetext'] ?? words}
      aria-valuemin={lo}
      aria-valuemax={hi}
      data-scrubbing={scrubbing ? '' : undefined}
      label={label}
      className={['mark-scrub', down && 'swap-down', className].filter(Boolean).join(' ')}
      style={style}
      onPointerDown={press}
      onPointerMove={pull}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={keys}
      {...props}
    >
      <span ref={face} className={FACE} style={{ minWidth: hold }}><SwapText value={words} /></span>
      <span aria-hidden className={SCALE} style={{ '--mu-scrub-offset': `calc(${-(moved % 5)} * var(--mu-r-mark-scrub-scale-tick))` } as React.CSSProperties} />
    </Mark>
  );
});
