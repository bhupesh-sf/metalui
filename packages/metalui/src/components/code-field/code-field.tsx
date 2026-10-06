'use client';

import * as React from 'react';
import { OTPField } from '@base-ui/react/otp-field';
import { Button } from '../button/button';
import { Spinner } from '../spinner/spinner';
import { SwapText } from '../../motion/swap';
import { refuse } from '../../motion/refuse';
import { useWait, type WaitWork } from '../../motion/wait';
import { useAwake } from '../../motion/awake';

/* ─────────────────────────────────────────────────────────
 * CODE FIELD, a one-time code: one slot per character (Base UI OTP Field underneath)
 *
 *   slots     each slot is the field well at Field's sizes: large 44 (default), regular 32, compact 28
 *   typed     a filled slot holds a compact keycap; a character arriving springs it into the well
 *             from key.pop, fading in, on the part spring
 *   paste     paste or the phone's autofill fills from that slot; the new keycaps arrive in one ripple,
 *             key.ripple apart, left to right
 *   current   the slot you are on wears the flush focus ring; empty, it shows a still caret
 *   groups    [3, 3]: a short engraved dash between groups (decorative, hidden from screen readers)
 *   refuse    a typed character the code can't hold: the slot you are on shakes (refusal spring)
 *   invalid   every slot wears the invalid ring and the row shakes once; focus goes back to the first
 *             slot with its character selected, so typing again overwrites from the start
 *   checking  read-only, aria-busy, slots at the spinner's item dim; the small ring turns after the
 *             last slot on useWait's clock and draws the tick when checking ends without invalid
 *   Resend    a link cap: "Resend in 0:42" (the seconds on the drum), then "Resend code"
 * Reduce Motion: keycaps appear without the pop or the ripple; nothing shakes; the drum crossfades.
 * Accessibility (Base UI): one input per slot and one Tab stop; the first is named by the label and
 * carries autocomplete="one-time-code"; the rest say "Character n of N". A hidden input holds the value.
 * Slots: CodeField.Root, CodeField.Slot, CodeField.Separator, CodeField.Resend.
 * ───────────────────────────────────────────────────────── */

export type CodeFieldSize = 'large' | 'regular' | 'compact';

const ROOT = 'mu-code-field relative inline-flex items-center w-max spinner-item data-disabled:opacity-code-field-disabled-opacity';
const ROW: Record<CodeFieldSize, string> = {
  large: 'gap-code-field-large-gap',
  regular: 'gap-code-field-regular-gap',
  compact: 'gap-code-field-compact-gap',
};
const GROUP: Record<CodeFieldSize, string> = {
  large: 'mu-code-field-group inline-flex items-center gap-code-field-large-gap',
  regular: 'mu-code-field-group inline-flex items-center gap-code-field-regular-gap',
  compact: 'mu-code-field-group inline-flex items-center gap-code-field-compact-gap',
};
const SLOT: Record<CodeFieldSize, string> = {
  large: 'h-code-field-large-height w-code-field-large-width p-code-field-large-pad rounded-code-field-large-radius type-code-field-large',
  regular: 'h-code-field-regular-height w-code-field-regular-width p-code-field-regular-pad rounded-code-field-regular-radius type-code-field-regular',
  compact: 'h-code-field-compact-height w-code-field-compact-width p-code-field-compact-pad rounded-code-field-compact-radius type-code-field-compact',
};
const SLOT_BASE = 'mu-code-field-slot group/slot relative box-border grid flex-none recipe-well-field has-[input:focus]:focus-ring-flush data-invalid:invalid-ring';
const CAP: Record<CodeFieldSize, string> = {
  large: 'rounded-code-field-large-cap-radius',
  regular: 'rounded-code-field-regular-cap-radius',
  compact: 'rounded-code-field-compact-cap-radius',
};
const CAP_BASE = 'mu-code-field-cap col-start-1 row-start-1 grid place-items-center recipe-button-compact text-ink pointer-events-none select-none code-field-cap';
const CARET = 'mu-code-field-caret col-start-1 row-start-1 place-self-center code-field-caret opacity-0 group-has-[input:focus]/slot:opacity-100';
// The real input covers the slot: it takes the press, the keys and autofill; its own text and caret are hidden.
const INPUT = 'mu-code-field-input absolute inset-0 z-1 size-full m-0 p-0 border-0 bg-transparent outline-none text-center type-code-field-large code-field-input cursor-text disabled:cursor-default';
const DASH: Record<CodeFieldSize, string> = {
  large: 'w-code-field-large-dash',
  regular: 'w-code-field-regular-dash',
  compact: 'w-code-field-compact-dash',
};

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** The default grouping: 6 → 3–3, 8 → 4–4, otherwise one group. */
function defaultGroups(length: number) {
  return length === 6 || length === 8 ? [length / 2, length / 2] : [length];
}

