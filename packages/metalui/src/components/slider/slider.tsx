'use client';

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { useDirection } from '@base-ui/react/direction-provider';
import { Well } from '../well/well';
import { SwapText } from '../../motion/swap';
import { refuse } from '../../motion/refuse';
import { haptic } from '../../motion/haptic';

/* ─────────────────────────────────────────────────────────
 * SLIDER on Base UI Slider
 *
 *   [start glyph]  ═══════●───────  [end glyph]  [value]
 *                  │    │    │    │
 *                  0   25   50   75
 *
 *   track    a well (the track well): 6 / 10 / 14 tall for compact / regular / large
 *   fill     the green intent fill at full strength up to the knob, its edge an inset hairline;
 *            tone="ink": the same fill in ink, for a slider that is not an amount someone set
 *   marks    notches cut across the groove (steps, detents, moments)
 *   ticks    a short line under the groove and its label in the meta type at ink2: readable on any
 *            stage, never the engraved ink3
 *   knob     a knurled, anodized knob, 16 / 22 / 28 across; arrows step, Shift steps large
 *   glyphs   optional glyphs at the ends (volume low / high, zoom out / in), at ink2; each plays its
 *            act when the value arrives at its end
 *   value    an optional readout beside it (format → "40 %"); its digits turn on the drum, and it
 *            keeps the width of its widest value so the groove never shifts under the finger
 *   bubble   optional: while a knob is dragged, its value on the tooltip's chip over it
 *   width    full width of its container by default; `width` sets it (px or any CSS length)
 *
 * KINDS (props on one slider; the groove, travel and motion are shared)
 *   range     value=[lo, hi]: two knobs, the fill between them; the readout says "lo–hi"
 *   vertical  orientation="vertical": the minimum at the bottom, ↑ increases; glyphs above and
 *             below, the value on top, ticks to the end side; `height` (the recipe's length)
 *   detents   a notch at every step; the knob clicks stop to stop on the part spring even while
 *             dragged, and each stop plays the detent haptic
 *   centred   origin={0}: the fill grows from the origin's notch to the knob, either way
 *
 * GEOMETRY (one travel for everything)
 *   groove   the full length of the control, W
 *   knob     K across; its centre travels K/2 … W − K/2, so at 0 and 100 it sits flush with the
 *            groove's rounded ends and never hangs outside it (Base UI thumbAlignment="edge")
 *   fill     from the groove's start (or the lower knob, or the origin) to the knob's centre
 *   marks    on the same travel (half a knob in from each end), so a mark, a tick, the fill's
 *   ticks    end and the knob's centre line up at every value
 *   rtl      logical insets: the groove mirrors with the page (dir="rtl" and Base UI's
 *            DirectionProvider, which turns the arrows)
 *
 * MOTION (each knob rides its fraction, --mu-slider-at; the fill rides --mu-slider-lo … -hi)
 *   jump     a click or a key: the fractions ride the part spring (they may overshoot mid-travel,
 *            but each is clamped to the travel, so at an end the knob stops flush against it)
 *   drag     no transition: the knob and the fill follow the pointer 1:1 (detents: the spring)
 *   value    the readout turns on the drum (settle spring) with every change
 *   reduced  the spring's duration is 0: a jump lands at once; the drum crossfades
 *
 * STATES (the knob's face; the knob's box never changes size, so Base UI measures it true)
 *   rest      the knurled face, a small drop shadow
 *   hover     over the groove: the knob lifts ×1.08 with a longer shadow (settle spring)
 *   pressed   pressing or dragging: the knob presses ×0.94 with a tight shadow; the fill follows 1:1
 *   focus     from the keyboard: the green ring around the knob
 *   disabled  40 %, no pointer: no hover, no press, no keys
 *   refused   a key pushing past an end: the groove and knob nudge one nest toward that end (left
 *             in rtl for the maximum, up when vertical) and ring back on the refusal spring.
 *             Reduce Motion: no nudge.
 *
 * Two ways to use it: <Slider value … /> draws the groove, knob, marks and ticks from props; or
 * compose the parts inside it (Slider.Track, Slider.Marks, Slider.Ticks, Slider.Knob) for a host
 * that draws its own scale (the time scrubber).
 * Slots: Slider.Root, Slider.Track, Slider.Marks, Slider.Ticks, Slider.Knob.
 * ───────────────────────────────────────────────────────── */

export type SliderSize = 'compact' | 'regular' | 'large';
export type SliderOrientation = 'horizontal' | 'vertical';
export type SliderTone = 'green' | 'ink';
/** One value, or a range: [lower, upper]. */
export type SliderValue = number | [number, number];

