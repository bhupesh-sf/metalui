'use client';

import * as React from 'react';
import { ChevronIcon } from '../../icons/components.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { SwapText } from '../../motion/swap';
import { IconButton } from '../icon-button/icon-button';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * BRANCH PICKER, which of a message's replies is showing ("2 / 3"), in Message's footer
 *
 *   keys      ghost icon keys, the chevron turned back and forward, each with a tooltip
 *   count     "2 / 3" in meta type, tabular figures, ink2; the number turns on the drum as you move
 *   ends      at the first reply Previous is disabled, at the last Next; a key that turns off under
 *             the person's focus hands focus to the other key
 *   one       a single reply: nothing is drawn
 * Reduce Motion: the number crossfades in place.
 * Semantics: a group named "Reply 2 of 3"; a polite status says it again when it changes.
 * ───────────────────────────────────────────────────────── */

export interface BranchPickerProps {
  /** Which reply shows, from 1. */
  index: number;
  /** How many replies there are; under 2 nothing is drawn. */
  count: number;
  /** Move to another reply (from 1). */
  onIndexChange: (index: number) => void;
  /** What a branch is called: "Reply" (the default), "Version". */
  label?: string;
  className?: string;
}

const ROOT = 'mu-branch-picker inline-flex items-center gap-branch-picker-gap';
const COUNT = 'mu-branch-picker-count px-branch-picker-count-pad type-meta tabular-nums text-ink2';

/** Moves between the replies to one question: previous, "2 / 3", next. */
export function BranchPicker({ index, count, onIndexChange, label = 'Reply', className }: BranchPickerProps) {
  const moved = React.useRef(false);
  const prev = React.useRef<HTMLButtonElement>(null);
  const next = React.useRef<HTMLButtonElement>(null);
  const handoff = React.useRef<React.RefObject<HTMLButtonElement | null> | null>(null);
  const at = Math.min(count, Math.max(1, index));
  // A key that turned off under focus would drop it to the page: the other key (now on) takes it.
  useIsoLayoutEffect(() => {
    handoff.current?.current?.focus();
    handoff.current = null;
  }, [at]);
  if (count < 2) return null;
  const go = (to: number) => {
    moved.current = true;
    if (to <= 1 && document.activeElement === prev.current) handoff.current = next;
    if (to >= count && document.activeElement === next.current) handoff.current = prev;
    onIndexChange(to);
  };
  const name = `${label} ${at} of ${count}`;
  return (
    <div role="group" aria-label={name} className={className ? `${ROOT} ${className}` : ROOT}>
      <Tooltip label={`Previous ${label.toLowerCase()}`}>
        <IconButton ref={prev} label={`Previous ${label.toLowerCase()}`} icon={<ChevronIcon turn={90} />} disabled={at <= 1} onClick={() => go(at - 1)} />
      </Tooltip>
      <span aria-hidden className={COUNT}><SwapText value={`${at} / ${count}`} /></span>
      <Tooltip label={`Next ${label.toLowerCase()}`}>
        <IconButton ref={next} label={`Next ${label.toLowerCase()}`} icon={<ChevronIcon turn={270} />} disabled={at >= count} onClick={() => go(at + 1)} />
      </Tooltip>
      <span role="status" className="sr-only">{moved.current ? name : ''}</span>
    </div>
  );
}
