'use client';

import * as React from 'react';
import { Mark, markTagHue, type MarkProps } from '../mark/mark';
import { SwapText } from '../../motion/swap';
import { haptic } from '../../motion/haptic';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * MARK SCRUB, a value inside the text that you change in place: a number, a duration, a time of
 * day, a day, a state or a colour
 *
 *   rest      the Mark exactly (its glyph, line and chip); the cursor says ns-resize
 *   hover     the line thickens (hover.line, a scale: nothing reflows); the first hover on a host
 *             says "Drag to change" in the chip, once
 *   press     the words take focus; no text selection starts
 *   drag      up raises, down lowers: one detent per <scale>.pixels (else scrub.pixels) of travel;
 *             Shift takes the large step, Alt the small, read at each detent. Each detent:
 *     0ms       the words are rewritten (onWordsChange); the face turns on the drum, up or down
 *     0ms       the scale beside the words moves one tick with the hand; the detent haptic plays
 *   sideways  a duration says its amount the other way ("90 min" ↔ "1h30") per unit.pixels of travel
 *   hold      a press held for press.hold with no detent asks the host for its picker (onPick: a
 *             Calendar for a day, in the host's Popover anchored to the words); the drag ends there
 *   width     while dragging the words keep the widest width of the gesture; the hold drops on release
 *   scale     an engraved ruler (the groove's ink and lip), only while dragging; an enum shows its
 *             neighbouring states instead, peeking above and below the words
 *   release   one commit (onWordsCommit) when the words changed: the host's one undo step
 *   keys      ↑ ↓ step (Shift large, Alt small), Page Up / Down large, Home / End to the limits,
 *             Space the next state (enum), U the other unit (duration), Enter asks for the picker;
 *             each press is one change and one commit
 *   limit     a push past min or max shakes only the words, once per push (refusal)
 * The words are the value: the scale reads it from them and rewrites only the part that carries it
 * ("tomorrow 4pm" keeps "4pm" while its day turns). Scales: number; duration (minutes, never below 0);
 * clock (minutes after midnight, wrapping); day (days from today); enum (an index into `options`,
 * wrapping); hue (degrees, wrapping). Reduce Motion: the drum crossfades; the scale comes and goes at once.
 * ───────────────────────────────────────────────────────── */

export type MarkScrubScale = 'number' | 'duration' | 'clock' | 'day' | 'enum' | 'hue';

/** The value a scale reads in the words, and how to write another value back into the same words. */
export interface MarkScrubReading {
  value: number;
  write: (value: number) => string;
  /** The scale goes round (a clock's 1440 minutes, a hue's 360 degrees, an enum's states). */
  wrap?: number;
  /** The same amount said in its other unit ("90 min" ↔ "1h30"), when the scale has one. */
  cycle?: () => string;
}

export interface MarkScrubReadOptions {
  /** An enum's states, in order: ["todo", "doing", "done", "dropped"]. */
  options?: readonly string[];
  /** A day's "today" (default: now). */
  today?: Date;
}

const NUMBER = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/;
const DURATION = /(\d+)\s*h(?:\s*(\d{1,2})\s*(?:min|m)?)?(?![a-z])|(\d+)(\s*)(min|m)\b/i;
const CLOCK = /(\d{1,2})(?::(\d{2}))?(\s?)(am|pm)\b|(\d{1,2}):(\d{2})/i;
const DAYS = /\b(yesterday|today|tomorrow)\b|\b(next\s+)?(sun|mon|tues|wednes|thurs|fri|satur)day\b|\b(?:(?:sun|mon|tue|wed|thu|fri|sat)\s+)?(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
const HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i;
const MINUTES = 1440;
const WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const RELATIVE = ['yesterday', 'today', 'tomorrow'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const places = (s: string) => (s.split('.')[1] ?? '').length;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const dayNumber = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Reads the value in `words` on `scale`, or null when the words carry none. */
export function markScrubRead(words: string, scale: MarkScrubScale = 'number', opts: MarkScrubReadOptions = {}): MarkScrubReading | null {
  let re = scale === 'number' ? NUMBER : scale === 'duration' ? DURATION : scale === 'clock' ? CLOCK : scale === 'day' ? DAYS : HEX;
  if (scale === 'enum') {
    if (!opts.options?.length) return null;
    re = new RegExp(`(?<![\\w-])(?:${[...opts.options].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\w-])`, 'i');
  }
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
    const hours = (v: number) => `${Math.floor(v / 60)}h${v % 60 ? pad2(v % 60) : ''}`;
    const value = minutesOnly ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2] ?? 0);
    return {
      value,
      // Minutes stay minutes ("45 min" → "50 min"); hours are written "1h05", or minutes alone under an hour.
      write: (v) => put(minutesOnly ? `${v}${m[4]}${m[5]}` : v >= 60 ? hours(v) : `${v}min`),
      cycle: () => put(minutesOnly ? hours(value) : `${value} min`),
    };
  }

  if (scale === 'clock') {
    const twelve = m[4] != null;
    const value = twelve ? ((Number(m[1]) % 12) + (m[4].toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(m[2] ?? 0) : Number(m[5]) * 60 + Number(m[6]);
    return {
      value,
      wrap: MINUTES,
      write: (v) => {
        const at = ((v % MINUTES) + MINUTES) % MINUTES, h = Math.floor(at / 60), min = at % 60;
        if (!twelve) return put(`${m[5].length === 2 ? pad2(h) : h}:${pad2(min)}`);
        const ap = h < 12 ? 'am' : 'pm';
        return put(`${h % 12 || 12}${min || m[2] ? `:${pad2(min)}` : ''}${m[3]}${m[4] === m[4].toUpperCase() ? ap.toUpperCase() : ap}`);
      },
    };
  }

  if (scale === 'day') {
    const today = opts.today ?? new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let value: number;
    if (m[1]) value = RELATIVE.indexOf(m[1].toLowerCase()) - 1;
    else if (m[3]) {
      const want = WEEK.findIndex((w) => w.startsWith(m[3].toLowerCase()));
      const ahead = (want - base.getDay() + 7) % 7;
      value = m[2] ? ahead + 7 : ahead || 7;
    } else {
      // "Fri 16 Oct": the year that puts it nearest today.
      const month = MONTHS.indexOf(m[5].toLowerCase());
      const near = [-1, 0, 1].map((y) => dayNumber(new Date(base.getFullYear() + y, month, Number(m[4]))) - dayNumber(base));
      value = near.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a));
    }
    // "Tomorrow" and "Next Friday" keep their capital; a weekday or a date can't say, so words go lower case.
    const upper = /^[A-Z]/.test(m[1] ?? m[2] ?? '');
    return {
      value,
      // Words while words say it ("yesterday" … "tomorrow", "Friday", "next Friday"), then the date ("Fri 16 Oct").
      write: (v) => {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + v);
        const weekday = cap(WEEK[d.getDay()]);
        if (v >= -1 && v <= 1) return put(upper ? cap(RELATIVE[v + 1]) : RELATIVE[v + 1]);
        if (v >= 2 && v <= 6) return put(weekday);
        if (v >= 7 && v <= 13) return put(`${upper ? 'Next' : 'next'} ${weekday}`);
        return put(`${weekday.slice(0, 3)} ${d.getDate()} ${cap(MONTHS[d.getMonth()])}`);
      },
    };
  }

  if (scale === 'enum') {
    const options = opts.options as readonly string[];
    return {
      value: options.findIndex((o) => o.toLowerCase() === m[0].toLowerCase()),
      wrap: options.length,
      write: (v) => put(options[((v % options.length) + options.length) % options.length]),
    };
  }

  // hue: the hex's place on the colour wheel; saturation and lightness stay as written.
  const hex = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), c = hi - lo, l = (hi + lo) / 2;
  const s = c ? c / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !c ? 0 : hi === r ? ((g - b) / c) % 6 : hi === g ? (b - r) / c + 2 : (r - g) / c + 4;
  const upper = !/[a-f]/.test(m[1]);
  return {
    value: (h * 60 + 360) % 360,
    wrap: 360,
    write: (v) => {
      const k = (n: number) => (n + v / 30) % 12;
      const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
      const out = [0, 8, 4].map((n) => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('');
      return put(`#${upper ? out.toUpperCase() : out}`);
    },
  };
}

