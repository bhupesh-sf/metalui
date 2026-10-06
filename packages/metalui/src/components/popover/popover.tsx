'use client';

import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { InheritColorway, useColorwayAnchor, type ColorwayAnchor } from '../../theme/colorway';

/* ─────────────────────────────────────────────────────────
 * POPOVER, a small panel that comes out of its trigger, on Base UI Popover
 *
 *    0 ms   the trigger is pressed; the plate appears one nest (6) back toward the trigger,
 *           at 0.97, grown from the trigger's side (transform-origin), transparent
 *   ~0 ms   it rises into place and fades in together on the surface spring (no overshoot)
 *  ~290 ms  near rest; focus is in the plate (the first field, or the plate itself)
 *   close   Esc, click outside, a Close part, or the trigger again: it fades out on the
 *           release spring and does not travel back; focus returns to the trigger
 * Reduce Motion: a crossfade (the surface travel is zero).
 * The plate is the menu's frosted plate; the popover recipe adds padding, width, text and motion.
 * Slots: Popover.Root, Popover.Trigger, Popover.Content, Popover.Title, Popover.Description, Popover.Close.
 * ───────────────────────────────────────────────────────── */

const POSITIONER = 'mu-popover-positioner z-menu-z';
const PLATE = [
  'mu-popover box-border min-w-popover-min-width max-w-popover-max-width p-popover-pad rounded-popover-radius outline-none',
  'recipe-menu backdrop-menu-blur reduce-transparency:opaque-frost',
  'popover-origin transition-popover data-starting-style:popover-away data-ending-style:popover-gone',
].join(' ');
const TITLE = 'mu-popover-title m-0 type-title text-ink';
const DESCRIPTION = 'mu-popover-description m-0 mt-popover-gap type-body text-ink2';
const BODY = 'mu-popover-body mt-popover-body-gap';

/** The popover's plate, title and description looks, for other plates that rise from a trigger. */
export const popoverParts = { PLATE, TITLE, DESCRIPTION } as const;

function offset() {
  if (typeof window === 'undefined') return 6;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-popover-self-offset')) || 6;
}

export type PopoverRootProps = BasePopover.Root.Props;

// Where the trigger sits, so the portalled plate opens in its colorway.
const AtCtx = React.createContext<ColorwayAnchor | null>(null);

function Root(props: PopoverRootProps) {
  const at = useColorwayAnchor();
  return <AtCtx.Provider value={at}><BasePopover.Root {...props} /></AtCtx.Provider>;
}

export interface PopoverTriggerProps extends Omit<BasePopover.Trigger.Props, 'render'> {
  /** The control that opens it (a Button, an icon button). It must accept a ref and props. */
  children: React.ReactElement;
}

function Trigger({ children, ...props }: PopoverTriggerProps) {
  const at = React.useContext(AtCtx);
  return <BasePopover.Trigger ref={at?.ref} render={children} {...props} />;
}

export interface PopoverContentProps extends Omit<BasePopover.Popup.Props, 'className'> {
  side?: 'bottom' | 'top' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /** Where it opens from when there is no Trigger (a word in the text): an element, or a ref to one. */
  anchor?: BasePopover.Positioner.Props['anchor'];
  className?: string;
}

/** The plate: portalled and placed beside its trigger. */
const Content = React.forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent({ side = 'bottom', align = 'center', anchor, className, ...props }, ref) {
  const at = React.useContext(AtCtx);
  // Without a Trigger the anchor is where the colorway comes from.
  const el = typeof anchor === 'function' ? null : anchor && 'current' in anchor ? anchor.current : anchor;
  if (at && el instanceof Element) at.current = el;
  return (
    <BasePopover.Portal>
      {at && <InheritColorway anchor={at} />}
      <BasePopover.Positioner className={POSITIONER} anchor={anchor} side={side} align={align} sideOffset={offset()} collisionPadding={8}>
        <BasePopover.Popup ref={ref} className={className ? `${PLATE} ${className}` : PLATE} {...props} />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
});

function Title({ className, ...props }: BasePopover.Title.Props & { className?: string }) {
  return <BasePopover.Title className={className ? `${TITLE} ${className}` : TITLE} {...props} />;
}

function Description({ className, ...props }: BasePopover.Description.Props & { className?: string }) {
  return <BasePopover.Description className={className ? `${DESCRIPTION} ${className}` : DESCRIPTION} {...props} />;
}

/** The task's own content under the title: fields, a swatch row, actions. */
function Body({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `${BODY} ${className}` : BODY} {...props} />;
}

function Close(props: BasePopover.Close.Props) {
  return <BasePopover.Close {...props} />;
}

export const Popover = Object.assign(Root, { Root, Trigger, Content, Title, Description, Body, Close });
