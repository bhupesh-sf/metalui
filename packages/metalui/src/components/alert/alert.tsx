'use client';

import * as React from 'react';
import { Icon } from '../../icons/Icon';
import { MorphIcon } from '../../icons/MorphIcon';
import type { MorphIconName } from '../../icons/morph.generated';
import { leaveRows } from '../../motion/rows';
import { IconButton } from '../icon-button/icon-button';
import { Led, type LedGesture, type LedKind } from '../led/led';

/* ─────────────────────────────────────────────────────────
 * ALERT, a message about this place (top of a form, inside a card, along a page)
 *
 *   window    the kind's glyph engraved in a 28 sunk window, its LED seated in the top right
 *             corner: the shape says the kind, the lamp's colour and gesture say it again
 *   words     a title (title type) and a description (body type, ink2); the title says the kind in words
 *   actions   beside the words from 480 wide, under them when narrower
 *   tones     plate (raised, the status badge's plate), quiet (no plate: cards and panels),
 *             strong (tinted in the kind's ink: one per view); solid adds the keyline on see-through grounds
 *   over time arrives rising one nest from below (settle, T9); a new kind morphs the glyph and plays the
 *             new lamp's gesture; dismissed (close key or Esc) it leaves one nest down (release), then
 *             onDismiss removes it. It never leaves by itself: a message in the flow that vanishes moves the page.
 * failed and urgent are read out at once (role alert); note, done and waiting politely (role status).
 * Reduce Motion: it fades in and goes at once. Not a toast (your own action's result, floating, timed),
 * not a status badge (a few words for a lasting system state), not an alert dialog (blocks until answered).
 * ───────────────────────────────────────────────────────── */

export type AlertKind = 'note' | 'done' | 'waiting' | 'urgent' | 'failed';
export type AlertTone = 'plate' | 'quiet' | 'strong';

// ponytail: `note` and `bell` stand in for the info and warning glyphs the set lacks (docs/sheets/alert.md).
const glyphOf: Record<AlertKind, MorphIconName> = { note: 'note', done: 'check', waiting: 'clock', urgent: 'bell', failed: 'sync-error' };
const lampOf: Record<AlertKind, { led: LedKind; gesture: LedGesture } | null> = {
  note: null,
  done: { led: 'live', gesture: 'steady' },
  waiting: { led: 'waiting', gesture: 'breathe' },
  urgent: { led: 'waiting', gesture: 'steady' },
  failed: { led: 'failed', gesture: 'blink2' },
};
const STRONG: Record<AlertKind, string> = {
  note: 'recipe-status-badge',
  done: 'recipe-status-badge-strong-live',
  waiting: 'recipe-status-badge-strong-waiting',
  urgent: 'recipe-status-badge-strong-waiting',
  failed: 'recipe-status-badge-strong-failed',
};
const DEEP: Record<AlertKind, string> = {
  note: 'text-ink',
  done: 'text-status-strong-ink-live',
  waiting: 'text-status-strong-ink-waiting',
  urgent: 'text-status-strong-ink-waiting',
  failed: 'text-status-strong-ink-failed',
};

const ROOT = 'mu-alert alert-frame alert-arrive relative flex items-start gap-alert-gap text-ink';
const PLATE = 'p-alert-pad rounded-alert-radius';
const BANNER = 'py-alert-pad px-alert-banner-pad rounded-none';
const QUIET = 'py-alert-pad reduce-transparency:px-alert-pad reduce-transparency:rounded-alert-radius reduce-transparency:recipe-status-badge';
const KEYLINE = 'outline -outline-offset-1 outline-status-badge-keyline';
const AUTO_KEYLINE = 'reduce-transparency:outline reduce-transparency:-outline-offset-1 reduce-transparency:outline-status-badge-keyline';
const WINDOW = 'mu-alert-window relative grid place-items-center flex-none size-alert-window-size rounded-alert-window-radius recipe-well-field [&>svg]:size-alert-window-glyph';
const LAMP_SEAT = 'absolute -top-alert-window-lamp-inset -right-alert-window-lamp-inset';
const BODY = 'mu-alert-body alert-body flex-1 min-w-0';
const TITLE = 'mu-alert-title m-0 type-title';
const DESCRIPTION = 'mu-alert-description m-0 type-body';
const ACTIONS = 'mu-alert-actions flex flex-wrap items-center gap-alert-actions-gap';

