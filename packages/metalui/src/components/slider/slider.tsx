'use client';

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { Well } from '../well/well';
import { SwapText } from '../../motion/swap';
import { refuse } from '../../motion/refuse';

/* ─────────────────────────────────────────────────────────
 * SLIDER on Base UI Slider
 *
 *   [start glyph]  ═══════●───────  [end glyph]  [value]
 *                  │    │    │    │
 *                  0   25   50   75
 *
 *   track    a well (the track well): 6 / 10 / 14 tall for compact / regular / large
 *   fill     the green intent fill at full strength up to the knob, its edge an inset hairline
 *   marks    notches cut across the groove (steps, detents, moments)
 *   ticks    a short line under the groove and its label in the meta type at ink2: readable on any
 *            stage, never the engraved ink3
 *   knob     a knurled, anodized knob, 16 / 22 / 28 across; arrows step, Shift steps large
 *   glyphs   optional glyphs at the ends (volume low / high, zoom out / in), at ink2; each plays its
 *            act when the value arrives at its end
 *   value    an optional readout beside it (format → "40 %"); its digits turn on the drum, and it
 *            keeps the width of its widest value so the groove never shifts under the finger
 *   width    full width of its container by default; `width` sets it (px or any CSS length)
 *
 * GEOMETRY (one travel for everything)
 *   groove   the full width of the control, W
 *   knob     K across; its centre travels K/2 … W − K/2, so at 0 and 100 it sits flush with the
 *            groove's rounded ends and never hangs outside it (Base UI thumbAlignment="edge")
 *   fill     from the groove's start to the knob's centre
 *   marks    on the same travel (half a knob in from each end), so a mark, a tick, the fill's
 *   ticks    end and the knob's centre line up at every value
 *
 * MOTION (one fraction, --mu-slider-at, drives the knob and the fill)
 *   jump     a click or a key: the fraction rides the part spring (it may overshoot mid-travel,
 *            but it is clamped to the travel, so at an end the knob stops flush against it)
 *   drag     no transition: the knob and the fill follow the pointer 1:1
 *   value    the readout turns on the drum (settle spring) with every change
 *   reduced  the spring's duration is 0: a jump lands at once; the drum crossfades
 *
 * STATES (the knob's face; the knob's box never changes size, so Base UI measures it true)
 *   rest      the knurled face, a small drop shadow
 *   hover     over the groove: the knob lifts ×1.08 with a longer shadow (settle spring)
 *   pressed   pressing or dragging: the knob presses ×0.94 with a tight shadow; the fill follows 1:1
 *   focus     from the keyboard: the green ring around the knob
 *   disabled  40 %, no pointer: no hover, no press, no keys
 *   refused   a key pushing past an end: the groove and knob nudge one nest that way and ring back
 *             on the refusal spring (the knob never leaves the groove). Reduce Motion: no nudge.
 *
 * Two ways to use it: <Slider value … /> draws the groove, knob, marks and ticks from props; or
 * compose the parts inside it (Slider.Track, Slider.Marks, Slider.Ticks, Slider.Knob) for a host
 * that draws its own scale (the time scrubber).
 * Slots: Slider.Root, Slider.Track, Slider.Marks, Slider.Ticks, Slider.Knob.
 * ───────────────────────────────────────────────────────── */

export type SliderSize = 'compact' | 'regular' | 'large';

export interface SliderRootProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  largeStep?: number;
  onValueChange: (value: number) => void;
  /** compact (6 groove, 16 knob), regular (10, 22, the default) or large (14, 28). */
  size?: SliderSize;
  /** Full width of its container by default; a number is px, a string any CSS length. */
  width?: number | string;
  /** A glyph at the start and at the end (from '@unlocalhosted/metalui/icons'); decorative. */
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /** Show the value beside the groove, written by `format`. */
  showValue?: boolean;
  /** Writes the value for the readout and for assistive tech ("40 %"). */
  format?: (value: number) => string;
  /** Notches in the groove, at these values (steps, detents, moments). */
  marks?: number[];
  /** Labelled ticks under the groove, at these values. */
  ticks?: { value: number; label: React.ReactNode }[];
  /** Names the knob. */
  'aria-label'?: string;
  /** Dims it to 40 % and takes no pointer or keys. */
  disabled?: boolean;
  className?: string;
  /** Parts, for a host that composes its own slider; left out, the props above draw it. */
  children?: React.ReactNode;
}

