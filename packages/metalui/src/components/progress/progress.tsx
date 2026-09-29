'use client';

import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';

/* ─────────────────────────────────────────────────────────
 * PROGRESS, how far a task has come, on Base UI Progress
 *
 *   known     the switch's sunk track fills with the switch's green; each new value moves the
 *             fill's edge on the settle spring (no overshoot: it never claims more than is done)
 *   unknown   value null: a short lit segment sweeps across the track and loops (1.4 s,
 *             ease-in-out): working, amount unknown
 *   complete  full; the value reads 100 %
 *   text      an optional label at the left above the track, the value at the right
 * Reduce Motion: the fill's edge snaps; the unknown segment breathes in place instead of sweeping.
 * The look is the switch recipe; the progress recipe adds the size, text and motion.
 * Slots: Progress.Root, Progress.Label, Progress.Value, Progress.Track.
 * ───────────────────────────────────────────────────────── */

const ROOT = 'mu-progress grid min-w-progress-min-width gap-progress-gap';
const HEAD = 'mu-progress-head flex items-baseline justify-between gap-progress-gap';
const LABEL = 'mu-progress-label type-ui text-ink';
const VALUE = 'mu-progress-value type-meta tabular-nums text-ink2';
const TRACK = 'mu-progress-track relative block h-progress-height rounded-pill overflow-hidden recipe-switch';
const FILL = 'mu-progress-fill block h-full rounded-pill recipe-switch-on transition-progress-fill data-indeterminate:progress-segment';

export interface ProgressProps extends Omit<BaseProgress.Root.Props, 'className' | 'children'> {
  /** Your own arrangement of Progress.Label, Progress.Value and Progress.Track, in place of the default. */
  children?: React.ReactNode;
  /** What is in progress: "Uploading 12 photos". Shown above the track, and names it. */
  label?: React.ReactNode;
  /** Show the value (a percentage by default) at the right above the track. */
  showValue?: boolean;
  className?: string;
}

function Track() {
  return (
    <BaseProgress.Track className={TRACK}>
      <BaseProgress.Indicator className={FILL} />
    </BaseProgress.Track>
  );
}

function Label({ className, ...props }: BaseProgress.Label.Props & { className?: string }) {
  return <BaseProgress.Label className={className ? `${LABEL} ${className}` : LABEL} {...props} />;
}

function Value({ className, ...props }: BaseProgress.Value.Props & { className?: string }) {
  return <BaseProgress.Value className={className ? `${VALUE} ${className}` : VALUE} {...props} />;
}

/** A task's progress. `value` from 0 to `max` (100); `null` when the amount is unknown. */
function Root({ label, showValue, className, children, ...props }: ProgressProps) {
  return (
    <BaseProgress.Root className={className ? `${ROOT} ${className}` : ROOT} {...props}>
      {children ?? ((label != null || showValue) && (
        <span className={HEAD}>
          {label != null ? <Label>{label}</Label> : <span />}
          {showValue && props.value != null && <Value />}
        </span>
      ))}
      {children == null && <Track />}
    </BaseProgress.Root>
  );
}

export const Progress = Object.assign(Root, { Label, Value, Track, Root });