const AlertContext = React.createContext<{ kind: AlertKind; tone: AlertTone }>({ kind: 'note', tone: 'plate' });

export interface AlertRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** What it says: note (worth knowing), done, waiting (under way; it will update), urgent (act soon), failed. */
  kind?: AlertKind;
  /** plate (default), quiet (no plate, inside a card or panel), strong (tinted in the kind's ink: one per view). */
  tone?: AlertTone;
  /** Along the top of a page: square ends, spanning its container. One per page. */
  banner?: boolean;
  /** On frost, glass or an image: the plate keeps a keyline. Reduce Transparency turns it on. */
  solid?: boolean;
  /** Makes it dismissible: a close key (and Esc inside it) plays the leave, then calls this; remove it there. */
  onDismiss?: () => void;
  /** The close key's name. */
  dismissLabel?: string;
}

const Root = React.forwardRef<HTMLDivElement, AlertRootProps>(function AlertRoot(
  { kind = 'note', tone = 'plate', banner = false, solid = false, onDismiss, dismissLabel = 'Dismiss', className, children, onKeyDown, ...props },
  ref,
) {
  const own = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => own.current as HTMLDivElement);
  const leaving = React.useRef(false);
  const lamp = lampOf[kind];
  const strong = tone === 'strong';
  const look = tone === 'quiet' && !solid ? QUIET : `${banner ? BANNER : PLATE} ${strong ? STRONG[kind] : 'recipe-status-badge'}`;
  const cls = `${ROOT} ${look} ${solid ? KEYLINE : AUTO_KEYLINE}${className ? ` ${className}` : ''}`;

  const dismiss = () => {
    if (!onDismiss || leaving.current) return;
    leaving.current = true;
    leaveRows([own.current], onDismiss);
  };

  return (
    <AlertContext.Provider value={{ kind, tone }}>
      <div
        ref={own}
        role={kind === 'failed' || kind === 'urgent' ? 'alert' : 'status'}
        data-kind={kind}
        data-tone={tone}
        data-banner={banner ? '' : undefined}
        data-solid={solid ? '' : undefined}
        className={cls}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.key === 'Escape' && onDismiss && !e.defaultPrevented) {
            e.stopPropagation();
            dismiss();
          }
        }}
        {...props}
      >
        <span aria-hidden className={`${WINDOW} ${strong ? DEEP[kind] : 'text-ink2'}`}>
          <MorphIcon name={glyphOf[kind]} size={16} />
          {lamp && <Led kind={lamp.led} gesture={lamp.gesture} className={LAMP_SEAT} />}
        </span>
        <div className={BODY}>{children}</div>
        {onDismiss && <IconButton variant="ghost" label={dismissLabel} icon={<Icon name="close" />} onClick={dismiss} />}
      </div>
    </AlertContext.Provider>
  );
});

/** What it's about, in words that say the kind: "Couldn't save the plan", "Importing 240 notes". */
const Title = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(function AlertTitle({ className, ...props }, ref) {
  const { kind, tone } = React.useContext(AlertContext);
  const ink = tone === 'strong' ? DEEP[kind] : 'text-ink';
  return <p ref={ref} className={`${TITLE} ${ink}${className ? ` ${className}` : ''}`} {...props} />;
});

/** What happened and what to do; it wraps. */
const Description = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function AlertDescription({ className, ...props }, ref) {
  const { tone } = React.useContext(AlertContext);
  return <div ref={ref} className={`${DESCRIPTION} ${tone === 'strong' ? 'text-ink' : 'text-ink2'}${className ? ` ${className}` : ''}`} {...props} />;
});

/** The alert's actions: compact Buttons, the one that fixes it first. */
const Actions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function AlertActions({ className, ...props }, ref) {
  return <div ref={ref} className={className ? `${ACTIONS} ${className}` : ACTIONS} {...props} />;
});

/** An inline message about this place: Alert.Root with Alert.Title, Alert.Description and Alert.Actions. */
export const Alert = Object.assign(Root, { Root, Title, Description, Actions });
export type AlertProps = AlertRootProps;
