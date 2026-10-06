'use client';

import * as React from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { buttonParts } from '../button/button';
import { Led } from '../led/led';

/* ─────────────────────────────────────────────────────────
 * TOGGLE and TOGGLE GROUP, latching push buttons, on Base UI Toggle and ToggleGroup
 *
 *   rest      the button cap with an unlit lamp at the start of its label: it latches
 *   press     the cap sinks past the catch (2) in 50 ms, linear, in the pressed look
 *   → on      on release it rises to the latch (1) on the part spring, overshooting a touch
 *             against the catch; it keeps the pressed look and the lamp lights
 *   → off     on release it rises all the way on the release spring; the lamp goes dark
 *   focus     the green ring; Space or Enter latch and unlatch
 *   group     the same keys in a row; arrows move between them; one or several can latch
 *   radio     RadioKeys: exactly one of a set latches (time slots); a radio group, so arrows move
 *             and choose at once, and latching one lets the other rise on the release spring
 *   disabled  40 %
 * Reduce Motion: the latch snaps to its depth (the part spring is instant); the lamp still lights.
 * The cap is the button recipe and the lamp the LED part; the toggle recipe adds depths and motion.
 * ───────────────────────────────────────────────────────── */

const KEY = `mu-toggle ${buttonParts.FRAME} ${buttonParts.REGULAR} text-ink recipe-button toggle-travel data-pressed:recipe-button-pressed not-data-disabled:active:recipe-button-pressed`;
const GROUP = 'mu-toggle-group inline-flex flex-wrap items-center gap-toggle-gap';

export interface ToggleProps extends Omit<BaseToggle.Props, 'className'> {
  /** Hide the lamp (an icon-only key whose icon already shows its state). */
  lamp?: boolean;
  className?: string;
}

/** A button that latches: pressed stays pressed, with its lamp lit. */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle({ lamp = true, className, children, ...props }, ref) {
  return (
    <BaseToggle
      ref={ref}
      className={className ? `${KEY} ${className}` : KEY}
      render={(p, state) => (
        <button {...p}>
          {lamp && <Led kind={state.pressed ? 'live' : 'off'} size="small" />}
          {children}
        </button>
      )}
      {...props}
    />
  );
});

export interface ToggleGroupProps extends Omit<BaseToggleGroup.Props, 'className'> {
  className?: string;
}

/** Toggles in a row. `multiple` lets several latch at once; otherwise latching one releases the other. */
export function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return <BaseToggleGroup className={className ? `${GROUP} ${className}` : GROUP} {...props} />;
}

export interface RadioKeysProps extends Omit<BaseRadioGroup.Props, 'className'> {
  /** Replaces the row layout (a wrapping row, the toggle gap): a grid of slots brings its own. */
  className?: string;
}

/** Latching keys of which exactly one is down: a radio group (time slots, a length). Arrows move and choose. */
export function RadioKeys({ className, ...props }: RadioKeysProps) {
  return <BaseRadioGroup className={`mu-toggle-group ${className ?? 'inline-flex flex-wrap items-center gap-toggle-gap'}`} {...props} />;
}

export interface RadioKeyProps extends Omit<BaseRadio.Root.Props, 'className' | 'render'> {
  /** Hide the lamp. */
  lamp?: boolean;
  className?: string;
}

/** One key of RadioKeys: the Toggle's latch and lamp, chosen as a radio. */
export const RadioKey = React.forwardRef<HTMLSpanElement, RadioKeyProps>(function RadioKey({ lamp = true, className, children, ...props }, ref) {
  return (
    <BaseRadio.Root
      ref={ref}
      className={className ? `${KEY} ${className}` : KEY}
      render={(p, state) => (
        <span {...p} data-pressed={state.checked ? '' : undefined}>
          {lamp && <Led kind={state.checked ? 'live' : 'off'} size="small" />}
          {children}
        </span>
      )}
      {...props}
    />
  );
});