/* The animated fraction is a registered number, so it transitions (and each frame is clamped where
 * it is read). Registered once per document; a second registration (hot reload) throws and is fine. */
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  try {
    CSS.registerProperty({ name: '--mu-slider-at', syntax: '<number>', inherits: true, initialValue: '0' });
  } catch {
    /* already registered */
  }
}

/* Styled with the theme's utilities (the slider recipe on the track well). The root is a row: glyphs
 * and the value beside the control; the control fills the rest and the groove sits on its centre line.
 * A size sets the groove and knob together (--mu-slider-track, --mu-slider-knob). */
const ROOT = 'mu-slider group/slider relative flex items-center w-full max-w-full h-full slider-gap type-meta touch-none transition-slider data-dragging:transition-none data-disabled:opacity-slider-disabled data-disabled:pointer-events-none';
const SIZES: Record<SliderSize, string> = { compact: 'slider-compact', regular: 'slider-regular', large: 'slider-large' };
const CONTROL = 'mu-slider-control group/control relative flex-1 self-stretch min-w-0 slider-control-box touch-none cursor-pointer';
const GLYPH = 'mu-slider-icon mu-icon-trigger inline-grid flex-none place-items-center text-ink2 [&>svg]:slider-glyph';
const VALUE = 'mu-slider-value inline-grid flex-none justify-items-end type-figure text-ink';
const VALUE_CELL = 'col-start-1 row-start-1';
const TRACK = 'mu-slider-track absolute left-0 right-0 slider-track-place';
const FILL = 'mu-slider-fill h-full rounded-pill recipe-slider-fill slider-fill-along';
const MARKS = 'mu-slider-marks absolute slider-travel pointer-events-none slider-marks-place';
const MARK = 'absolute top-0 h-full w-slider-mark-w -translate-x-1/2 rounded-slider-mark-radius bg-slider-mark-color';
const TICKS = 'mu-slider-ticks absolute slider-travel pointer-events-none slider-ticks-place';
const TICK = 'absolute flex -translate-x-1/2 flex-col items-center gap-slider-tick-gap type-meta text-ink2 whitespace-nowrap';
const TICK_LINE = 'block w-slider-tick-w h-slider-tick-h bg-slider-tick-color';
const KNOB = 'mu-slider-knob top-1/2 slider-knob-box rounded-round cursor-grab slider-knob-along group-data-dragging/slider:cursor-grabbing has-focus-visible:focus-ring';
/* The face carries the metal and moves: it lifts on hover and presses while held or dragged. It grows
 * away from the nearer end (its origin follows the value), so even lifted it never pokes past the groove. */
const FACE = 'mu-slider-knob-face pointer-events-none absolute inset-0 rounded-round recipe-slider-knob slider-knob-origin transition-slider-knob group-hover/control:slider-knob-lift group-hover/control:recipe-slider-knob-hover group-active/control:slider-knob-press! group-active/control:recipe-slider-knob-press! group-data-dragging/slider:slider-knob-press! group-data-dragging/slider:recipe-slider-knob-press!';

/** What the knob needs from its slider: how to refuse a key that pushes past an end. */
const SliderContext = React.createContext<{ onKeyDown?: (e: React.KeyboardEvent) => void }>({});

const INCREASE = new Set(['ArrowRight', 'ArrowUp', 'PageUp', 'End']);
const DECREASE = new Set(['ArrowLeft', 'ArrowDown', 'PageDown', 'Home']);

/** Plays a glyph's act (its hover or press motion) as if it had been pressed. */
function play(el: HTMLElement | null) {
  if (!el) return;
  el.dispatchEvent(new Event('click'));
  el.dispatchEvent(new Event('pointerdown'));
}

