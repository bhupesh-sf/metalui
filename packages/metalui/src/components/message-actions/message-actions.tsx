'use client';

import * as React from 'react';
import { PenIcon, RetryIcon, ThumbIcon } from '../../icons/components.generated';
import { MorphPair } from '../../icons/MorphIcon';
import { checkMorph, copyMorph } from '../../icons/morph.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { springOf } from '../../motion/rows';
import { SwapText } from '../../motion/swap';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * MESSAGE ACTIONS, the keys that act on a message, in Message's footer
 *
 *   keys      ghost icon keys 2 apart, each named and with a tooltip, each only when the host gives
 *             it: Copy, Retry, Edit (the pen), Good and Bad (the thumb, and the thumb turned over)
 *   copy      the copy glyph morphs to the check (strain 1.96) and the name turns to "Copied" for
 *             copy.hold, then back
 *   thumbs    toggles: the chosen one is latched (pressed); pressing it again clears
 *   reasons   choosing Bad with `reasons` fades in a row of compact buttons under the keys (settle);
 *             one press sends the reason, the row says "Thanks" on the drum for thanks.hold, and goes
 *   host      children after the keys (Share, More)
 * Reduce Motion: the row appears at once; glyphs and words change in place.
 * Semantics: a toolbar named "Message actions"; the thumbs are toggle buttons (aria-pressed); Copied is
 * said once through a status.
 * ───────────────────────────────────────────────────────── */

export type MessageFeedback = 'up' | 'down' | null;

export interface MessageActionsProps {
  /** The text Copy writes to the clipboard; omit for no Copy. */
  copy?: string;
  /** Write it again; omit for no Retry. */
  onRetry?: () => void;
  /** While another reply writes. */
  retryDisabled?: boolean;
  /** Edit what was said (the person's turn); omit for no Edit. */
  onEdit?: () => void;
  /** Which thumb is chosen (controlled). */
  feedback?: MessageFeedback;
  /** A thumb chosen or cleared; a reason after Bad when `reasons` are offered. Omit for no thumbs. */
  onFeedback?: (feedback: MessageFeedback, reason?: string) => void;
  /** Why it was bad, offered after Bad ("Not accurate", "Too long", "Other"). */
  reasons?: string[];
  /** The host's keys, after ours. */
  children?: React.ReactNode;
  className?: string;
}

const ROOT = 'mu-message-actions grid justify-items-start gap-message-actions-reasons-gap';
const KEYS = 'mu-message-actions-keys flex flex-wrap items-center gap-message-actions-gap';
const REASONS = 'mu-message-actions-reasons flex flex-wrap items-center gap-message-actions-reasons-gap';
const LATCH = 'data-pressed:recipe-icon-button-ghost-hover data-pressed:text-icon-button-ghost-ink-hover';
// The glyphs Copy morphs between, and only those (MorphPair ships just their parts).
const COPY = { copy: copyMorph, check: checkMorph };
const THANKS = 'mu-message-actions-thanks type-meta text-ink2';

/** True for the recipe's hold after each call, then false. */
function useHold(name: string) {
  const [held, setHeld] = React.useState(0);
  React.useEffect(() => {
    if (!held) return;
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 1600;
    const t = window.setTimeout(() => setHeld(0), ms);
    return () => window.clearTimeout(t);
  }, [held, name]);
  return [held > 0, () => setHeld((n) => n + 1)] as const;
}

function Key({ label, ...props }: React.ComponentProps<typeof IconButton>) {
  return <Tooltip label={label}><IconButton label={label} {...props} /></Tooltip>;
}

/** Copy, Retry, Edit and the thumbs for one message, with a reason after Bad. */
export function MessageActions({ copy, onRetry, retryDisabled, onEdit, feedback: feedbackProp, onFeedback, reasons, children, className }: MessageActionsProps) {
  const [own, setOwn] = React.useState<MessageFeedback>(null);
  const feedback = feedbackProp === undefined ? own : feedbackProp;
  const [copied, copiedNow] = useHold('--mu-r-message-actions-copy-hold');
  const [thanked, thank] = useHold('--mu-r-message-actions-thanks-hold');
  const [asking, setAsking] = React.useState(false);
  const row = React.useRef<HTMLDivElement>(null);

  // The reasons fade in when they appear (settle); under Reduce Motion the spring has no time.
  useIsoLayoutEffect(() => {
    const el = row.current;
    if (!asking || !el) return;
    const { ms, easing } = springOf(el, 'settle');
    if (ms) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing });
  }, [asking]);
  // Thanks said, the row goes.
  React.useEffect(() => { if (!thanked) setAsking(false); }, [thanked]);

  const choose = (next: 'up' | 'down') => {
    const value = feedback === next ? null : next;
    if (feedbackProp === undefined) setOwn(value);
    onFeedback?.(value);
    setAsking(value === 'down' && !!reasons?.length);
  };
  const because = (reason: string) => {
    onFeedback?.('down', reason);
    thank();
  };
  const copyNow = () => navigator.clipboard?.writeText(copy ?? '').then(copiedNow, copiedNow);

  return (
    <div role="toolbar" aria-label="Message actions" className={className ? `${ROOT} ${className}` : ROOT}>
      <div className={KEYS}>
        {copy !== undefined && (
          <Key label={copied ? 'Copied' : 'Copy'} icon={<MorphPair glyphs={COPY} name={copied ? 'check' : 'copy'} />} onClick={copyNow} />
        )}
        {onRetry && <Key label="Retry" icon={<RetryIcon />} disabled={retryDisabled} onClick={onRetry} />}
        {onEdit && <Key label="Edit" icon={<PenIcon />} onClick={onEdit} />}
        {onFeedback && (
          <>
            <Key label="Good response" className={LATCH} icon={<ThumbIcon />} pressed={feedback === 'up'} onClick={() => choose('up')} />
            <Key label="Bad response" className={LATCH} icon={<ThumbIcon className="rotate-180" />} pressed={feedback === 'down'} onClick={() => choose('down')} />
          </>
        )}
        {children}
        <span role="status" className="sr-only">{copied ? 'Copied' : thanked ? 'Thanks for the feedback' : ''}</span>
      </div>
      {asking && (
        <div ref={row} role="group" aria-label="What went wrong?" className={REASONS}>
          {thanked
            ? <span className={THANKS}><SwapText value="Thanks" /></span>
            : reasons!.map((r) => <Button key={r} size="compact" onClick={() => because(r)}>{r}</Button>)}
        </div>
      )}
    </div>
  );
}