export interface SliderRootProps<V extends SliderValue = number> {
  /** One knob, or two for a range ([lower, upper]). */
  value: V;
  min: number;
  max: number;
  step?: number;
  largeStep?: number;
  onValueChange: (value: V) => void;
  /** compact (6 groove, 16 knob), regular (10, 22, the default) or large (14, 28). */
  size?: SliderSize;
  /** horizontal (the default) or vertical: the minimum at the bottom. */
  orientation?: SliderOrientation;
  /** Horizontal: full width of its container by default; a number is px, a string any CSS length. */
  width?: number | string;
  /** Vertical: the recipe's length (160) by default; a number is px, a string any CSS length. */
  height?: number | string;
  /** A glyph at the start and at the end (from '@unlocalhosted/metalui/icons'); decorative. */
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /** Show the value beside the groove, written by `format`. */
  showValue?: boolean;
  /** While a knob is dragged, its value on a chip over it. */
  bubble?: boolean;
  /** Writes the value for the readout, the bubble and assistive tech ("40 %"). */
  format?: (value: number) => string;
  /** Notches in the groove, at these values (steps, detents, moments). */
  marks?: number[];
  /** Labelled ticks under the groove (beside it when vertical), at these values. */
  ticks?: { value: number; label: React.ReactNode }[];
  /** A notch at every step; the knob clicks from stop to stop, even while dragged. */
  detents?: boolean;
  /** The value the fill grows from (a centred slider: balance, an offset); a notch marks it. */
  origin?: number;
  /** green (the default: an amount someone set) or ink. */
  tone?: SliderTone;
  /** Names the knob (a range's knobs are "…, minimum" and "…, maximum"). */
  'aria-label'?: string;
  /** Dims it to 40 % and takes no pointer or keys. */
  disabled?: boolean;
  className?: string;
  /** Parts, for a host that composes its own slider; left out, the props above draw it. */
  children?: React.ReactNode;
}

/* Each animated fraction is a registered number, so it transitions (and each frame is clamped where
 * it is read). Registered once per document; a second registration (hot reload) throws and is fine. */
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  for (const name of ['--mu-slider-at', '--mu-slider-lo', '--mu-slider-hi']) {
    try {
      CSS.registerProperty({ name, syntax: '<number>', inherits: true, initialValue: '0' });
    } catch {
      /* already registered */
    }
  }
}

/* Styled with the theme's utilities (the slider recipe on the track well). The root is a row (a column,
 * reversed, when vertical): glyphs and the value beside the control; the control fills the rest and
 * the groove sits on its centre line. A size sets the groove and knob together. */
const ROOT = 'mu-slider group/slider relative type-meta touch-none transition-slider data-disabled:opacity-slider-disabled data-disabled:pointer-events-none';
const ROOT_H = 'flex items-center w-full max-w-full h-full slider-gap';
const ROOT_V = 'inline-flex flex-col-reverse items-center slider-v-gap slider-v-length';
const SIZES: Record<SliderSize, string> = { compact: 'slider-compact', regular: 'slider-regular', large: 'slider-large' };
const CONTROL = 'mu-slider-control group/control relative touch-none cursor-pointer';
const CONTROL_H = 'flex-1 self-stretch min-w-0 slider-control-box';
const CONTROL_V = 'flex-1 min-h-0 slider-v-control-box';
const GLYPH = 'mu-slider-icon mu-icon-trigger inline-grid flex-none place-items-center text-ink2 [&>svg]:slider-glyph';
const VALUE = 'mu-slider-value inline-grid flex-none type-figure text-ink';
const VALUE_H = 'justify-items-end';
const VALUE_V = 'justify-items-center';
const VALUE_CELL = 'col-start-1 row-start-1';
/* Base UI positions the track relative, so the place utilities offset it: across the control's centre line. */
const TRACK = 'mu-slider-track';
const TRACK_H = 'slider-track-place';
const TRACK_V = 'h-full slider-v-track-place';
const FILL = 'mu-slider-fill rounded-pill recipe-slider-fill';
const FILL_H = 'h-full slider-fill-along';
const FILL_V = 'w-full slider-v-fill-along';
const FILL_INK = 'recipe-slider-fill-ink';
const MARKS = 'mu-slider-marks absolute pointer-events-none';
const MARKS_H = 'slider-travel slider-marks-place';
const MARKS_V = 'slider-v-travel slider-v-track-place';
const MARK = 'absolute rounded-slider-mark-radius bg-slider-mark-color';
const MARK_H = 'top-0 h-full w-slider-mark-w -translate-x-1/2 rtl:translate-x-1/2';
const MARK_V = 'left-0 w-full h-slider-mark-w translate-y-1/2';
const TICKS = 'mu-slider-ticks absolute pointer-events-none';
const TICKS_H = 'slider-travel slider-ticks-place';
const TICKS_V = 'slider-v-travel slider-v-ticks-place';
const TICK = 'absolute flex items-center gap-slider-tick-gap type-meta text-ink2 whitespace-nowrap';
const TICK_H = 'flex-col -translate-x-1/2 rtl:translate-x-1/2';
const TICK_V = 'flex-row translate-y-1/2';
const TICK_LINE = 'block bg-slider-tick-color';
const TICK_LINE_H = 'w-slider-tick-w h-slider-tick-h';
const TICK_LINE_V = 'h-slider-tick-w w-slider-tick-h';
const KNOB = 'mu-slider-knob group/knob slider-knob-box rounded-round cursor-grab transition-slider group-data-dragging/slider:cursor-grabbing has-focus-visible:focus-ring';
const KNOB_H = 'top-1/2 slider-knob-along';
const KNOB_V = 'left-1/2 slider-v-knob-along';
/** A plain knob follows the hand 1:1 while dragged; a detented one keeps its spring (the click). */
const KNOB_FOLLOW = 'group-data-dragging/slider:transition-none';
/* The face carries the metal and moves: it lifts on hover and presses while held or dragged. It grows
 * away from the nearer end (its origin follows the value), so even lifted it never pokes past the groove. */
