'use client';

import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';

/* ─────────────────────────────────────────────────────────
 * SWITCH (the reference design's .tog) on Base UI Switch
 *
 * A setting that is on or off and takes effect at once.
 *
 *   off       a sunk pill track (the track well) with a raised round thumb at the left
 *   on        the thumb slides right on the part spring (a track with ends, so it may
 *             overshoot against the stop) and the track fills with a soft green
 *   pressed   the thumb stretches toward where it is going (4 pt), so the press already
 *             points at the result; releasing lets it travel
 *   focus     the green ring at offset 2 (keyboard only); Space toggles
 *   disabled  40 %
 * Two sizes: regular 40 × 24 (settings rows), small 32 × 20 (dense cards).
 * With a label it becomes a row (a native label): the words toggle it too, and the
 * description is read as its description.
 * Reduce Motion: the thumb moves at once; the colour still fades.
 * ───────────────────────────────────────────────────────── */

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, 'className' | 'render'> {
  size?: 'regular' | 'small';
  /** Its visible label. The switch and its words become one row; clicking the words toggles it. */
  label?: React.ReactNode;
  /** A line under the label, read as the switch's description. */
  description?: React.ReactNode;
  /** Where the words sit: `end` (after the switch) or `start` (a settings row: words left, switch right). */
  labelSide?: 'start' | 'end';
  /** Its accessible name, when no visible label names it. */
  'aria-label'?: string;
  className?: string;
}

const ROOT = 'mu-switch group/sw relative box-border inline-flex flex-none items-center p-switch-pad rounded-pill border-0 cursor-pointer outline-none recipe-switch data-checked:recipe-switch-on transition-switch-track focus-visible:focus-ring data-disabled:opacity-switch-disabled data-disabled:cursor-default tap-highlight-none';
const SIZE = {
  regular: 'w-switch-width h-switch-height',
  small: 'w-switch-small-width h-switch-small-height',
};
const THUMB_BASE = 'mu-switch-thumb block rounded-pill recipe-switch-thumb transition-switch-thumb reduced-motion:transition-none';
const THUMB = {
  regular: 'h-switch-thumb-size w-switch-thumb-size group-data-checked/sw:switch-thumb-on group-active/sw:switch-thumb-pressed group-active/sw:group-data-checked/sw:switch-thumb-on-pressed',
  small: 'h-switch-small-thumb w-switch-small-thumb group-data-checked/sw:switch-small-thumb-on group-active/sw:switch-small-thumb-pressed group-active/sw:group-data-checked/sw:switch-small-thumb-on-pressed',
};

const ROW = {
  end: 'mu-switch-row inline-flex items-center gap-switch-row-gap cursor-pointer select-none tap-highlight-none has-data-disabled:cursor-default',
  start: 'mu-switch-row flex flex-row-reverse items-center justify-between gap-switch-row-gap-apart cursor-pointer select-none tap-highlight-none has-data-disabled:cursor-default',
};

/** A setting that is on or off, taking effect at once. */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch({ size = 'regular', label, description, labelSide = 'end', className, ...props }, ref) {
  const id = React.useId();
  // The control is a span with the switch role, which a native label doesn't name, so the words name it by id.
  const control = (
    <BaseSwitch.Root ref={ref} data-size={size} className={[ROOT, SIZE[size], label == null && className].filter(Boolean).join(' ')} aria-labelledby={label != null ? `${id}-l` : undefined} aria-describedby={description != null ? `${id}-d` : undefined} {...props}>
      <BaseSwitch.Thumb className={`${THUMB_BASE} ${THUMB[size]}`} />
    </BaseSwitch.Root>
  );
  if (label == null) return control;
  return (
    <label className={className ? `${ROW[labelSide]} ${className}` : ROW[labelSide]}>
      {control}
      <span className="grid min-w-0 gap-switch-row-text-gap">
        <span id={`${id}-l`} className="type-ui text-ink">{label}</span>
        {description != null && <span id={`${id}-d`} className="type-meta text-ink3">{description}</span>}
      </span>
    </label>
  );
});