const NAMES: Record<MarkScrubScale, string> = { number: 'Number', duration: 'Duration', clock: 'Time', day: 'Day', enum: 'State', hue: 'Colour' };
const HINT_SEEN = 'mu-cue-hint';

/** A request for the long jump: where to anchor the host's popover, the value now, its words, and a way to
 *  choose another (written back as words, one commit). */
export interface MarkScrubPick {
  anchor: HTMLSpanElement;
  value: number;
  words: string;
  choose: (value: number) => void;
}

export interface MarkScrubProps extends Omit<MarkProps, 'children'> {
  /** The words as written ("6h", "$40", "tomorrow", "#done"). They are the value: rewrite them from onWordsChange. */
  children: string;
  /** How the words carry the value: number (default), duration, clock, day, enum (with `options`) or hue. */
  scale?: MarkScrubScale;
  /** An enum's states, in order. */
  options?: readonly string[];
  /** A day's "today" (default: now). */
  today?: Date;
  /** A detent's step, and the Alt (small) and Shift (large) steps. Defaults per scale from the recipe. */
  step?: number;
  smallStep?: number;
  largeStep?: number;
  /** Limits (number, duration, day; a duration never goes below 0; a clock, an enum and a hue wrap). */
  min?: number;
  max?: number;
  /** The long jump, asked for by a held press or Enter: the host opens its own Popover at `anchor` (a Calendar
   *  for a day) and calls `choose`. The cue ships no popover. */
  onPick?: (pick: MarkScrubPick) => void;
  /** The first hover on a host says this in the chip, once ("Drag to change"); false for never. */
  hint?: string | false;
  /** Every change, live while dragging: the new words and their value. */
  onWordsChange?: (words: string, value: number) => void;
  /** Once per gesture (a drag that changed something, a key press, a pick): the host's one undo step. */
  onWordsCommit?: (words: string, value: number) => void;
}