const FACE = 'mu-slider-knob-face pointer-events-none absolute inset-0 rounded-round recipe-slider-knob transition-slider-knob group-hover/control:slider-knob-lift group-hover/control:recipe-slider-knob-hover group-active/control:slider-knob-press! group-active/control:recipe-slider-knob-press! group-data-dragging/slider:slider-knob-press! group-data-dragging/slider:recipe-slider-knob-press!';
const FACE_H = 'slider-knob-origin';
const FACE_V = 'slider-v-knob-origin';
/* The bubble: the tooltip's chip over the knob (on the start side when vertical), only on the knob
 * being dragged; it fades and grows in on the settle spring. */
const BUBBLE = 'mu-slider-bubble pointer-events-none absolute z-10 whitespace-nowrap px-slider-bubble-pad-x py-slider-bubble-pad-y rounded-slider-bubble-radius recipe-tooltip text-tooltip-ink type-figure transition-slider-bubble slider-bubble-rest group-data-dragging/slider:group-data-active/knob:slider-bubble-shown';
const BUBBLE_H = 'slider-bubble-place';
const BUBBLE_V = 'slider-v-bubble-place';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

interface SliderState {
  /** Each knob's fraction of the travel. */
  at: number[];
  vertical: boolean;
  between: boolean;
  tone: SliderTone;
  detents: boolean;
  /** The knob last moved: the one a bubble stands over. */
  active: number;
  /** The bubble's words for a knob, when there is a bubble. */
  bubble?: (index: number) => string;
  onKeyDown?: (index: number) => (e: React.KeyboardEvent) => void;
}

/** What the parts need from their slider. */
const SliderContext = React.createContext<SliderState>({ at: [0], vertical: false, between: false, tone: 'green', detents: false, active: 0 });

/** Which way a key moves a value: +1 toward the maximum, −1 toward the minimum (← → turn in rtl). */
const KEYS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, End: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1, Home: -1 };

/** Detents notch every step, up to this many; past it a stop is too fine to feel. */
const MAX_DETENTS = 24;

/** Plays a glyph's act (its hover or press motion) as if it had been pressed. */
function play(el: HTMLElement | null) {
  if (!el) return;
  el.dispatchEvent(new Event('click'));
  el.dispatchEvent(new Event('pointerdown'));
}