/** Letters show in capitals: a recovery code is read off paper, and case never matters. */
const upper = (value: string) => value.toUpperCase();

interface CodeFieldContext {
  size: CodeFieldSize;
  length: number;
  invalid: boolean;
  mask: boolean;
  /** The first slot the latest change touched: new keycaps ripple from there. */
  from: number;
  /** False until the field has been seen at rest, so a code it loads with doesn't spring in. */
  ready: boolean;
}

const Ctx = React.createContext<CodeFieldContext>({ size: 'large', length: 6, invalid: false, mask: false, from: 0, ready: false });

export interface CodeFieldRootProps extends Omit<OTPField.Root.Props, 'className' | 'render' | 'length'> {
  /** The number of characters. Default 6. */
  length?: number;
  /** large (44, the default), regular (32) or compact (28): Field's sizes. */
  size?: CodeFieldSize;
  /** Characters per group, parted by a dash: [3, 3]. Default 6 → 3–3, 8 → 4–4, otherwise one group. */
  groups?: number[];
  /** The code was refused: the invalid ring on every slot, one shake, and focus back at the first slot. */
  invalid?: boolean;
  /** The code is being checked: read-only, busy, and the small ring after the last slot. */
  checking?: boolean;
  /** Said when the ring shows. Default "Checking the code". */
  checkingLabel?: string;
  /** Said when checking ends without `invalid`, as the tick draws. Default "Code accepted". */
  acceptedLabel?: string;
  className?: string;
  /** The slots and separators, to arrange them yourself. Default: `groups`. */
  children?: React.ReactNode;
}

