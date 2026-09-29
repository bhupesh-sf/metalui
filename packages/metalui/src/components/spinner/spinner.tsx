'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * SPINNER, something is working and will be done soon, in a small space
 *
 *     0 ms   mounted, invisible: a quick action never flashes it
 *   400 ms   it fades in (160 ms): a sunk round well with a lit green arc and its tail
 *   always   the arc turns at a constant 900 ms a turn, linear: steady work has no spring
 *   gone     unmounted by the host when the work is done (no exit: the result is the news)
 * Reduce Motion: the arc stands still and breathes.
 * The well is the switch recipe's sunk track; the spinner recipe adds the arc and its motion.
 * ───────────────────────────────────────────────────────── */

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** regular (16) beside text; small (12) inside compact controls. */
  size?: 'regular' | 'small';
  /** What is working, for assistive tech: "Saving". Defaults to "Loading". */
  label?: string;
}

const ROOT = 'mu-spinner relative inline-block flex-none rounded-full recipe-switch spinner-arrive';
const SIZE = { regular: 'size-spinner-size', small: 'size-spinner-small' };

/** A small sign of steady work. Mount it while the work runs; it shows only after a beat. */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner({ size = 'regular', label = 'Loading', className, ...props }, ref) {
  return (
    <span ref={ref} role="status" aria-label={label} data-size={size} className={[ROOT, SIZE[size], className].filter(Boolean).join(' ')} {...props}>
      <span aria-hidden className="mu-spinner-arc spinner-arc" />
    </span>
  );
});
