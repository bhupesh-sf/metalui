'use client';

import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { SwapText } from '../../motion/swap';
import { Spinner } from '../spinner/spinner';

/* ─────────────────────────────────────────────────────────
 * PROGRESS, how far a task has come, on Base UI Progress
 *
 *   running   the switch's sunk track; the fill is a whole green pill slid in from the start, so its
 *             leading edge is always round. A rising value moves it on the settle spring (no overshoot:
 *             it never claims more than is done); a falling one (reset, cancel) drains it back on the
 *             release spring
 *   unknown   value null: a short lit segment sweeps across the track and loops (1.4 s, ease-in-out)
 *   paused    the fill holds and dims
 *   failed    the fill stops where it was; the failed ink cross-fades over it
 *   complete  the fill finishes; once it lands, the head turns to its result (the glyph and label you
 *             pass for complete are held until then)
 *   head      [glyph] label ……… value or detail; the value and detail turn on the drum, tabular
 * Shapes: bar · slim (no head, along an edge) · ring (the spinner's ring with a value) · steps (one
 * well per known step) · buffer (a lighter second fill ahead). Sizes: regular · compact.
 * Reduce Motion: the edge snaps; the unknown segment breathes in place; the fades stay.
 * Slots: Progress.Root, Progress.Label, Progress.Value, Progress.Track.
 * ───────────────────────────────────────────────────────── */

export type ProgressState = 'running' | 'paused' | 'failed' | 'complete';
export type ProgressShape = 'bar' | 'slim' | 'ring';
export type ProgressSize = 'regular' | 'compact';

const ROOT = 'mu-progress grid min-w-0';
const ROOT_SIZE: Record<ProgressSize, string> = {
  regular: 'gap-progress-gap',
  compact: 'gap-progress-compact-gap',
};
const HEAD = 'mu-progress-head flex min-w-0 items-center';
const HEAD_SIZE: Record<ProgressSize, string> = {
  regular: 'gap-progress-glyph-gap [&>.mu-progress-glyph>svg]:size-progress-glyph',
  compact: 'gap-progress-glyph-gap [&>.mu-progress-glyph>svg]:size-progress-compact-glyph',
};
const GLYPH = 'mu-progress-glyph inline-flex flex-none text-ink2';
const LABEL_SIZE: Record<ProgressSize, string> = { regular: 'type-ui', compact: 'type-meta' };
const LABEL = 'mu-progress-label min-w-0 flex-1 truncate text-ink';
const VALUE = 'mu-progress-value inline-grid flex-none justify-items-end type-meta tabular-nums text-ink2';
const CELL = 'col-start-1 row-start-1';
const TRACK = 'mu-progress-track flex min-w-progress-min-width gap-progress-steps-gap';
const TRACK_HEIGHT: Record<ProgressShape, string> = {
  bar: 'h-progress-height',
  slim: 'h-progress-slim-height',
  ring: '',
};
const TRACK_COMPACT = 'h-progress-compact-height';
const WELL = 'mu-progress-well relative block h-full flex-1 rounded-pill overflow-hidden recipe-switch';
const FILL = 'mu-progress-fill block recipe-switch-on progress-fill';
const SEGMENT = 'mu-progress-fill block rounded-pill recipe-switch-on progress-segment';
const BUFFER = 'mu-progress-buffer block recipe-switch-on progress-buffer';
const RING = 'mu-progress mu-progress-ring inline-flex flex-none transition-opacity duration-settle data-[progress=paused]:opacity-progress-paused-dim data-[progress=failed]:text-red';

export interface ProgressProps extends Omit<BaseProgress.Root.Props, 'className' | 'children'> {
  /** Your own arrangement of Progress.Label, Progress.Value and Progress.Track, in place of the default. */
  children?: React.ReactNode;
  /** What is in progress: "Exporting 12 photos". Shown above the track (hidden on slim and ring), and names it. A string turns on the drum when it changes. */
  label?: React.ReactNode;
  /** The task's glyph before the label, sized by the head. Pass a MorphIcon whose name follows the state (download → check, sync-error). */
  icon?: React.ReactNode;
  /** Show the value (a percentage, or "Step 2 of 4") at the right of the head; it turns on the drum. */
  showValue?: boolean;
  /** Words in place of the value: "8 of 12 · about 20 s". Turns on the drum. */
  detail?: string;
  /** running (default), paused (holds and dims), failed (stops in the failed ink), complete (finishes, then the head turns). */
  state?: ProgressState;
  /** bar (default); slim, no head, along an edge; ring, the spinner's ring with a value, for a key or an avatar. */
  shape?: ProgressShape;
  /** Known steps: the track splits into one well per step; `value` counts the steps done (max defaults to `steps`). */
  steps?: number;
  /** How far is ready ahead of the value (media): a lighter second fill, on the same scale. */
  buffer?: number;
  /** regular (default) or compact, for a row or a toast. */
  size?: ProgressSize;
  className?: string;
}

const pct = (v: number, min: number, max: number) => (max > min ? Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)) : 0);

function Label({ className, ...props }: BaseProgress.Label.Props & { className?: string }) {
  return <BaseProgress.Label className={className ? `${LABEL} ${className}` : LABEL} {...props} />;
}

/** The value, turning on the drum; it reserves the width of 100 % so the label never moves. */
function Value({ className, ...props }: Omit<BaseProgress.Value.Props, 'children'> & { className?: string }) {
  return (
    <BaseProgress.Value className={className ? `${VALUE} ${className}` : VALUE} {...props}>
      {(formatted) => (
        <>
          <span className={`${CELL} invisible`} aria-hidden>100%</span>
          <SwapText className={CELL} value={formatted ?? ''} />
        </>
      )}
    </BaseProgress.Value>
  );
}

