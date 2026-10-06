'use client';

import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Icon } from '../../icons/Icon';
import { IconButton } from '../icon-button/icon-button';
import { Led, type LedGesture } from '../led/led';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * CARD, a person's thing held on a raised plate
 *
 *   rest      the raised surface: optional media, a title, a line, a footer of actions
 *   link      a card that goes somewhere takes its link on the title, stretched over the whole card
 *             (one clear link for assistive tech); footer actions and the corner action stay their
 *             own buttons above it
 *   hover     only a card with a link moves: it lifts one grid step on the settle spring and its
 *             ambient shadow grows (the hover lift, T5a), still again once the pointer leaves
 *   pressed   it comes back down (press time)
 *   focus     the green ring, from the title's link
 *   selected  one of a set: the green ring, 3 out
 *   status    live / waiting / failed: an LED at the end of the title's line, its own gesture
 *             (steady, breathing, two blinks) and its word as its name and tooltip
 *   waiting   the card's own shape waits: after the show delay a lit edge travels round its border in
 *             the card's ink (the spinner recipe's edge), never a spinner in its middle; the host's
 *             words say what is happening, and a Progress takes over once the amount is known
 *   size      regular (pad 16) or compact (pad 12); a frame's size reaches the cards inside it
 *   horizontal  square media at the start, concentric with the plate, for result lists
 * A choice card (Card.Choice in Card.Choices) is a radio, or a checkbox with `multiple`:
 *   pressed   it sinks at once (press time): the raised look crossfades to the seated one
 *   chosen    it stays down, seated flush, with the 4 pt green LED in its corner (the icon key's
 *             latch); the card it replaces rises on the release spring
 *   focus     the green ring; arrows move and choose (radio), Space toggles (checkbox)
 * The frame (Card.Frame) holds cards: separated (a sunk tray of raised peers), stacked (one raised
 * plate, its sections between engraved hairlines: parts of one whole) or ghost (no tray). An empty
 * slot (Card.EmptySlot) is a recess where a new card will go, with plus and a verb.
 * Reduce Motion: no lift (the shadow still grows); a choice still seats its 1 pt, a key's depth on the
 * release spring, as the tool key's; the waiting edge breathes in place.
 * An object: it stands for a person's thing. It uses the raised surface.
 * Slots: Card.Root, Card.Media, Card.Title, Card.Action, Card.Description, Card.Footer, Card.Frame,
 * Card.Choices, Card.Choice, Card.EmptySlot.
 * ───────────────────────────────────────────────────────── */

export type CardSize = 'regular' | 'compact';
export type CardOrientation = 'vertical' | 'horizontal';
export type CardStatus = 'live' | 'waiting' | 'failed';
export type CardFrameVariant = 'separated' | 'stacked' | 'ghost';

const BODY = 'mu-card relative grid card-grid gap-card-gap p-card-pad';
const PLATE = 'rounded-surface-radius-card recipe-surface-raise card-lift has-[.mu-card-link:focus-visible]:focus-ring data-selected:card-selected';
const SECTION = 'card-section has-[.mu-card-link:focus-visible]:focus-ring data-selected:card-selected';
const CHOICE = 'rounded-surface-radius-card card-choice outline-none focus-visible:focus-ring';
const MEDIA = 'mu-card-media h-card-media card-media-bleed';
const TITLE = 'mu-card-title static m-0 type-title text-ink';
const LINK = 'mu-card-link static text-inherit no-underline outline-none card-stretch';
const headings = { 2: 'h2', 3: 'h3', 4: 'h4' } as const;
const DESCRIPTION = 'mu-card-description m-0 type-body text-ink2';
const FOOTER = 'mu-card-footer relative z-1 flex flex-wrap items-center gap-card-footer-gap mt-card-footer-gap';
const ACTION = 'mu-card-action z-1';
const STATUS = 'mu-card-status relative z-1 inline-grid place-items-center size-card-status-box';
const LATCH = 'mu-card-latch card-latch';
const FRAME = 'mu-card-frame card-frame';
const FRAME_LOOKS: Record<CardFrameVariant, string> = {
  separated: 'recipe-well-field',
  stacked: 'recipe-surface-raise',
  ghost: '',
};
const SLOT = 'mu-card-slot mu-icon-trigger card-slot recipe-well-track transition-icon-button type-ui text-ink2 hover:text-ink outline-none focus-visible:focus-ring';

