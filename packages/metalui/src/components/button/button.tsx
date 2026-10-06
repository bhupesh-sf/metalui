'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';

/**
 * Which cap the button wears. `standard` is soft-touch in the colorway,
 * `primary` is the dark cap, and `destructive` is the one red cap. Use at
 * most one primary or destructive cap per group. `link`, `graphite`, `strip`
 * and `strip-danger` set their own size.
 */
export type ButtonCap = 'standard' | 'primary' | 'destructive' | 'link' | 'graphite' | 'strip' | 'strip-danger';

export interface ButtonProps extends BaseButton.Props {
  cap?: ButtonCap;
  /** default: 32 tall. compact: 28, 12 pt (the canvas pills: "seed a sample day", "lenses ⌘K"; a standard compact cap wears raise-sm and ink2, a primary or destructive one keeps its cap). The link, graphite and strip caps set their own size. */
  size?: 'default' | 'compact';
  /**
   * The action's glyph, placed before the label and sized by the cap (16 in a 32 cap or a strip, 14 in
   * a compact or graphite one, 12 beside a link; pass it without a size). An action names itself with a glyph and a verb:
   * `<Button icon={<ShareIcon />}>Share</Button>`. A plain choice (Cancel, Done) has none. When
   * the same control changes meaning, pass a `MorphIcon` whose name changes, and turn the label
   * with `SwapText`. The button is the icon's trigger, so it plays its act on hover and press.
   */
  icon?: React.ReactNode;
  /**
   * Where the action is (the host's, controlled): `waiting` holds the key down in its pressed look, refuses
   * presses (aria-disabled, still focusable) and sets aria-busy; after the spinner's show delay the glyph
   * cross-fades into a turning arc in the key's ink, so a quick action shows only its result. `done` stays
   * held for the host's result ("Saved" with check). Turn the label with SwapText. Pass `ready` (not
   * nothing) between waits, so a MorphIcon keeps morphing.
   */
  state?: 'ready' | 'waiting' | 'done';
}

/* Styled with the theme's utilities: the button recipe's sizes, type and layered looks
 * (recipe-button[-<part>][-pressed]). While held it sinks by the recipe's travel in the press time,
 * linear, into its pressed look; it springs back on release. */
const FRAME = 'box-border inline-flex items-center justify-center m-0 border-0 whitespace-nowrap cursor-pointer select-none antialiased tap-highlight-none [&>svg]:flex-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep data-disabled:cursor-default data-disabled:opacity-button-disabled';
const PRESS = 'not-data-disabled:active:translate-y-button-travel not-data-disabled:active:duration-button-press not-data-disabled:active:ease-linear';
const REGULAR = 'gap-button-gap h-button-height px-button-pad rounded-pill type-ui transition-button [&>svg]:size-button-glyph';

