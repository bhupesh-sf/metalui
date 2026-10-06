'use client';

import * as React from 'react';
import { Led, type LedKind } from '../led/led';
import { SwapText } from '../../motion/swap';

/* BADGE: one short fact about a thing (its kind, version or state, or how many are waiting).
 *   a stamp      a shallow sunk pill, the words in the engraved mono (ink2 with the lip); never raised
 *   led          the LED part before the words, steady; it flickers once when the state changes
 *   glyph        a glyph from the set before the words (a glyph or an LED, not both)
 *   count        tabular in the readout type, a circle for one digit, `max`+ past max, turning on the
 *                drum: up as it grows, down as it shrinks
 *   size         regular 18 (by ui and body text), compact 15 (by meta text, dense rows, corners)
 * Badge.Anchor puts a count on another control's top-right corner: a readout cap in the other colorway,
 * ringed in the surface, in from 60 % on the object spring as it leaves zero, gone at zero.
 * Not pressable and not announced: a badge you remove is a Chip; the system's own state is a StatusBadge.
 * Styled with the theme's utilities (the badge recipe). */

export type BadgeSize = 'regular' | 'compact';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The words: short, a kind, a version, a role or a state ("Beta", "v2.4", "Build failed"). */
  children?: React.ReactNode;
  /** A state's lamp before the words: live, waiting (or urgent), failed, link, off. The words still say it. */
  led?: LedKind;
  /** A glyph before the words (`<Icon name="lock" animate={false} />`); ignored when `led` is set. */
  glyph?: React.ReactNode;
  /** A count in place of words; it turns on the drum when it changes. */
  count?: number;
  /** Past this the count shows `max+`. */
  max?: number;
  /** What the count means, for assistive tech ("3 unread"); the bare number otherwise. */
  label?: string;
  /** regular (18, by ui and body text) or compact (15, by meta text and in dense rows). */
  size?: BadgeSize;
}

const BASE = 'mu-badge inline-flex flex-none items-center justify-center align-middle rounded-pill whitespace-nowrap text-ink2 recipe-badge recipe-label-engraved cursor-default';
const WORDS: Record<BadgeSize, string> = {
  regular: 'h-badge-regular-height gap-badge-regular-gap px-badge-regular-pad type-badge-regular uppercase [&_svg]:size-badge-regular-glyph',
  compact: 'h-badge-compact-height gap-badge-compact-gap px-badge-compact-pad type-badge-compact uppercase [&_svg]:size-badge-compact-glyph',
};
const COUNT: Record<BadgeSize, string> = {
  regular: 'h-badge-regular-height min-w-badge-regular-height px-badge-count-pad type-badge-count tabular-nums',
  compact: 'h-badge-compact-height min-w-badge-compact-height px-badge-count-compact-pad type-badge-count-compact tabular-nums',
};
const LEAD = 'inline-grid flex-none place-items-center';
const ANCHOR = 'mu-badge-anchor relative inline-flex flex-none';
const CORNER = `mu-badge-corner pointer-events-none absolute top-badge-corner-offset right-badge-corner-offset inline-flex items-center justify-center rounded-pill text-badge-corner-ink recipe-badge-corner badge-corner-ring badge-corner-motion ${COUNT.compact}`;

const faceOf = (count: number, max: number) => (count > max ? `${max}+` : String(count));

/** The count on the drum: it rolls up as the number grows and down as it shrinks. */
function Drum({ count, max }: { count: number; max: number }) {
  const prev = React.useRef(count);
  const down = React.useRef(false);
  if (count !== prev.current) {
    down.current = count < prev.current;
    prev.current = count;
  }
  return (
    <span aria-hidden className={`inline-flex${down.current ? ' swap-down' : ''}`}>
      <SwapText value={faceOf(count, max)} />
    </span>
  );
}

const Root = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge({ children, led, glyph, count, max = 99, label, size = 'regular', className, ...props }, ref) {
  // The lamp holds steady on first paint and flickers once on each later change of state.
  const firstLed = React.useRef(led);
  const changed = React.useRef(false);
  if (led !== firstLed.current) changed.current = true;

  if (count !== undefined) {
    const own = `${BASE} ${COUNT[size]}`;
    return (
      <span ref={ref} data-size={size} data-count={count} className={className ? `${own} ${className}` : own} {...props}>
        <Drum count={count} max={max} />
        <span className="sr-only">{label ?? faceOf(count, max)}</span>
      </span>
    );
  }
  const own = `${BASE} ${WORDS[size]}`;
  return (
    <span ref={ref} data-size={size} data-led={led} className={className ? `${own} ${className}` : own} {...props}>
      {led ? (
        <Led kind={led} size={size === 'compact' ? 'small' : 'default'} gesture={changed.current ? 'flicker' : 'steady'} />
      ) : glyph ? (
        <span aria-hidden className={LEAD}>{glyph}</span>
      ) : null}
      {children}
    </span>
  );
});

export interface BadgeAnchorProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The control the count sits on: an IconButton, an Avatar. Say the count in its own label ("Inbox, 3 unread"). */
  children: React.ReactNode;
  /** How many are waiting; at zero the cap goes. */
  count: number;
  max?: number;
}

/** A count on another control's top-right corner. The cap is hidden from assistive tech: the control's label says it. */
function Anchor({ children, count, max = 99, className, ...props }: BadgeAnchorProps) {
  // Leaving at zero, the cap keeps its last number while it goes.
  const last = React.useRef(count);
  if (count > 0) last.current = count;
  return (
    <span className={className ? `${ANCHOR} ${className}` : ANCHOR} {...props}>
      {children}
      <span aria-hidden data-empty={count > 0 ? undefined : ''} data-count={count} className={CORNER}>
        <Drum count={last.current} max={max} />
      </span>
    </span>
  );
}

export const Badge = Object.assign(Root, { Root, Anchor });