type Drag = {
  id: number; x: number; y: number; acc: number; across: number; px: number; moved: number; cycled: boolean;
  reading: MarkScrubReading; value: number; from: string; words: string; pinned: boolean; timer?: number;
};

const FACE = 'mu-cue-scrub-face relative inline-grid justify-items-start';
const SCALE = 'mu-cue-scrub-scale mark-scrub-scale';
const PEEK = 'mu-cue-scrub-peek mark-scrub-peek';

function readMs(el: Element, name: string, fallback: number) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? (raw.endsWith('ms') ? n : n * 1000) : fallback;
}

function hintSeen() {
  try { return localStorage.getItem(HINT_SEEN) != null; } catch { return true; }
}
function seeHint() {
  try { localStorage.setItem(HINT_SEEN, '1'); } catch { /* storage blocked: the hint just shows again */ }
}

/** A recognised value you drag or step in place. Composes Mark; the words stay the source. */
export const MarkScrub = React.forwardRef<HTMLSpanElement, MarkScrubProps>(function MarkScrub(
  {
    children: words, scale = 'number', options, today, step, smallStep, largeStep, min, max, onPick, hint = 'Drag to change',
    onWordsChange, onWordsCommit, kind, label, resolved, color, className, style, onPointerDown, onKeyDown, onPointerEnter, onPointerLeave, ...props
  },
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
  const [hinting, setHinting] = React.useState(false);
  const reading = markScrubRead(words, scale, { options, today });
  const wrap = reading?.wrap;
  const lo = scale === 'enum' ? 0 : wrap ? undefined : scale === 'duration' ? (min ?? 0) : min;
  const hi = scale === 'enum' ? (wrap ?? 1) - 1 : wrap ? undefined : max;

  // While dragging, the words keep the widest width they've had (the drum's own measure of the new face).
  useIsoLayoutEffect(() => {
    if (!scrubbing) return;
    const at = (sel: string) => face.current?.querySelector(sel)?.getBoundingClientRect().width ?? 0;
    const w = at('.mu-swap-text-measure') + at('.mu-cue-hash');
    if (w && w > (hold ?? 0)) setHold(w);
  });
  React.useEffect(() => () => window.clearTimeout(drag.current?.timer), []);

  const tag = kind === 'tag' || kind === 'derived-tag';
  const vars = { ...(tag ? { '--mu-cue-tag-h': `var(--mu-r-mark-tag-hue-${markTagHue(words)})` } : {}), ...style } as React.CSSProperties;
  const own = { kind, color: color ?? (kind === 'hex' ? HEX.exec(words)?.[0] : undefined), className, style: vars };

  if (!reading) return <Mark ref={root} label={label} resolved={resolved} {...own} {...props}>{words}</Mark>;

  const cssNumber = (name: string) => parseFloat(getComputedStyle(root.current as Element).getPropertyValue(`--mu-r-mark-scrub-${name}`));
  const cssStep = (key: 'step' | 'small' | 'large') => cssNumber(`${scale}-${key}`) || 1;
  const amountFor = (e: { shiftKey: boolean; altKey: boolean }) =>
    e.shiftKey ? (largeStep ?? cssStep('large')) : e.altKey ? (smallStep ?? cssStep('small')) : (step ?? cssStep('step'));

  const move = (from: number, delta: number) => {
    const next = parseFloat((from + delta).toFixed(10));
    if (wrap) return ((next % wrap) + wrap) % wrap;
    return Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, next));
  };

  const commit = (next: string, value: number) => {
    onWordsChange?.(next, value);
    onWordsCommit?.(next, value);
  };

  const choose = (value: number) => {
    const next = reading.write(value);
    if (next !== words) commit(next, value);
  };
  const pick = () => onPick?.({ anchor: root.current as HTMLSpanElement, value: reading.value, words, choose });

  const unhint = () => {
    if (!hinting) return;
    seeHint();
    setHinting(false);
  };

  const keys = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    if (e.key === 'Enter' && onPick) { e.preventDefault(); pick(); return; }
    if ((e.key === 'u' || e.key === 'U') && reading.cycle) { e.preventDefault(); commit(reading.cycle(), reading.value); return; }
    const at = reading.value;
    let target: number | undefined;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') target = move(at, (e.key === 'ArrowUp' ? 1 : -1) * amountFor(e));
    else if (e.key === 'PageUp' || e.key === 'PageDown') target = move(at, (e.key === 'PageUp' ? 1 : -1) * (largeStep ?? cssStep('large')));
    else if (e.key === ' ' && scale === 'enum') target = move(at, 1);
    else if (e.key === 'Home' && lo != null) target = lo;
    else if (e.key === 'End' && hi != null) target = hi;
    if (target === undefined) return;
    e.preventDefault();
    const up = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'End' || e.key === ' ';
    if (target === at) { refuse(face.current, up ? 1 : -1); return; }
    setDown(!up);
    commit(reading.write(target), target);
  };

  const end = (d: Drag) => {
    window.clearTimeout(d.timer);
    drag.current = null;
    setScrubbing(false);
    setHold(undefined);
  };

  const press = (e: React.PointerEvent<HTMLSpanElement>) => {
    onPointerDown?.(e);
    if (e.defaultPrevented || e.button !== 0) return;
    const el = e.currentTarget;
    e.preventDefault(); // no text selection; focus by hand, without the keyboard's ring
    el.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    el.setPointerCapture(e.pointerId);
    seeHint();
    const px = cssNumber(`${scale}-pixels`) || cssNumber('scrub-pixels') || 4;
    const d: Drag = { id: e.pointerId, x: e.clientX, y: e.clientY, acc: 0, across: 0, px, moved: 0, cycled: false, reading, value: reading.value, from: words, words, pinned: false };
    // A press held with no detent is the long jump: the picker, anchored to the words.
    if (onPick) {
      d.timer = window.setTimeout(() => {
        if (drag.current !== d || d.moved || d.cycled) return;
        end(d);
        haptic('detent');
        pick();
      }, readMs(el, '--mu-r-mark-scrub-press-hold', 500));
    }
    drag.current = d;
    setHold(face.current?.getBoundingClientRect().width);
    setMoved(0);
    setScrubbing(true);
  };

  const pull = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    // Sideways: a duration says its amount in the other unit, once per unit.pixels.
    d.across += e.clientX - d.x;
    d.x = e.clientX;
    if (d.reading.cycle && Math.abs(d.across) >= (cssNumber('unit-pixels') || 24)) {
      d.across = 0;
      d.cycled = true;
      d.words = d.reading.cycle();
      d.reading = markScrubRead(d.words, scale, { options, today }) ?? d.reading;
      haptic('detent');
      onWordsChange?.(d.words, d.value);
    }
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
    end(d);
    if (d.words !== d.from) onWordsCommit?.(d.words, d.value);
  };

  const name = props['aria-label'] ?? label ?? NAMES[scale];
  const hash = tag && words.startsWith('#');
  const peek = scale === 'enum';

  return (
    <Mark
      ref={root}
      role="spinbutton"
      tabIndex={0}
      aria-label={name}
      aria-valuenow={parseFloat(reading.value.toFixed(2))}
      aria-valuetext={props['aria-valuetext'] ?? words}
      aria-valuemin={lo}
      aria-valuemax={hi}
      aria-haspopup={onPick ? 'dialog' : undefined}
      aria-keyshortcuts={[onPick && 'Enter', reading.cycle && 'U', scale === 'enum' && 'Space'].filter(Boolean).join(' ') || undefined}
      data-scrubbing={scrubbing ? '' : undefined}
      // While an enum's neighbours peek, the chip steps aside for them.
      data-peeking={peek && scrubbing ? '' : undefined}
      // The first hover on a host: the chip says how to change it, once.
      label={hinting ? (hint as string) : label}
      resolved={hinting ? undefined : resolved}
      {...own}
      className={['mark-scrub', down && 'swap-down', className].filter(Boolean).join(' ')}
      onPointerDown={press}
      onPointerMove={pull}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerEnter={(e) => { onPointerEnter?.(e); if (hint && !hintSeen()) setHinting(true); }}
      onPointerLeave={(e) => { onPointerLeave?.(e); unhint(); }}
      onKeyDown={keys}
      {...props}
    >
      <span ref={face} className={FACE} style={{ minWidth: hold }}>
        {hash ? <span className="inline-flex"><span className="mu-cue-hash">#</span><SwapText value={words.slice(1)} /></span> : <SwapText value={words} />}
        {peek && <span aria-hidden data-side="up" className={PEEK}>{reading.write(move(reading.value, 1))}</span>}
        {peek && <span aria-hidden data-side="down" className={PEEK}>{reading.write(move(reading.value, -1))}</span>}
      </span>
      {scale !== 'enum' && <span aria-hidden className={SCALE} style={{ '--mu-scrub-offset': `calc(${-(moved % 5)} * var(--mu-r-mark-scrub-scale-tick))` } as React.CSSProperties} />}
    </Mark>
  );
});
