'use client';

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { Well } from '../well/well';

/* ─────────────────────────────────────────────────────────
 * SLIDER on Base UI Slider
 *
 *   track    a 10 tall well (the track well)
 *   fill     the green intent fill at full strength up to the knob, its edge an inset hairline
 *   marks    notches cut across the groove (steps, detents, moments)
 *   ticks    a short line under the groove and its label in the meta type at ink2: readable on any
 *            stage, never the engraved ink3
 *   knob     a knurled, anodized knob; arrows step, Shift steps large
 *   motion   a jump (a click, a key) rides the part spring; a drag follows the pointer exactly
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
 *   reduced  the spring's duration is 0: a jump lands at once
 * Slots: Slider.Root, Slider.Track, Slider.Marks, Slider.Ticks, Slider.Knob.
 * ───────────────────────────────────────────────────────── */

export interface SliderRootProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  largeStep?: number;
  onValueChange: (value: number) => void;
  className?: string;
  children: React.ReactNode;
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

/* Styled with the theme's utilities (the slider recipe on the track well). The root fills its box and the
 * track sits on the box's centre line; a jump rides the part spring, a drag follows the pointer. */
const ROOT = 'mu-slider group/slider relative w-full h-full touch-none transition-slider data-dragging:transition-none';
const CONTROL = 'mu-slider-control relative w-full h-full touch-none cursor-pointer';
const TRACK = 'mu-slider-track absolute left-0 right-0 slider-track-place';
const FILL = 'mu-slider-fill h-full rounded-pill recipe-slider-fill slider-fill-along';
const MARKS = 'mu-slider-marks absolute slider-travel pointer-events-none slider-marks-place';
const MARK = 'absolute top-0 h-full w-slider-mark-w -translate-x-1/2 rounded-slider-mark-radius bg-slider-mark-color';
const TICKS = 'mu-slider-ticks absolute slider-travel pointer-events-none slider-ticks-place';
const TICK = 'absolute flex -translate-x-1/2 flex-col items-center gap-slider-tick-gap type-meta text-ink2 whitespace-nowrap';
const TICK_LINE = 'block w-slider-tick-w h-slider-tick-h bg-slider-tick-color';
const KNOB = 'mu-slider-knob top-1/2 size-slider-knob-size rounded-round cursor-grab recipe-slider-knob slider-knob-along group-data-dragging/slider:cursor-grabbing has-focus-visible:focus-ring';

function Root({ value, min, max, step, largeStep, onValueChange, className, children }: SliderRootProps) {
  const at = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  return (
    <BaseSlider.Root thumbAlignment="edge" style={{ '--mu-slider-at': at } as React.CSSProperties} value={value} min={min} max={max} step={step} largeStep={largeStep} onValueChange={(v) => onValueChange(v as number)} className={className ? `${ROOT} ${className}` : ROOT}>
      <BaseSlider.Control className={CONTROL}>{children}</BaseSlider.Control>
    </BaseSlider.Root>
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
  return <BaseSlider.Thumb className={KNOB} {...props} />;
}

export const Slider = Object.assign(Root, { Root, Track, Marks, Ticks, Knob });