function Root<V extends SliderValue = number>(props: SliderRootProps<V>) {
  const { min, max, step, largeStep, size = 'regular', orientation = 'horizontal', width, height, startIcon, endIcon, showValue, bubble, format, marks, ticks, detents = false, origin, tone = 'green', 'aria-label': label, disabled, className, children } = props;
  const value: SliderValue = props.value;
  const values: number[] = typeof value === 'number' ? [value] : [...value];
  const range = values.length > 1;
  const vertical = orientation === 'vertical';
  const rtl = useDirection() === 'rtl';
  const span = max - min;
  const frac = (v: number) => (span > 0 ? Math.min(1, Math.max(0, (v - min) / span)) : 0);
  const at = values.map(frac);
  const first = at[0];
  const last = at[at.length - 1];
  const o = range || origin === undefined ? undefined : frac(origin);
  const lo = range ? first : o !== undefined ? Math.min(o, first) : 0;
  const hi = range ? last : o !== undefined ? Math.max(o, first) : first;
  const between = range || o !== undefined;
  const [active, setActive] = React.useState(0);
  const control = React.useRef<HTMLDivElement>(null);
  const start = React.useRef<HTMLSpanElement>(null);
  const end = React.useRef<HTMLSpanElement>(null);
  // At an end, that end's glyph plays its act: once as the value arrives, never on mount.
  const was = React.useRef([first, last]);
  React.useEffect(() => {
    if (first === 0 && was.current[0] !== 0) play(start.current);
    if (last === 1 && was.current[1] !== 1) play(end.current);
    was.current = [first, last];
  }, [first, last]);
  // Detents: each stop the value lands on plays the detent haptic, once (never on mount).
  const key = values.join();
  const landed = React.useRef(key);
  React.useEffect(() => {
    if (detents && landed.current !== key) haptic('detent');
    landed.current = key;
  }, [key, detents]);
  // A key that pushes past an end is refused: the value was already there when the key went down.
  // It rides on the knob's input (Base UI keeps its keys from bubbling), before Base UI moves it. The
  // nudge goes toward the end pushed: right for the maximum (left in rtl), up when vertical.
  const onKeyDown = (index: number) => (e: React.KeyboardEvent) => {
    const sign = KEYS[e.key];
    if (!sign) return;
    const toward = rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -sign : sign;
    if (toward > 0 ? at[index] < 1 : at[index] > 0) return;
    if (vertical) refuse(control.current, toward > 0 ? -1 : 1, 'y');
    else refuse(control.current, (rtl ? -toward : toward) as 1 | -1);
  };
  const write = format ?? String;
  const context = React.useMemo<SliderState>(
    () => ({ at, vertical, between, tone, detents, active, bubble: bubble ? (i: number) => write(values[i]) : undefined, onKeyDown }),
    [key, vertical, between, tone, detents, active, bubble, rtl], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Detents and the origin are notches too: every step strictly inside, and the origin.
  const s = step ?? 1;
  const count = s > 0 ? Math.round(span / s) : 0;
  const stops = detents && count > 1 && count <= MAX_DETENTS ? Array.from({ length: count - 1 }, (_, i) => min + (i + 1) * s) : [];
  const notches = [...(marks ?? []), ...stops, ...(o !== undefined && origin !== undefined ? [origin] : [])];
  const own = cx(ROOT, vertical ? ROOT_V : ROOT_H, SIZES[size], !detents && 'data-dragging:transition-none', between && 'slider-between', !!ticks?.length && (vertical ? 'slider-v-ticks-room' : 'slider-ticks-room'), className);
  const length = vertical ? (height !== undefined ? { height } : null) : width !== undefined ? { width } : null;
  const style: React.CSSProperties = { ...length, ['--mu-slider-lo' as string]: lo, ['--mu-slider-hi' as string]: hi };
  const names = range ? [`${label ?? 'Value'}, minimum`, `${label ?? 'Value'}, maximum`] : [label ?? 'Value'];
  const valueText = format ? (_: string, v: number) => format(v) : undefined;
  return (
    <BaseSlider.Root
      thumbAlignment="edge"
      style={style}
      data-size={size}
      data-tone={tone}
      orientation={orientation}
      disabled={disabled}
      value={range ? values : values[0]}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      onValueChange={(v, details) => {
        setActive(details.activeThumbIndex);
        (props.onValueChange as (next: SliderValue) => void)(Array.isArray(v) ? [v[0], v[1]] : (v as number));
      }}
      className={own}
    >
      {startIcon && <span ref={start} className={GLYPH} aria-hidden>{startIcon}</span>}
      <BaseSlider.Control ref={control} className={cx(CONTROL, vertical ? CONTROL_V : CONTROL_H)}>
        <SliderContext.Provider value={context}>
          {children ?? (
            <>
              <Track />
              {notches.length ? <Marks at={notches.map(frac)} /> : null}
              {ticks?.length ? <Ticks ticks={ticks.map((t) => ({ at: frac(t.value), label: t.label }))} /> : null}
              {names.map((name, i) => <Knob key={i} index={range ? i : undefined} aria-label={name} getAriaValueText={valueText} />)}
            </>
          )}
        </SliderContext.Provider>
      </BaseSlider.Control>
      {endIcon && <span ref={end} className={GLYPH} aria-hidden>{endIcon}</span>}
      {showValue && <Value className={vertical ? VALUE_V : VALUE_H}text={values.map(write).join('–')} measure={measure(values.length, min, max, s, write)} />}
    </BaseSlider.Root>
  );
}

/** A few values are all measured (words: Draft … Best); many, only the ends (numbers grow toward them). */
const MEASURE_ALL = 24;

/** The texts the readout must have room for: every step when there are few, else the ends; a range's
 *  readout is two of them joined. */
function measure(knobs: number, min: number, max: number, step: number, write: (v: number) => string) {
  const count = step > 0 ? Math.floor((max - min) / step) : 0;
  const each = knobs === 1 && count > 0 && count <= MEASURE_ALL ? Array.from({ length: count + 1 }, (_, i) => min + i * step) : [min, max];
  return each.map((v) => Array.from({ length: knobs }, () => write(v)).join('–'));
}

/** The value beside the groove. It reserves the width of its widest value, so the groove never moves
 *  as the digits change; the digits turn on the drum. The knob already says the value to assistive
 *  tech, so the readout is hidden from it. */
function Value({ text, measure, className }: { text: string; measure: string[]; className?: string }) {
  return (
    <span className={cx(VALUE, className)} aria-hidden>
      {measure.map((m, i) => <span key={i} className={`${VALUE_CELL} invisible`}>{m}</span>)}
      <SwapText className={VALUE_CELL} value={text} />
    </span>
  );
}

/** The track well and its fill (from the start, or between the knobs, or from the origin). */
function Track() {
  const { vertical, tone } = React.useContext(SliderContext);
  return (
    <BaseSlider.Track render={<Well variant="track" radius="pill" />} className={cx(TRACK, vertical ? TRACK_V : TRACK_H)}>
      <BaseSlider.Indicator className={cx(FILL, vertical ? FILL_V : FILL_H, tone === 'ink' && FILL_INK)} />
    </BaseSlider.Track>
  );
}

/** Notches cut across the groove, at fractions 0…1 of the travel (steps, detents, moments). */
function Marks({ at }: { at: number[] }) {
  const { vertical } = React.useContext(SliderContext);
  return (
    <div className={cx(MARKS, vertical ? MARKS_V : MARKS_H)} aria-hidden>
      {at.map((f, i) => (
        <i key={i} className={cx(MARK, vertical ? MARK_V : MARK_H)} style={{ [vertical ? 'bottom' : 'insetInlineStart']: `${(f * 100).toFixed(2)}%` }} />
      ))}
    </div>
  );
}

/** Labelled ticks under the groove (beside it when vertical): { at: 0…1, label }. A plain label is set
 *  in the meta type at ink2, on the knob's travel; a caller's own node (a Label) styles itself. */
function Ticks({ ticks }: { ticks: { at: number; label: React.ReactNode }[] }) {
  const { vertical } = React.useContext(SliderContext);
  return (
    <div className={cx(TICKS, vertical ? TICKS_V : TICKS_H)} aria-hidden>
      {ticks.map((t, i) => (
        <span key={i} className={cx(TICK, vertical ? TICK_V : TICK_H)} style={{ [vertical ? 'bottom' : 'insetInlineStart']: `${(t.at * 100).toFixed(2)}%` }}>
          <i className={cx(TICK_LINE, vertical ? TICK_LINE_V : TICK_LINE_H)} />
          {t.label}
        </span>
      ))}
    </div>
  );
}

interface SliderKnobProps {
  'aria-label': string;
  getAriaValueText?: (formatted: string, value: number, index: number) => string;
  /** A range's knob: 0 the lower, 1 the upper. */
  index?: number;
}

function Knob({ index, ...props }: SliderKnobProps) {
  const { at, vertical, detents, active, bubble, onKeyDown } = React.useContext(SliderContext);
  const i = index ?? 0;
  return (
    <BaseSlider.Thumb
      {...(index !== undefined ? { index } : null)}
      className={cx(KNOB, vertical ? KNOB_V : KNOB_H, !detents && KNOB_FOLLOW)}
      style={{ '--mu-slider-at': at[i] ?? 0 } as React.CSSProperties}
      data-active={active === i || undefined}
      onKeyDown={onKeyDown?.(i)}
      {...props}
    >
      <span className={cx(FACE, vertical ? FACE_V : FACE_H)} aria-hidden />
      {bubble && <span className={cx(BUBBLE, vertical ? BUBBLE_V : BUBBLE_H)} aria-hidden>{bubble(i)}</span>}
    </BaseSlider.Thumb>
  );
}

export const Slider = Object.assign(Root, { Root, Track, Marks, Ticks, Knob });
