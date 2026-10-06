'use client';

import * as React from 'react';
import { CheckIcon, CloseIcon, TrashIcon } from '../../icons/components.generated';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';

/* ─────────────────────────────────────────────────────────
 * CONFIRMATION, the agent asks before it acts, and what was decided stays
 *
 *   asking    an urgent Alert on its plate: the amber lamp steady, the warning glyph, read out at once;
 *             the question as its title, what will happen under it, the answers Deny then Allow
 *             (compact; Allow the primary cap)
 *   destructive  Allow is the destructive cap with the trash and Button's hold: held for the hold time
 *             it runs; let go early and the hint fades in under the answers (said once)
 *   decided   the host passes back `decision`: the plate goes (quiet), the glyph morphs to the note's,
 *             and the answers give way to the decision (a check or a cross and "Allowed" / "Denied",
 *             then the host's time), said politely
 * Reduce Motion: the alert's own (the glyph crossfades); the hold's fill still runs.
 * Semantics: role alert while asking, status once decided (the Alert's kinds).
 * ───────────────────────────────────────────────────────── */

export type ConfirmationDecision = 'allowed' | 'denied';

export interface ConfirmationProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  /** The question: "Delete 3 files?" */
  title: React.ReactNode;
  /** What was decided, kept by the host. Leave it out while asking. */
  decision?: ConfirmationDecision;
  /** An answer: keep it and pass it back as `decision`. */
  onDecide?: (decision: ConfirmationDecision) => void;
  /** An act that can't be undone: Allow is the destructive cap, held to confirm. */
  destructive?: boolean;
  /** The yes ("Run", "Delete"). */
  allowLabel?: string;
  /** The no ("Skip"). */
  denyLabel?: string;
  /** The record of a yes. */
  allowedLabel?: string;
  /** The record of a no. */
  deniedLabel?: string;
  /** The hold's hint, and the end of Allow's name. */
  holdHint?: string;
  /** When it was decided: a short time after the word. */
  time?: Date | string | number;
  /** What will happen: the files, the command, the amount. */
  children?: React.ReactNode;
}

const ROOT = 'mu-confirmation';
const DECISION = 'mu-confirmation-decision inline-flex items-center gap-confirmation-decision-gap type-meta text-ink2 [&>svg]:size-confirmation-decision-glyph';
const HINT = 'mu-confirmation-hint m-0 mt-confirmation-hint-gap type-meta text-ink3 transition-opacity ease-surface duration-surface starting:opacity-0';

function clock(time: Date | string | number) {
  const d = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(d.getTime())) return null;
  return <time className="text-ink3 tabular-nums" dateTime={d.toISOString()}>{d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>;
}

/** The agent's question with Allow and Deny; once answered, what was decided. */
export function Confirmation({
  title, decision, onDecide, destructive = false, allowLabel = 'Allow', denyLabel = 'Deny', allowedLabel = 'Allowed', deniedLabel = 'Denied',
  holdHint = 'Hold to confirm', time, className, children, ...props
}: ConfirmationProps) {
  const [hint, setHint] = React.useState('');
  const allow = () => onDecide?.('allowed');
  return (
    <Alert
      kind={decision ? 'note' : 'urgent'}
      tone={decision ? 'quiet' : 'plate'}
      data-decision={decision}
      className={className ? `${ROOT} ${className}` : ROOT}
      {...props}
    >
      <Alert.Title>{title}</Alert.Title>
      {children != null && <Alert.Description>{children}</Alert.Description>}
      <Alert.Actions>
        {decision
          ? (
            <span className={DECISION}>
              {decision === 'allowed' ? <CheckIcon aria-hidden /> : <CloseIcon aria-hidden />}
              <span>{decision === 'allowed' ? allowedLabel : deniedLabel}</span>
              {time != null && clock(time)}
            </span>
          )
          : (
            <>
              <Button size="compact" onClick={() => onDecide?.('denied')}>{denyLabel}</Button>
              {destructive
                ? <Button size="compact" cap="destructive" icon={<TrashIcon />} hold holdHint={holdHint} onHoldHint={() => setHint(holdHint)} onClick={allow}>{allowLabel}</Button>
                : <Button size="compact" cap="primary" onClick={allow}>{allowLabel}</Button>}
            </>
          )}
      </Alert.Actions>
      {!decision && hint && <p aria-hidden className={HINT}>{hint}</p>}
      {!decision && <span role="status" className="sr-only">{hint}</span>}
    </Alert>
  );
}