const Root = React.forwardRef<HTMLDivElement, CodeFieldRootProps>(function CodeFieldRoot(
  {
    length = 6, size = 'large', groups, invalid = false, checking = false, checkingLabel = 'Checking the code', acceptedLabel = 'Code accepted',
    value: valueProp, defaultValue, onValueChange, onValueInvalid, validationType = 'numeric', normalizeValue, mask = false, readOnly,
    className, children, ...props
  },
  ref,
) {
  const row = React.useRef<HTMLDivElement | null>(null);
  const [own, setOwn] = React.useState(defaultValue ?? '');
  const value = valueProp ?? own;
  const [from, setFrom] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The check's clock: working while checking, failed when refused, done (the tick) when it passed.
  const work: WaitWork = checking ? 'working' : invalid ? 'failed' : 'done';
  const wait = useWait(work, row);

  // A wrong code: one shake of the row; focus back to the first slot, its character selected.
  const wasInvalid = React.useRef(invalid);
  React.useEffect(() => {
    if (invalid && !wasInvalid.current && row.current) {
      refuse(row.current);
      if (row.current.contains(document.activeElement)) {
        const first = row.current.querySelector<HTMLInputElement>('input.mu-code-field-input');
        first?.focus();
        first?.select();
      }
    }
    wasInvalid.current = invalid;
  }, [invalid]);

  const setRef = React.useCallback((el: HTMLDivElement | null) => {
    row.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  const ctx = React.useMemo(() => ({ size, length, invalid, mask, from, ready }), [size, length, invalid, mask, from, ready]);
  const parts = groups ?? defaultGroups(length);

  return (
    <Ctx.Provider value={ctx}>
      <OTPField.Root
        ref={setRef}
        length={length}
        value={value}
        mask={mask}
        validationType={validationType}
        normalizeValue={normalizeValue ?? (validationType === 'numeric' ? undefined : upper)}
        readOnly={readOnly || checking}
        aria-busy={wait.busy || undefined}
        data-size={size}
        data-waiting={wait.busy ? '' : undefined}
        className={cx(ROOT, ROW[size], className)}
        onValueChange={(next, details) => {
          let i = 0;
          while (i < next.length && next[i] === value[i]) i++;
          setFrom(i);
          if (valueProp === undefined) setOwn(next);
          onValueChange?.(next, details);
        }}
        onValueInvalid={(attempt, details) => {
          // Only a typed character shakes; a paste keeps what it could use ("Your code is 123456").
          if (details.reason === 'input-change') refuse(document.activeElement?.closest('.mu-code-field-slot') ?? null);
          onValueInvalid?.(attempt, details);
        }}
        {...props}
      >
        {children ?? parts.map((count, g) => {
          const start = parts.slice(0, g).reduce((a, b) => a + b, 0);
          return (
            <React.Fragment key={g}>
              {g > 0 && <Separator />}
              <span className={GROUP[size]}>
                {Array.from({ length: count }, (_, k) => <Slot key={start + k} index={start + k} />)}
              </span>
            </React.Fragment>
          );
        })}
        <Spinner size="small" phase={wait.phase} label={checkingLabel} result={acceptedLabel} className="code-field-ring text-ink2" />
      </OTPField.Root>
    </Ctx.Provider>
  );
});

export interface CodeFieldSlotProps extends Omit<OTPField.Input.Props, 'className' | 'render'> {
  /** The slot's place in the code, from 0: names it "Character n of N" for screen readers. */
  index: number;
  className?: string;
}

/** One character: a field well, its keycap when filled, a still caret when it is the empty slot you are on. */
const Slot = React.forwardRef<HTMLInputElement, CodeFieldSlotProps>(function CodeFieldSlot({ index, className, ...props }, ref) {
  const { size, length, invalid, mask, from, ready } = React.useContext(Ctx);
  return (
    <OTPField.Input
      ref={ref}
      // The first slot is named by the field's label (Base UI); the rest by their place.
      aria-label={index === 0 ? undefined : `Character ${index + 1} of ${length}`}
      className={INPUT}
      render={(inputProps, state) => (
        <span
          className={cx(SLOT_BASE, SLOT[size], className)}
          data-filled={state.filled ? '' : undefined}
          data-invalid={invalid || state.valid === false ? '' : undefined}
        >
          <input {...inputProps} />
          {state.value ? (
            <span
              key={state.value}
              aria-hidden
              className={cx(CAP_BASE, CAP[size])}
              data-fresh={ready && index >= from ? '' : undefined}
              style={{ '--mu-code-field-step': Math.max(0, index - from) } as React.CSSProperties}
            >
              {mask ? '•' : state.value}
            </span>
          ) : (
            <span aria-hidden className={CARET} />
          )}
        </span>
      )}
      {...props}
    />
  );
});

/** The short engraved dash between groups: decorative, so screen readers skip it. */
function Separator({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const { size } = React.useContext(Ctx);
  return <span aria-hidden className={cx('mu-code-field-dash flex-none code-field-dash', DASH[size], className)} {...props} />;
}

export interface CodeFieldResendProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  /** Seconds before the code can be sent again; counting starts when it mounts and after each resend. Default 30. */
  cooldown?: number;
  /** Send the code again. */
  onResend: () => void;
  /** Default "Resend code". */
  label?: string;
  /** Before the time while counting. Default "Resend in". */
  countingLabel?: string;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Resend: a link cap that counts down ("Resend in 0:42", the seconds on the drum), then sends again. */
const Resend = React.forwardRef<HTMLElement, CodeFieldResendProps>(function CodeFieldResend(
  { cooldown = 30, onResend, label = 'Resend code', countingLabel = 'Resend in', disabled, ...props },
  ref,
) {
  // It counts to an end time, so a tab that slept catches up when it wakes.
  const [end, setEnd] = React.useState(() => Date.now() + cooldown * 1000);
  const [now, setNow] = React.useState(() => Date.now());
  const [awake, seen] = useAwake();
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  const counting = left > 0;
  // The clock ticks only while counting and while the key can be seen.
  React.useEffect(() => {
    if (!counting || !seen) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [counting, end, seen]);

  return (
    <span ref={awake} className="mu-code-field-resend inline-flex">
      <Button
        ref={ref}
        cap="link"
        disabled={disabled || left > 0}
        onClick={() => {
          onResend();
          const t = Date.now();
          setNow(t);
          setEnd(t + cooldown * 1000);
        }}
        {...props}
      >
        <span>
          <SwapText value={counting ? countingLabel : label} />
          {counting && <>{' '}<SwapText className="tabular-nums" value={clock(left)} /></>}
        </span>
      </Button>
    </span>
  );
});

export const CodeField = Object.assign(Root, { Root, Slot, Separator, Resend });