function Root({ value, min, max, step, largeStep, onValueChange, size = 'regular', width, startIcon, endIcon, showValue, format, marks, ticks, 'aria-label': label, disabled, className, children }: SliderRootProps) {
  const span = max - min;
  const frac = (v: number) => (span > 0 ? Math.min(1, Math.max(0, (v - min) / span)) : 0);
  const at = frac(value);
  const control = React.useRef<HTMLDivElement>(null);
  const start = React.useRef<HTMLSpanElement>(null);
  const end = React.useRef<HTMLSpanElement>(null);
  // At an end, that end's glyph plays its act: once as the value arrives, never on mount.
  const was = React.useRef(at);
  React.useEffect(() => {
    if (at === 0 && was.current !== 0) play(start.current);
    if (at === 1 && was.current !== 1) play(end.current);
    was.current = at;
  }, [at]);
  // A key that pushes past an end is refused: the value was already there when the key went down.
  // It rides on the knob's input (Base UI keeps its keys from bubbling), before Base UI moves it.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (at === 1 && INCREASE.has(e.key)) refuse(control.current, 1);
    else if (at === 0 && DECREASE.has(e.key)) refuse(control.current, -1);
  };
  const context = React.useMemo(() => ({ onKeyDown }), [at]); // eslint-disable-line react-hooks/exhaustive-deps
  const own = [ROOT, SIZES[size], ticks?.length ? 'slider-ticks-room' : '', className ?? ''].filter(Boolean).join(' ');
  const style = { '--mu-slider-at': at, ...(width !== undefined ? { width } : null) } as React.CSSProperties;
  return (
    <BaseSlider.Root thumbAlignment="edge" style={style} data-size={size} disabled={disabled} value={value} min={min} max={max} step={step} largeStep={largeStep} onValueChange={(v) => onValueChange(v as number)} className={own}>
      {startIcon && <span ref={start} className={GLYPH} aria-hidden>{startIcon}</span>}
      <BaseSlider.Control ref={control} className={CONTROL}>
        <SliderContext.Provider value={context}>
        {children ?? (
          <>
            <Track />
            {marks?.length ? <Marks at={marks.map(frac)} /> : null}
            {ticks?.length ? <Ticks ticks={ticks.map((t) => ({ at: frac(t.value), label: t.label }))} /> : null}
            <Knob aria-label={label ?? 'Value'} getAriaValueText={format ? (_, v) => format(v) : undefined} />
          </>
        )}
        </SliderContext.Provider>
      </BaseSlider.Control>
      {endIcon && <span ref={end} className={GLYPH} aria-hidden>{endIcon}</span>}
      {showValue && <Value value={value} min={min} max={max} step={step ?? 1} format={format ?? String} />}
    </BaseSlider.Root>
  );
}

/** A few values are all measured (words: Draft … Best); many, only the ends (numbers grow toward them). */
const MEASURE_ALL = 24;

/** The value beside the groove. It reserves the width of its widest value, so the groove never moves
 *  as the digits change; the digits turn on the drum. The knob already says the value to assistive
 *  tech, so the readout is hidden from it. */
function Value({ value, min, max, step, format }: { value: number; min: number; max: number; step: number; format: (v: number) => string }) {
  const count = step > 0 ? Math.floor((max - min) / step) : 0;
  const sizes = count > 0 && count <= MEASURE_ALL ? Array.from({ length: count + 1 }, (_, i) => min + i * step) : [min, max];
  return (
    <span className={VALUE} aria-hidden>
      {sizes.map((v) => <span key={v} className={`${VALUE_CELL} invisible`}>{format(v)}</span>)}
      <SwapText className={VALUE_CELL} value={format(value)} />
    </span>
  );
}

/** The track well and its fill. */
function Track() {
  return (
    <BaseSlider.Track render={<Well variant="track" radius="pill" />} className={TRACK}>
      <BaseSlider.Indicator className={FILL} />
    </BaseSlider.Track>
  );
}

/** Notches cut across the groove, at fractions 0…1 of the travel (steps, detents, moments). */
function Marks({ at }: { at: number[] }) {
  return (
    <div className={MARKS} aria-hidden>
      {at.map((f, i) => (
        <i key={i} className={MARK} style={{ left: `${(f * 100).toFixed(2)}%` }} />
      ))}
    </div>
  );
}

/** Labelled ticks under the groove: { at: 0…1, label }. A plain label is set in the meta type at ink2,
 *  on the knob's travel; a caller's own node (a Label) styles itself. */
function Ticks({ ticks }: { ticks: { at: number; label: React.ReactNode }[] }) {
  return (
    <div className={TICKS} aria-hidden>
      {ticks.map((t, i) => (
        <span key={i} className={TICK} style={{ left: `${(t.at * 100).toFixed(2)}%` }}>
          <i className={TICK_LINE} />
          {t.label}
        </span>
      ))}
    </div>
  );
}

function Knob(props: { 'aria-label': string; getAriaValueText?: (formatted: string, value: number, index: number) => string }) {
  const { onKeyDown } = React.useContext(SliderContext);
  return (
    <BaseSlider.Thumb className={KNOB} onKeyDown={onKeyDown} {...props}>
      <span className={FACE} aria-hidden />
    </BaseSlider.Thumb>
  );
}

export const Slider = Object.assign(Root, { Root, Track, Marks, Ticks, Knob });