/** Each status's word, its name and tooltip unless the host gives its own. */
const statusWords: Record<CardStatus, string> = { live: 'Live', waiting: 'Waiting', failed: 'Failed' };
/** Each status's own gesture (the status badge's), so it never rests on colour alone. */
const statusGestures: Record<CardStatus, LedGesture> = { live: 'steady', waiting: 'breathe', failed: 'blink2' };

const FrameContext = React.createContext<{ variant: CardFrameVariant; size: CardSize; orientation: CardOrientation } | null>(null);
const ChoicesContext = React.createContext(false);

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** The classes every card body takes: its layout, size and orientation, and whether it is a section. */
function useBody(size: CardSize | undefined, orientation: CardOrientation | undefined) {
  const frame = React.useContext(FrameContext);
  const own = size ?? frame?.size ?? 'regular';
  const way = orientation ?? frame?.orientation ?? 'vertical';
  return {
    section: frame?.variant === 'stacked',
    size: own,
    orientation: way,
    className: join(BODY, own === 'compact' && 'card-compact', way === 'horizontal' && 'card-horizontal'),
  };
}

const EDGE = <span aria-hidden className="mu-card-wait spinner-edge"><span /></span>;

function Status({ status, label }: { status: CardStatus; label?: string }) {
  const word = label ?? statusWords[status];
  return (
    <Tooltip label={word} side="top">
      <span role="img" aria-label={word} data-status={status} className={STATUS}>
        <Led kind={status} gesture={statusGestures[status]} />
      </span>
    </Tooltip>
  );
}

export interface CardRootProps extends React.HTMLAttributes<HTMLElement> {
  /** One of a set, chosen: the green ring. */
  selected?: boolean;
  /** Its work is under way (useWait's `busy`): aria-busy, and the lit edge after the show delay. */
  waiting?: boolean;
  /** The state of the thing it stands for: an LED at the end of the title's line. */
  status?: CardStatus;
  /** The status in words, its accessible name and tooltip ("Deploy failed"); default Live, Waiting, Failed. */
  statusLabel?: string;
  /** regular (pad 16, the default) or compact (pad 12). Inside a frame, the frame's size. */
  size?: CardSize;
  /** vertical (media on top, the default) or horizontal (square media at the start, for result lists). Inside a frame, the frame's. */
  orientation?: CardOrientation;
  /** The element: an article by default. */
  render?: useRender.ComponentProps<'article'>['render'];
}

function Root({ selected, waiting, status, statusLabel, size, orientation, render, className, children, ...props }: CardRootProps) {
  const body = useBody(size, orientation);
  const own = join(body.className, body.section ? SECTION : PLATE, className);
  return useRender({
    render,
    defaultTagName: 'article',
    props: {
      ...props,
      children: <>{children}{status && <Status status={status} label={statusLabel} />}{waiting && EDGE}</>,
      'data-size': body.size,
      'data-orientation': body.orientation,
      'data-status': status,
      'data-selected': selected ? '' : undefined,
      'data-waiting': waiting ? '' : undefined,
      'aria-current': selected ? 'true' : undefined,
      'aria-busy': waiting || undefined,
      className: own,
    },
  });
}

function Media({ className, alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={alt} className={className ? `${MEDIA} ${className}` : MEDIA} {...props} />;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Where the card goes: makes the whole card its link. */
  href?: string;
  /** Your own link element (a router's link), used with the stretched link's look. */
  render?: React.ReactElement;
  /** The heading level (3). */
  level?: 2 | 3 | 4;
}

function Title({ href, render, level = 3, className, children, ...props }: CardTitleProps) {
  const Tag = headings[level];
  const link = render
    ? React.cloneElement(render as React.ReactElement<{ className?: string; children?: React.ReactNode }>, { className: LINK, children })
    : href != null ? <a href={href} className={LINK}>{children}</a> : children;
  return <Tag className={className ? `${TITLE} ${className}` : TITLE} {...props}>{link}</Tag>;
}

export interface CardActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** What it does, for the card it is on: "More for Trip to Lisbon". Its accessible name. */
  label: string;
  /** The glyph: `more` by default. */
  icon?: React.ReactNode;
}

/** The corner action: a ghost icon key level with the title's first line, above the stretched link. */
const Action = React.forwardRef<HTMLButtonElement, CardActionProps>(function Action({ label, icon, className, ...props }, ref) {
  return <IconButton ref={ref} variant="ghost" label={label} icon={icon ?? <Icon name="more" />} className={className ? `${ACTION} ${className}` : ACTION} {...props} />;
});

function Description({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={className ? `${DESCRIPTION} ${className}` : DESCRIPTION} {...props} />;
}

function Footer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `${FOOTER} ${className}` : FOOTER} {...props} />;
}

