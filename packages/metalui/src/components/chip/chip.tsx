'use client';

import * as React from 'react';
import type { LedKind } from '../led/led';

/* CHIP: a small pill with an optional leading LED or glyph and trailing actions.
 *   suggestion     frosted with a green hairline (a question with its confidence and ✓ ×)
 *   glass          a tag on a glass screen, in the colorway (an LED and a kind)
 *   glass-action   a light cap on glass (OPEN ↗), brighter on hover
 *   tag            an engraved tag in a hairline pill (a derived #tag)
 * waiting        held (aria-busy, no pointer) and dimmed, except the slot holding a Spinner (put
 *                <Spinner phase size="small"> in Chip.Lead): a tag being applied, a link being read
 * Slots: Chip.Root, Chip.Lead, Chip.Text, Chip.Actions. Styled with the theme's utilities (the chip recipe). */

export interface ChipRootProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'suggestion' | 'glass' | 'glass-action' | 'tag';
  as?: 'span' | 'div' | 'a' | 'button';
  href?: string;
  target?: string;
  rel?: string;
  /** Its work is under way (useWait's `busy`): held and dimmed, except the slot holding a Spinner. */
  waiting?: boolean;
}

const FRAME = 'group/chip box-border inline-flex items-center whitespace-nowrap no-underline spinner-item';
const GLASS = 'gap-chip-glass-gap h-chip-glass-height px-chip-glass-pad-x rounded-chip-glass-radius type-chip-glass';
const VARIANTS = {
  suggestion: 'gap-chip-suggestion-gap h-chip-suggestion-height pl-chip-suggestion-pad-left pr-chip-suggestion-pad-right rounded-pill type-chip-suggestion text-chip-suggestion-ink recipe-chip-suggestion',
  glass: `${GLASS} text-chip-glass-ink recipe-chip-glass backdrop-chip-glass-blur`,
  'glass-action': `${GLASS} text-chip-glass-action-ink recipe-chip-glass-action cursor-pointer hover:recipe-chip-glass-action-hover`,
  tag: 'px-chip-tag-pad-x rounded-pill type-chip-tag text-chip-tag-ink recipe-chip-tag',
};
const LEAD = 'mu-chip-lead inline-grid place-items-center flex-none';
// The LED part's lamps (the status recipe), at the chip's size.
const LEDS: Record<LedKind, string> = {
  live: 'recipe-status-led-live',
  waiting: 'recipe-status-led-waiting',
  failed: 'recipe-status-led-failed',
  link: 'recipe-status-led-link',
  off: 'recipe-status-led-off',
};
const ACTIONS = 'mu-chip-actions inline-flex items-center group-data-[variant=suggestion]/chip:gap-chip-suggestion-gap';

const Root = React.forwardRef<HTMLElement, ChipRootProps>(function ChipRoot({ variant = 'suggestion', as = 'span', waiting, className, ...props }, ref) {
  const Tag = as as React.ElementType;
  const own = `mu-chip ${FRAME} ${VARIANTS[variant]}`;
  return <Tag ref={ref} data-variant={variant} data-waiting={waiting ? '' : undefined} aria-busy={waiting || undefined} className={className ? `${own} ${className}` : own} {...props} />;
});

/** The leading LED (`led`, one of the LED's kinds: "link" for a link's kind) or a glyph (children). */
function Lead({ led, children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { led?: LedKind }) {
  const own = led ? `${LEAD} size-chip-led-size rounded-round ${LEDS[led]}` : LEAD;
  return (
    <span aria-hidden data-led={led} className={className ? `${own} ${className}` : own} {...props}>
      {children}
    </span>
  );
}
function Text({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={className ? `mu-chip-text ${className}` : 'mu-chip-text'} {...props} />;
}
function Actions({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={className ? `${ACTIONS} ${className}` : ACTIONS} {...props} />;
}

export const Chip = Object.assign(Root, { Root, Lead, Text, Actions });
export type ChipProps = ChipRootProps;
