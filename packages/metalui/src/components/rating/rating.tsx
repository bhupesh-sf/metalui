'use client';

import * as React from 'react';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { SwapText } from '../../motion/swap';

/* ─────────────────────────────────────────────────────────
 * RATING, how good something is on a short scale, on Base UI RadioGroup
 *
 * Not stars: the slider's groove cut into one detent per point (the meter's segments), filled with
 * the slider's green, the colour of an amount someone set.
 *
 *   read-only  the detents filled to the value; a decimal fills that share of its detent, cut square;
 *              the value beside them ("4.3") and the count in ink3 ("(1,284)"). One role="img"
 *   rest       lit up to the value, the well's groove above it
 *   hover      the detents a press would change turn to a ghost of their lit look (the ones it would
 *              light, or the ones it would put out); the readout turns on the drum to the value under
 *              the pointer, or "Not rated" over the chosen one (a press there clears)
 *   press      the detent dips on the part spring and latches
 *   change     the run sweeps from its old edge, one detent every 16 ms, each fading 90 ms (the meter's)
 *   clear      press the chosen detent again, or Backspace / Delete
 *   focus      the green ring on the focused detent (keyboard only); ← → ↑ ↓ move and choose
 *   disabled   40 %, no hover, no press
 * Reduce Motion: detents change at once, no dip; the drum crossfades.
 * ───────────────────────────────────────────────────────── */

export type RatingSize = 'compact' | 'regular' | 'large';

export interface RatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> {
  /** The rating: a whole number from 1 to `max`, or null for none. Read-only, any decimal ("4.3"). */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** How many points (5); one detent each. Above 10, use a Slider. */
  max?: number;
  /** Shows a rating; nothing to press. */
  readOnly?: boolean;
  /** How many ratings the value averages, shown after it in ink3: "(1,284)". */
  count?: number;
  /** One word per point ("Poor" … "Excellent"): the readout says it instead of the number. */
  labels?: string[];
  /** The readout with no rating ("Not rated"). */
  emptyLabel?: string;
  /** The value beside the detents (true). */
  showValue?: boolean;
  /** compact 28, regular 32 (default), large 44: the row's height and the detents with it. */
  size?: RatingSize;
  disabled?: boolean;
  /** Posts the value with a form. */
  name?: string;
  required?: boolean;
}

const ROOT = 'mu-rating inline-flex items-center type-figure text-ink';
const GAP: Record<RatingSize, string> = { compact: 'gap-rating-compact-gap', regular: 'gap-rating-regular-gap', large: 'gap-rating-large-gap' };
const TRACK = 'mu-rating-track flex outline-none';
const CELL: Record<RatingSize, string> = {
  compact: 'h-rating-compact-row px-rating-compact-pad',
  regular: 'h-rating-regular-row px-rating-regular-pad',
  large: 'h-rating-large-row px-rating-large-pad',
};
const CELL_BASE = 'mu-rating-cell group/rating-cell relative flex items-center justify-center border-0 bg-transparent p-0 outline-none tap-highlight-none';
const PRESSABLE = 'cursor-pointer data-disabled:cursor-default';
const DETENT: Record<RatingSize, string> = {
  compact: 'w-rating-compact-width h-rating-compact-height',
  regular: 'w-rating-regular-width h-rating-regular-height',
  large: 'w-rating-large-width h-rating-large-height',
};
const DETENT_BASE = 'mu-rating-detent rating-detent relative block rounded-pill recipe-well-track group-focus-visible/rating-cell:focus-ring';
const LAMP = 'mu-rating-lamp rating-lamp recipe-slider-fill';
const READOUT = 'mu-rating-value inline-flex flex-none items-baseline gap-rating-count-gap whitespace-nowrap';
// Editable, the readout keeps the width of its widest word, so the detents never move as it turns.
const WORDS = 'inline-grid flex-none justify-items-start whitespace-nowrap [&>*]:col-start-1 [&>*]:row-start-1';
const COUNT = 'mu-rating-count type-meta text-ink3';

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

/** How a detent looks: its share lit (0 to 1), whether it's a ghost, and its place in a sweep. */
interface Look { share: number; ghost?: boolean; step: number }

