'use client';

import * as React from 'react';
import { SwapText } from '../../motion/swap';
import { Collapsible } from '../collapsible/collapsible';
import { Led } from '../led/led';

/* ─────────────────────────────────────────────────────────
 * REASONING, the assistant's thinking inside its reply
 *
 *   streaming  the row: the amber lamp breathing and "Thinking"; the fold is open and the thought
 *              arrives in it (Collapsible's reveal on the settle spring)
 *   done       streaming turns off: the fold shuts (release spring) and the words turn on the drum to
 *              "Thought for 4 s" beside the off lamp; under a second, "Thought for a moment"
 *   seconds    measured from streaming on to off (nothing ticks while it thinks), or the host's duration
 *   yours      once the person presses the row, streaming no longer opens or shuts it
 *   thought    body type, ink2, beside an engraved rule at the start: the answer's margin, not the answer
 *   steps      a Timeline as the children, with `label` for the row's words ("Worked for 12 s")
 * Reduce Motion: the fold crossfades; the lamp holds steady; the drum changes in place.
 * Semantics: Collapsible's button (aria-expanded) named by its words; busy while it streams.
 * ───────────────────────────────────────────────────────── */

export interface ReasoningProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title' | 'onChange'> {
  /** The model is thinking: the lamp breathes, the row says "Thinking", and the fold stays open. */
  streaming?: boolean;
  /** How long it thought, in ms, when the host knows (restored history). Otherwise it is measured. */
  duration?: number;
  /** The row's words once done, in place of "Thought for 4 s" ("Worked for 12 s · 4 steps"). */
  label?: string;
  /** Open, controlled. Leave it out and the fold follows `streaming` until the person presses it. */
  open?: boolean;
  /** Open at first (default: while streaming). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The thought, or steps (a Timeline). */
  children?: React.ReactNode;
}

const ROOT = 'mu-reasoning';
const HEAD = 'mu-reasoning-head inline-flex min-w-0 items-center gap-reasoning-row-gap text-ink2';
// The lamp's slot is the small ring's size, as Tool call's: lamps line up down a reply, and the socket
// (outside the lamp's box) isn't cut by the row's truncation.
const SLOT = 'grid flex-none size-spinner-small place-items-center';
const BODY ='flex gap-reasoning-panel-indent py-reasoning-panel-pad-y';
const RULE = 'block w-rule-thickness flex-none recipe-rule';
const THOUGHT = 'mu-reasoning-thought min-w-0 flex-1 whitespace-pre-wrap break-words type-body text-ink2';

/** "Thought for 4 s", "Thought for 1:12", or "Thought for a moment" under a second. */
function thoughtFor(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 1) return 'Thought for a moment';
  if (s < 60) return `Thought for ${s} s`;
  return `Thought for ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The assistant's thinking: open while it streams, folded to "Thought for 4 s" when the answer starts. */
export function Reasoning({ streaming = false, duration, label, open: openProp, defaultOpen, onOpenChange, className, children, ...props }: ReasoningProps) {
  const [own, setOwn] = React.useState(defaultOpen ?? streaming);
  const [seen, setSeen] = React.useState(streaming);
  const [yours, setYours] = React.useState(false);
  const [took, setTook] = React.useState<number>();
  const start = React.useRef<number | null>(null);

  // A new `streaming` opens or shuts the fold, until the person has pressed it.
  if (seen !== streaming) {
    setSeen(streaming);
    if (!yours) setOwn(streaming);
  }
  React.useEffect(() => {
    if (streaming) start.current ??= performance.now();
    else if (start.current != null) {
      setTook(performance.now() - start.current);
      start.current = null;
    }
  }, [streaming]);

  const ms = duration ?? took;
  const words = streaming ? 'Thinking' : label ?? (ms != null ? thoughtFor(ms) : 'Thought');
  return (
    <Collapsible.Root
      open={openProp ?? own}
      onOpenChange={(next) => {
        setYours(true);
        setOwn(next);
        onOpenChange?.(next);
      }}
      data-streaming={streaming ? '' : undefined}
      aria-busy={streaming || undefined}
      className={className ? `${ROOT} ${className}` : ROOT}
      {...props}
    >
      <Collapsible.Trigger>
        <span className={HEAD}>
          <span aria-hidden className={SLOT}>
            <Led kind={streaming ? 'waiting' : 'off'} size="small" gesture={streaming ? 'breathe' : 'steady'} />
          </span>
          <SwapText value={words} />
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <div className={BODY}>
          <span aria-hidden className={RULE} />
          <div className={THOUGHT}>{children}</div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
