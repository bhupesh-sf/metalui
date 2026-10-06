'use client';

import * as React from 'react';
import { TICK } from '../../icons/tick.generated';
import type { WaitPhase } from '../../motion/wait';

/* ─────────────────────────────────────────────────────────
 * SPINNER, waiting shown where the wait is (useWait is its clock)
 *
 * THE RING, in the item's glyph slot, sized by the slot and in the slot's ink
 *   quiet     the item's own glyph (children) stays; the item is held, nothing shows yet
 *   shown     the glyph fades out (160 ms) as an arc fades in and turns, 900 ms a turn, linear
 *   known     value 0–100: the arc gives way to a faint track that fills from twelve o'clock on the
 *             settle spring (the amount is known: it fills rather than spins)
 *   done      the arc fades while a pen draws the check glyph's tick (280 ms); after the result time
 *             the tick fades and the glyph comes back
 *   bare      no phase: mount it while the work runs; it shows after the show delay (400 ms)
 * THE BAR (Spinner.Bar), a thin lit bar across the top of a place, for a route change
 *   shown     it creeps toward the end (9 s, easing out, never arriving)
 *   done      it completes (260 ms) and fades
 * THE WORDS (Spinner.Text), a working line said in words: "Searching the web"
 *   active    the words in ink2; after the show delay a light passes across them (1.8 s, linear):
 *             a window of the words in full ink slides over while its copy slides back, so only the
 *             light moves (translate only)
 *   still     active false: the words alone, nothing running
 * Reduce Motion: nothing turns or creeps; the arc, the bar and the words breathe in place; the tick is whole.
 * Assistive tech: with a phase, a polite status says `label` when the sign shows and `result` when done.
 * ───────────────────────────────────────────────────────── */

export interface SpinnerProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'children'> {
  /** regular (16) or small (12) where the host has no glyph size of its own; a host's glyph slot sizes it. */
  size?: 'regular' | 'small';
  /** What is working, for assistive tech: "Uploading photo.jpg". Defaults to "Loading". */
  label?: string;
  /** From useWait: where the wait is. Leave it out to show the ring after the show delay on mount. */
  phase?: WaitPhase;
  /** 0–100 once the amount is known: the ring fills instead of turning. */
  value?: number | null;
  /** Said when done: "Uploaded". Defaults to "Done". */
  result?: string;
  /** The item's own glyph, which the ring stands in for while it shows. */
  children?: React.ReactNode;
}

const RING = 'mu-spinner spinner-ring flex-none';
const SIZE = { regular: 'size-spinner-size', small: 'size-spinner-small' };
const SAID: Partial<Record<WaitPhase, true>> = { shown: true, done: true };

function Root({ size = 'regular', label = 'Loading', phase, value, result = 'Done', children, className, style, ...props }: SpinnerProps, ref: React.ForwardedRef<SVGSVGElement>) {
  const known = value != null;
  const drawn = phase == null || children != null || phase === 'shown' || phase === 'done';
  const role = known ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(value) }
    : phase == null ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true };
  const ring = drawn && (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      data-size={size}
      data-phase={phase}
      data-known={known ? '' : undefined}
      className={[RING, SIZE[size], className].filter(Boolean).join(' ')}
      style={known ? { ...style, '--mu-spinner-value': Math.max(0, Math.min(100, value)) } as React.CSSProperties : style}
      {...role}
      {...props}
    >
      {children}
      <circle className="mu-spinner-arc" cx={12} cy={12} pathLength={100} />
      <circle className="mu-spinner-track" cx={12} cy={12} />
      <circle className="mu-spinner-fill" cx={12} cy={12} pathLength={100} />
      <polyline className="mu-spinner-tick" points={[TICK.start, TICK.corner, TICK.tip].map((p) => `${p.x},${p.y}`).join(' ')} pathLength={1} />
    </svg>
  );
  if (phase == null) return ring;
  return <>{ring}<Status phase={phase} label={label} result={result} /></>;
}

export interface SpinnerStatusProps {
  /** From useWait. */
  phase: WaitPhase;
  /** Said when the sign shows: "Lifting the subject". */
  label: string;
  /** Said when done: "Subject lifted". Defaults to "Done". */
  result?: string;
}

/**
 * The wait, said politely and only twice: when its sign shows, and when it is done. The ring carries one;
 * a host whose sign is its own (a card's edge, an avatar's rim, a lamp, the bar) mounts one beside it,
 * before the work starts, so both are heard. A failure is the host's to say, with its words and Try again.
 */
function Status({ phase, label, result = 'Done' }: SpinnerStatusProps) {
  return <span role="status" className="sr-only">{SAID[phase] ? (phase === 'done' ? result : label) : ''}</span>;
}

export interface SpinnerBarProps {
  /** From useWait. Leave it out to show the bar after the show delay on mount. */
  phase?: WaitPhase;
  /** 0–100 once the amount is known. */
  value?: number | null;
  /** What is loading, when the amount is known: "Loading Notes". */
  label?: string;
  className?: string;
}

/** A thin bar across the top of a place (its host is positioned): a route change, a view loading. */
function Bar({ phase, value, label = 'Loading', className }: SpinnerBarProps) {
  const known = value != null;
  const own = 'mu-spinner-bar spinner-bar';
  return (
    <div
      data-phase={phase}
      data-known={known ? '' : undefined}
      className={className ? `${own} ${className}` : own}
      style={known ? { '--mu-spinner-value': Math.max(0, Math.min(100, value)) } as React.CSSProperties : undefined}
      {...(known ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(value) } : { 'aria-hidden': true })}
    >
      <span className="recipe-switch-on" />
    </div>
  );
}

export interface SpinnerTextProps {
  /** What is working, in words: "Searching the web". */
  children: string;
  /** False when the work is over: the words stay, the light stops. Default true. */
  active?: boolean;
  className?: string;
}

const WORDS = 'mu-spinner-text spinner-text';

/** A wait said in words, with a light passing across them: a working line under a reply, a tool's progress. */
function Text({ children, active = true, className }: SpinnerTextProps) {
  return (
    <span role="status" data-active={active ? '' : undefined} className={className ? `${WORDS} ${className}` : WORDS}>
      <span className="mu-spinner-text-words text-ink2">{children}</span>
      {active && <span aria-hidden className="mu-spinner-text-sheen text-ink"><span>{children}</span></span>}
    </span>
  );
}

/** Waiting, shown where it happens: a ring in an item's glyph slot (Spinner.Bar for a place, Spinner.Text in words, Spinner.Status to say it). */
export const Spinner = Object.assign(React.forwardRef(Root), { Bar, Status, Text });