export interface CardFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** separated (a sunk tray of raised peers, the default), stacked (one plate, sections between hairlines) or ghost (no tray). */
  variant?: CardFrameVariant;
  /** regular or compact, for the frame and every card in it. */
  size?: CardSize;
  /** horizontal makes every card in it a side card, one per row (a result list). */
  orientation?: CardOrientation;
}

/** Holds cards: peers in a tray, the sections of one plate, or a bare grid. */
const Frame = React.forwardRef<HTMLDivElement, CardFrameProps>(function Frame({ variant = 'separated', size = 'regular', orientation = 'vertical', className, ...props }, ref) {
  const value = React.useMemo(() => ({ variant, size, orientation }), [variant, size, orientation]);
  return (
    <FrameContext.Provider value={value}>
      <div ref={ref} data-variant={variant} data-size={size} data-orientation={orientation} className={join(FRAME, FRAME_LOOKS[variant], className)} {...props} />
    </FrameContext.Provider>
  );
});

interface ChoicesBase {
  className?: string;
  children?: React.ReactNode;
  /** The element: pass `<Card.Frame />` to set the choices in a tray. */
  render?: React.ReactElement;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}
export interface CardRadioChoicesProps extends ChoicesBase {
  /** One choice (a radio group, the default). */
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The form field's name. */
  name?: string;
}
export interface CardCheckboxChoicesProps extends ChoicesBase {
  /** Several choices (a checkbox group). */
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}
export type CardChoicesProps = CardRadioChoicesProps | CardCheckboxChoicesProps;

/** A set of choice cards: one of them (radio), or several with `multiple` (checkboxes). */
function Choices(props: CardChoicesProps) {
  if (props.multiple) {
    const { multiple, onValueChange, ...rest } = props;
    return (
      <ChoicesContext.Provider value={multiple}>
        <BaseCheckboxGroup {...rest} onValueChange={onValueChange && ((next) => onValueChange(next))} />
      </ChoicesContext.Provider>
    );
  }
  const { multiple, onValueChange, ...rest } = props;
  return (
    <ChoicesContext.Provider value={Boolean(multiple)}>
      <BaseRadioGroup {...rest} onValueChange={onValueChange && ((next) => onValueChange(next as string))} />
    </ChoicesContext.Provider>
  );
}

export interface CardChoiceProps extends Pick<React.HTMLAttributes<HTMLElement>, 'id' | 'style' | 'title' | 'className' | 'children' | 'aria-describedby'> {
  /** Its value in the set. */
  value: string;
  disabled?: boolean;
  /** Its work is under way: aria-busy and the lit edge, as a card waits. */
  waiting?: boolean;
  size?: CardSize;
  orientation?: CardOrientation;
}

/** A card you choose: it sinks when pressed and stays down, chosen, with the latch's green LED. */
const Choice = React.forwardRef<HTMLDivElement, CardChoiceProps>(function Choice({ value, disabled, waiting, size, orientation, className, children, ...props }, ref) {
  const multiple = React.useContext(ChoicesContext);
  const body = useBody(size, orientation);
  const shared = {
    ...props,
    ref,
    disabled,
    'data-size': body.size,
    'data-orientation': body.orientation,
    'data-waiting': waiting ? '' : undefined,
    'aria-busy': waiting || undefined,
    className: join(body.className, CHOICE, className),
  };
  const inside = (indicator: React.ReactNode) => <>{children}{indicator}{waiting && EDGE}</>;
  return multiple
    ? <BaseCheckbox.Root {...shared} value={value} nativeButton={false} render={<div />}>{inside(<BaseCheckbox.Indicator keepMounted className={LATCH} />)}</BaseCheckbox.Root>
    : <BaseRadio.Root {...shared} value={value} nativeButton={false} render={<div />}>{inside(<BaseRadio.Indicator keepMounted className={LATCH} />)}</BaseRadio.Root>;
});

export interface CardEmptySlotProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The verb: what pressing it makes ("New canvas"). Its accessible name. */
  children: React.ReactNode;
}

/** An empty place in the frame, sunk, with plus and a verb: where a new card will go. */
const EmptySlot = React.forwardRef<HTMLButtonElement, CardEmptySlotProps>(function EmptySlot({ className, children, type = 'button', ...props }, ref) {
  return (
    <button ref={ref} type={type} className={className ? `${SLOT} ${className}` : SLOT} {...props}>
      <Icon name="plus" />
      <span>{children}</span>
    </button>
  );
});

export const Card = Object.assign(Root, { Media, Title, Action, Description, Footer, Frame, Choices, Choice, EmptySlot, Root });