interface TrackProps { value?: number | null; buffer?: number | null; steps?: number; draining?: boolean; shape?: ProgressShape; size?: ProgressSize; fill?: React.Ref<HTMLSpanElement> }

/** The sunk track and its fill (one well per step when `steps` is set). Inside Root it reads nothing: pass the share (0–100). */
function Track({ value = null, buffer, steps, draining, shape = 'bar', size = 'regular', fill }: TrackProps) {
  const height = shape === 'bar' && size === 'compact' ? TRACK_COMPACT : TRACK_HEIGHT[shape];
  const wells = steps && steps > 1 ? steps : 1;
  return (
    <BaseProgress.Track className={`${TRACK} ${height}`}>
      {Array.from({ length: wells }, (_, i) => {
        // Each well fills its own share of the whole: well i holds the part of the value past i / wells.
        const share = (v: number) => Math.max(0, Math.min(100, (v - (i * 100) / wells) * wells));
        return (
          <span key={i} className={WELL}>
            {buffer != null && value != null && <span className={BUFFER} style={{ '--mu-progress-buffer': share(buffer) } as React.CSSProperties} />}
            {value == null
              ? <span className={SEGMENT} data-indeterminate="" />
              : <span ref={i === 0 ? fill : undefined} className={FILL} data-draining={draining ? '' : undefined} style={{ '--mu-progress-value': share(value) } as React.CSSProperties} />}
          </span>
        );
      })}
    </BaseProgress.Track>
  );
}

/** Which way the value last moved: down drains on the release spring. */
function useDraining(value: number | null) {
  const last = React.useRef<{ value: number | null; draining: boolean }>({ value, draining: false });
  if (value !== last.current.value) last.current = { value, draining: value != null && last.current.value != null && value < last.current.value };
  return last.current.draining;
}

/** Complete holds the head until the fill has landed (its travel time; none under Reduce Motion). */
function useLanded(complete: boolean, fill: React.RefObject<HTMLSpanElement | null>) {
  const [landed, setLanded] = React.useState(complete);
  React.useEffect(() => {
    if (!complete) { setLanded(false); return; }
    const el = fill.current;
    const wait = el ? parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0 : 0;
    const timer = window.setTimeout(() => setLanded(true), wait);
    return () => window.clearTimeout(timer);
  }, [complete, fill]);
  return landed;
}

const said = (node: React.ReactNode) => (typeof node === 'string' ? <SwapText value={node} /> : node);

/** A task's progress. `value` from `min` to `max` (100, or `steps`); `null` when the amount is unknown. */
function Root({ label, icon, showValue, detail, state = 'running', shape = 'bar', steps, buffer, size = 'regular', className, children, value = null, min = 0, max, getAriaValueText, ...props }: ProgressProps) {
  const top = max ?? (steps && steps > 1 ? steps : 100);
  const complete = state === 'complete';
  const shown = complete ? top : value;
  const draining = useDraining(shown);
  const fill = React.useRef<HTMLSpanElement>(null);
  const landed = useLanded(complete, fill);
  // Until the fill lands, complete keeps the head it had while running.
  const head = React.useRef({ label, icon });
  if (!complete) head.current = { label, icon };
  const face = complete && !landed ? head.current : { label, icon };

  const share = shown == null ? null : pct(shown, min, top);
  const stepText = steps && steps > 1 && shown != null ? `Step ${Math.min(steps, Math.floor(shown) + 1)} of ${steps}` : null;
  const valueText = getAriaValueText ?? (stepText ? () => stepText : undefined);
  const name = typeof face.label === 'string' ? face.label : undefined;
  const base = { value: shown, min, max: top, getAriaValueText: valueText, 'data-progress': state, ...props };

  if (shape === 'ring') {
    return (
      <BaseProgress.Root {...base} render={<span />} className={className ? `${RING} ${className}` : RING}>
        {face.label != null && <Label className="sr-only">{face.label}</Label>}
        <Spinner aria-hidden size={size === 'compact' ? 'small' : 'regular'} value={share} phase={complete && landed ? 'done' : undefined} label={name} result={name} />
      </BaseProgress.Root>
    );
  }

  const own = `${ROOT} ${ROOT_SIZE[size]}`;
  const bare = shape === 'slim';
  const right = detail != null
    ? <span className="mu-progress-value flex-none type-meta tabular-nums text-ink2"><SwapText value={detail} /></span>
    : showValue && shown != null
      ? stepText ? <span className="mu-progress-value flex-none type-meta tabular-nums text-ink2"><SwapText value={stepText} /></span> : <Value />
      : null;
  return (
    <BaseProgress.Root {...base} className={className ? `${own} ${className}` : own}>
      {children ?? (
        bare
          ? face.label != null && <Label className="sr-only">{face.label}</Label>
          : (face.label != null || face.icon != null || right) && (
            <span className={`${HEAD} ${HEAD_SIZE[size]}`}>
              {face.icon != null && <span className={GLYPH} aria-hidden>{face.icon}</span>}
              {face.label != null ? <Label className={LABEL_SIZE[size]}>{said(face.label)}</Label> : <span className="flex-1" />}
              {right}
            </span>
          )
      )}
      {children == null && <Track value={share} buffer={buffer == null ? null : pct(buffer, min, top)} steps={steps} draining={draining} shape={shape} size={size} fill={fill} />}
    </BaseProgress.Root>
  );
}

export const Progress = Object.assign(Root, { Label, Value, Track, Root });