function Detent({ size, look }: { size: RatingSize; look: Look }) {
  return (
    <span className={join(DETENT_BASE, DETENT[size])} data-lit={look.share > 0 && !look.ghost ? '' : undefined} data-ghost={look.ghost ? '' : undefined}
      style={{ '--mu-rating-share': look.share, '--mu-rating-step': look.step } as React.CSSProperties}>
      <span className={LAMP} />
    </span>
  );
}

/** Each detent's place in the sweep from the old edge to the new: away from the old edge, in order. */
function useSweep(lit: number) {
  const before = React.useRef(lit);
  const from = before.current;
  React.useEffect(() => { before.current = lit; }, [lit]);
  return (i: number) => Math.max(0, lit >= from ? i - from : from - 1 - i);
}

const grouped = (n: number) => new Intl.NumberFormat().format(n);

/** How good something is, on a short scale: detents you read at a glance, or press to rate. */
export function Rating({
  value: valueProp, defaultValue = null, onValueChange, max = 5, readOnly, count, labels, emptyLabel = 'Not rated',
  showValue = true, size = 'regular', disabled, name, required, className, 'aria-label': ariaLabel, ...props
}: RatingProps) {
  const [own, setOwn] = React.useState<number | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : own;
  const set = (next: number | null) => {
    if (valueProp === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const [hover, setHover] = React.useState<number | null>(null);
  const whole = value == null ? 0 : Math.max(0, Math.min(max, value));
  const sweep = useSweep(Math.ceil(whole));
  const points = Array.from({ length: max }, (_, i) => i + 1);
  const root = join(ROOT, GAP[size], className);

  if (readOnly) {
    const shown = value == null ? emptyLabel : new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(whole);
    const said = [ariaLabel, value == null ? emptyLabel : `${shown} out of ${max}`, count != null ? `${grouped(count)} ratings` : undefined].filter(Boolean).join(', ');
    return (
      <div role="img" aria-label={said} data-readonly="" className={join(root, disabled && 'opacity-rating-disabled')} {...props}>
        <span aria-hidden className={TRACK}>
          {points.map((p, i) => (
            <span key={p} className={join(CELL_BASE, CELL[size])}>
              <Detent size={size} look={{ share: Math.max(0, Math.min(1, whole - i)), step: sweep(i) }} />
            </span>
          ))}
        </span>
        {(showValue || count != null) && (
          <span aria-hidden className={READOUT}>
            {showValue && <SwapText value={shown} />}
            {count != null && <span className={COUNT}>({grouped(count)})</span>}
          </span>
        )}
      </div>
    );
  }

  // Hovering a detent: what a press there would set (the chosen one clears).
  const target = hover == null ? whole : hover === whole ? 0 : hover;
  const word = (v: number) => (v === 0 ? emptyLabel : labels?.[v - 1] ?? String(v));
  return (
    <div className={join(root, disabled && 'opacity-rating-disabled')} {...props}>
      <BaseRadioGroup
        className={TRACK}
        aria-label={ariaLabel}
        value={value == null ? null : whole}
        onValueChange={(v) => set(v as number)}
        disabled={disabled}
        name={name}
        required={required}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if ((e.key === 'Backspace' || e.key === 'Delete') && value != null) { e.preventDefault(); set(null); }
        }}
      >
        {points.map((p, i) => {
          const lit = i < whole;
          const after = i < target;
          return (
            <BaseRadio.Root
              key={p}
              value={p}
              aria-label={labels?.[i] ? `${p} of ${max}, ${labels[i]}` : `${p} of ${max}`}
              className={join(CELL_BASE, CELL[size], !disabled && PRESSABLE)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !disabled) setHover(p); }}
              // A press on the chosen detent clears the rating (a radio can't do it on its own). Either way
              // the preview stops until the pointer moves to another detent: what you pressed is what shows.
              onClick={() => { if (p === whole && value != null) set(null); setHover(null); }}
            >
              <Detent size={size} look={{ share: lit || after ? 1 : 0, ghost: hover != null && lit !== after, step: hover == null ? sweep(i) : 0 }} />
            </BaseRadio.Root>
          );
        })}
      </BaseRadioGroup>
      {showValue && (
        <span aria-hidden className={join(READOUT, WORDS)}>
          {[0, ...points].map((v) => <span key={v} className="invisible">{word(v)}</span>)}
          <SwapText value={word(target)} />
        </span>
      )}
    </div>
  );
}