const CAPS: Record<ButtonCap, string> = {
  standard: `${REGULAR} text-ink recipe-button ${PRESS} not-data-disabled:active:recipe-button-pressed`,
  primary: `${REGULAR} text-button-primary-ink recipe-button-primary ${PRESS} not-data-disabled:active:recipe-button-primary-pressed`,
  destructive: `${REGULAR} text-button-destructive-ink recipe-button-destructive ${PRESS} not-data-disabled:active:recipe-button-destructive-pressed`,
  link: 'h-auto p-0 rounded-none bg-transparent type-button-link text-button-link-ink transition-button [&>svg]:size-button-link-glyph',
  graphite: `gap-button-gap h-button-graphite-height px-button-graphite-pad rounded-pill type-button-graphite text-button-graphite-ink recipe-button-graphite transition-button [&>svg]:size-button-graphite-glyph ${PRESS}`,
  strip: `gap-button-gap h-button-strip-height px-button-strip-pad rounded-button-strip-radius type-button-strip text-button-strip-ink bg-transparent transition-button [&>svg]:size-button-strip-glyph hover:text-button-strip-ink-hover hover:recipe-button-strip-hover ${PRESS} not-data-disabled:active:recipe-button-strip-pressed focus-visible:outline-none focus-visible:recipe-button-strip-focus`,
  'strip-danger': `gap-button-gap h-button-strip-height px-button-strip-pad rounded-button-strip-radius type-button-strip text-button-strip-danger-ink bg-transparent transition-button [&>svg]:size-button-strip-glyph hover:recipe-button-strip-hover ${PRESS} not-data-disabled:active:recipe-button-strip-pressed focus-visible:outline-none focus-visible:recipe-button-strip-focus`,
};
// Held (waiting or done): down at the cap's travel in its pressed look.
const HELD: Record<ButtonCap, string> = {
  standard: 'data-held:translate-y-button-travel data-held:recipe-button-pressed',
  primary: 'data-held:translate-y-button-travel data-held:recipe-button-primary-pressed',
  destructive: 'data-held:translate-y-button-travel data-held:recipe-button-destructive-pressed',
  link: '',
  graphite: 'data-held:translate-y-button-travel',
  strip: 'data-held:translate-y-button-travel data-held:recipe-button-strip-pressed',
  'strip-danger': 'data-held:translate-y-button-travel data-held:recipe-button-strip-pressed',
};
const COMPACT_HELD = 'data-held:translate-y-button-travel data-held:recipe-button-compact-pressed';
// The glyph's slot while a state is given: the glyph and the arc share it (an svg, so the cap sizes it).
const WAIT = 'mu-button-wait button-wait';
const ARC = <circle className="mu-button-arc" cx={12} cy={12} r={8.5} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" pathLength={100} strokeDasharray="68 100" />;

const COMPACT_SIZE = 'gap-button-compact-gap h-button-compact-height px-button-compact-pad rounded-pill type-button-compact [&>svg]:size-button-compact-glyph';
const COMPACT: Partial<Record<ButtonCap, string>> = {
  standard: `${COMPACT_SIZE} text-ink2 hover:text-ink recipe-button-compact transition-button-compact ${PRESS} not-data-disabled:active:recipe-button-compact-pressed`,
  primary: `${COMPACT_SIZE} text-button-primary-ink recipe-button-primary transition-button ${PRESS} not-data-disabled:active:recipe-button-primary-pressed`,
  destructive: `${COMPACT_SIZE} text-button-destructive-ink recipe-button-destructive transition-button ${PRESS} not-data-disabled:active:recipe-button-destructive-pressed`,
};

/** The cap's frame and regular size without its press, for keys that travel their own way (Toggle). */
export const buttonParts = { FRAME, REGULAR } as const;

/** The utilities for a cap and size: the caps that set their own size (link, graphite, strip) ignore `size`. */
export function buttonClasses(cap: ButtonCap = 'standard', size: 'default' | 'compact' = 'default') {
  return `${FRAME} ${(size === 'compact' && COMPACT[cap]) || CAPS[cap]}`;
}

/**
 * A press-in pill button. While held it sinks 1px and its shadow
 * collapses into a well; on release it springs back. Its `icon` leads the label, and
 * MetalUI icons inside it play their act from the whole button.
 */
export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  { cap = 'standard', size = 'default', icon, state, className, children, onClick, ...props },
  ref,
) {
  const held = state === 'waiting' || state === 'done';
  const heldLook = size === 'compact' && cap === 'standard' ? COMPACT_HELD : HELD[cap];
  const own = `mu-button mu-icon-trigger ${buttonClasses(cap, size)}${state ? ` ${heldLook} data-held:cursor-default` : ''}`;
  return (
    <BaseButton
      ref={ref}
      data-cap={cap}
      data-size={size}
      data-held={held ? '' : undefined}
      data-busy={state === 'waiting' ? '' : undefined}
      aria-busy={state === 'waiting' || undefined}
      aria-disabled={held || undefined}
      className={(s) => {
        const extra = typeof className === 'function' ? className(s) : className;
        return extra ? `${own} ${extra}` : own;
      }}
      onClick={(e) => {
        if (held) e.preventDefault();
        else onClick?.(e);
      }}
      {...props}
    >
      {state && icon ? <svg aria-hidden viewBox="0 0 24 24" className={WAIT}>{icon}{ARC}</svg> : icon}
      {children}
    </BaseButton>
  );
});
