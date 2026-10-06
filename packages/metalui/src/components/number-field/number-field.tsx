'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { buttonClasses } from '../button/button';
import { ChangedMark, FormField } from '../form-field/form-field';
import { Icon } from '../../icons/Icon';
import { SwapIcon, SwapText } from '../../motion/swap';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * NUMBER FIELD, a number you step, scrub or type, on Base UI NumberField
 *
 *   sizes     large 44, regular 32, compact 28: Field's heights and radii, so a number sits level
 *             with the fields beside it; the keycaps are concentric with the well
 *   step      − and + keycaps (the set's minus and plus glyphs) at the ends of the well; each press
 *             sinks the cap and turns the value one drum step on the settle spring: + rolls up (the
 *             new number comes from below), − rolls down; holding repeats; ↑ ↓ step the same way
 *   fine      Alt steps by smallStep (the step itself when it is whole, else 0.1), Shift by largeStep. While either is held over the field (or in
 *   coarse    it), the keycaps' legends turn on the drum to the step they will take ("−10" "+10")
 *   scrub     drag the label sideways: each change turns the drum the way it went
 *   limit     at min or max that keycap disables; an arrow or a scrub past it shakes only the digits
 *             on the refusal spring
 *   unit      engraved after the value in ink3 ("px", "%", "°"); not part of what you type
 *   type      a draft: no drum while typing; it commits on Enter or blur (Esc puts it back). It takes
 *             a plain number, the unit ("12px"), or arithmetic: +10, *2 and /2 work on the value,
 *             =8*12 (or 8*12) is a new one; the result is read back under the field before it commits.
 *             What isn't understood is refused: the digits shake and the value stays
 *   soft      allowOutOfRange: a typed value past a limit is kept, with the invalid ring and the limit
 *             said under the field ("Up to 100"); the keys and the scrub still clamp
 *   default   double-click the label, ⌘-click a keycap, or ⌘⌫ (Ctrl+Backspace) in the input: the value
 *             turns back to defaultValue on the drum. While it is off its default, the shared changed mark hangs before the label
 *   mixed     a multi-selection with different values: "Mixed" in ink3; a step calls onStep with the
 *             signed amount (apply it to each item), typing sets them all through onValueChange
 *   inspector kind="inspector", for tight panels: no keycaps; a letter or glyph engraved at the well's
 *             start is the scrub handle; regular and compact only
 *   wheel     allowWheelScrub: the wheel steps only while the field has focus
 *   invalid   the foundation's invalid ring on the group; aria-invalid on the input
 * Reduce Motion: the drum crossfades and nothing shakes.
 * The drum always holds the input's text; while it turns, the input's own text is hidden and the
 * drum shows over it.
 * Slots: NumberField.Root, NumberField.Label, NumberField.Group, NumberField.Decrement,
 * NumberField.Input, NumberField.Increment.
 * ───────────────────────────────────────────────────────── */

export type NumberFieldSize = 'large' | 'regular' | 'compact';

const ROOT = 'mu-number-field relative inline-grid';
const LABEL = 'mu-number-field-label relative inline-block type-ui text-ink cursor-ew-resize select-none w-max';
const GROUP = 'mu-number-field-group group/nf relative inline-flex items-center box-border recipe-well-field focus-within:focus-ring-flush data-disabled:opacity-number-field-disabled data-invalid:invalid-ring';
const SIZE: Record<NumberFieldSize, { group: string; inspector: string; key: string; value: string; legend: string }> = {
  large: {
    group: 'h-number-field-large-height w-number-field-large-width p-number-field-large-pad rounded-number-field-large-radius',
    inspector: '',
    key: 'size-number-field-large-key! rounded-number-field-large-key-radius! [&_svg]:size-number-field-large-glyph',
    value: 'type-content',
    legend: 'type-readout',
  },
  regular: {
    group: 'h-number-field-regular-height w-number-field-regular-width p-number-field-regular-pad rounded-number-field-regular-radius',
    inspector: 'h-number-field-regular-height w-number-field-inspector-regular rounded-number-field-regular-radius',
    key: 'size-number-field-regular-key! rounded-number-field-regular-key-radius! [&_svg]:size-number-field-regular-glyph',
    value: 'type-lead',
    legend: 'type-tick',
  },
  compact: {
    group: 'h-number-field-compact-height w-number-field-compact-width p-number-field-compact-pad rounded-number-field-compact-radius',
    inspector: 'h-number-field-compact-height w-number-field-inspector-compact rounded-number-field-compact-radius',
    key: 'size-number-field-compact-key! rounded-number-field-compact-key-radius! [&_svg]:size-number-field-compact-glyph',
    value: 'type-ui',
    legend: 'type-tick',
  },
};
const INSPECTOR = 'gap-number-field-inspector-gap px-number-field-inspector-pad';
// The keycap is the glyph's tile, so the set's plus and minus drop theirs and keep the bar and upright.
const KEY = `${buttonClasses('standard', 'compact')} mu-number-field-key mu-icon-trigger flex-none px-0 justify-center overflow-visible [&_[data-part=tile]]:hidden group-data-disabled/nf:opacity-100!`;
const WINDOW = 'mu-number-field-window relative flex flex-1 min-w-0 h-full items-center overflow-hidden cursor-text';
const SIZER = 'mu-number-field-sizer relative inline-grid h-full items-center min-w-0 max-w-full';
const MIRROR = 'col-start-1 row-start-1 invisible whitespace-pre px-number-field-unit-caret overflow-hidden';
const INPUT = 'mu-number-field-input absolute inset-0 w-full min-w-0 h-full p-0 border-0 outline-none bg-transparent tabular-nums text-ink caret-field-field-caret placeholder:text-ink3 data-[turning]:text-transparent';
const DRUM = 'mu-number-field-drum col-start-1 row-start-1 self-center pointer-events-none tabular-nums text-ink';
const UNIT = 'mu-number-field-unit field-affix ml-number-field-unit-gap';
const LETTER = 'mu-number-field-letter field-affix type-ui flex-none cursor-ew-resize select-none [&_svg]:size-number-field-regular-glyph';
const MARK_HANG = 'form-field-changed-hang';
const MARK_INSIDE = 'mu-number-field-mark flex-none ml-number-field-inspector-mark';
const LIMIT = 'mu-number-field-limit m-0 form-field-error';
const LIMIT_TEXT = 'block number-field-row-gap type-meta text-form-field-error-ink';
// The readback's row opens with the gap above it, so a closed row leaves no gap.
const READBACK = '[&>span]:number-field-row-gap';

const STEPPED = new Set(['increment-press', 'decrement-press', 'keyboard', 'wheel', 'scrub']);
const DOUBLE_MS = 400;

type ChangeDetails = BaseNumberField.Root.ChangeEventDetails;
type CommitDetails = BaseNumberField.Root.CommitEventDetails;

/** Details for a change the field makes itself (a typed draft, back to default), shaped like Base UI's. */
function changeDetails(event: Event, typed: boolean): ChangeDetails {
  const d: ChangeDetails = {
    reason: typed ? 'input-change' : 'none',
    event,
    trigger: undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel: () => { d.isCanceled = true; },
    allowPropagation: () => { d.isPropagationAllowed = true; },
  };
  return d;
}

function commitDetails(event: Event): CommitDetails {
  return event instanceof FocusEvent ? { reason: 'input-blur', event } : { reason: 'none', event };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What a typed draft means, on the scale it is shown at (a percent field's 50 is 0.5). A plain number,
 * the number with the field's unit or format symbols ("12px", "$1,200"), or arithmetic: a leading
 * + * / works on the current value (+10, *2), and =8*12 (or 8*12) is a new value.
 * Returns null for an empty draft and undefined for one it doesn't understand.
 */
function readDraft(text: string, current: number | null, { unit, locale, format }: { unit?: string; locale?: Intl.LocalesArgument; format?: Intl.NumberFormatOptions } = {}): number | null | undefined {
  const parts = new Intl.NumberFormat(locale, format).formatToParts(-1234.5);
  const group = parts.find((p) => p.type === 'group')?.value;
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  let s = text;
  // The format's own marks ("$", "%", "kg") and the unit say nothing a person must type.
  for (const p of parts) if (p.type === 'currency' || p.type === 'percentSign' || p.type === 'unit') s = s.split(p.value).join('');
  if (unit) s = s.replace(new RegExp(escapeRe(unit), 'gi'), '');
  if (group) s = s.split(group).join('');
  s = s.split(decimal).join('.').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (!s) return null;
  const scale = format?.style === 'percent' ? 100 : 1;
  const here = (current ?? 0) * scale;
  let expr = s;
  let relative: string | null = null;
  if (s.startsWith('=')) expr = s.slice(1);
  else if (/^[+*/]/.test(s)) { relative = s[0]; expr = s.slice(1); }
  const n = calc(expr);
  if (n === undefined) return undefined;
  const out = relative === '+' ? here + n : relative === '*' ? here * n : relative === '/' ? (n === 0 ? NaN : here / n) : n;
  if (!Number.isFinite(out)) return undefined;
  return parseFloat((out / scale).toPrecision(12));
}

/** + − × ÷ and brackets over plain numbers (no eval): expr = term (± term)*, term = factor (×÷ factor)*. */
function calc(src: string): number | undefined {
  let i = 0;
  const peek = () => src[i];
  const factor = (): number => {
    const c = peek();
    if (c === '-' || c === '+') { i++; const v = factor(); return c === '-' ? -v : v; }
    if (c === '(') { i++; const v = expr(); if (peek() !== ')') return NaN; i++; return v; }
    const m = /^\d*\.?\d+(?:e[-+]?\d+)?/i.exec(src.slice(i)) ?? /^\d+\.?/.exec(src.slice(i));
    if (!m) return NaN;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = factor(); v = op === '*' ? v * r : v / r; }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const v = expr();
  return i === src.length && Number.isFinite(v) ? v : undefined;
}

/** True when a draft is arithmetic rather than a number (with or without its unit): worth reading back. */
const isArithmetic = (text: string) => /[*/×÷=()]|^\s*\+|\d\s*[-−+]\s*[\d(]/.test(text);

export interface NumberFieldProps extends Omit<BaseNumberField.Root.Props, 'className' | 'children'> {
  /** The label above (the stepper), or the letter or glyph engraved at the well's start (the inspector). Drag it sideways to scrub. */
  label?: React.ReactNode;
  /** large 44, regular 32 (the default) or compact 28: Field's sizes. The inspector is regular or compact. */
  size?: NumberFieldSize;
  /** stepper (the default): keycaps at each end. inspector: no keycaps, the label engraved inside as the scrub handle. */
  kind?: 'stepper' | 'inspector';
  /** Engraved after the value in ink3 ("px", "%", "°"). Typing it is understood. Use `format` for currency and locale. */
  unit?: string;
  /** A multi-selection whose values differ: "Mixed" in ink3. A step calls `onStep`; typing sets them all. */
  mixed?: boolean;
  /** While `mixed`, a step: the signed amount to add to each item. */
  onStep?: (amount: number) => void;
  /** Accessible names for the keycaps. */
  decrementLabel?: string;
  incrementLabel?: string;
  /** The value will not be accepted: the foundation's invalid ring, and aria-invalid on the input. */
  invalid?: boolean;
  className?: string;
}

/** A number you step, scrub or type. */
function Root({
  label, size = 'regular', kind = 'stepper', unit, mixed, onStep, decrementLabel = 'Decrease', incrementLabel = 'Increase', invalid, className,
  onValueChange, onValueCommitted, value, defaultValue, min, max, step = 1, smallStep: smallStepProp, largeStep = 10, allowOutOfRange, format, locale,
  disabled, readOnly, 'aria-label': ariaLabel, ...props
}: NumberFieldProps) {
  const inspector = kind === 'inspector';
  const sized = SIZE[inspector && size === 'large' ? 'regular' : size];
  const input = React.useRef<HTMLInputElement>(null);
  const drum = React.useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = React.useState<number | null>(value ?? defaultValue ?? null);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [text, setText] = React.useState('');
  const [face, setFace] = React.useState('');
  const [turn, setTurn] = React.useState<{ n: number; dir: 'up' | 'down' } | null>(null);
  const groupRef = React.useRef<HTMLDivElement>(null);
  const [held, setHeld] = React.useState<'fine' | 'coarse' | null>(null);
  const shown = value !== undefined ? value : current;
  const shownRef = React.useRef(shown);
  shownRef.current = shown;
  const lastLabelClick = React.useRef(0);
  const labelId = React.useId();
  const readbackId = React.useId();
  const limitId = React.useId();
  const stepNum = step === 'any' ? 1 : step;
  // A whole-number step makes a count: Alt steps by the step itself, not by tenths.
  const smallStep = smallStepProp ?? (step !== 'any' && Number.isInteger(step) ? step : 0.1);
  const scale = { unit, locale, format };

  // What the input shows, read after each render: the drum turns to it, and the sizer is as wide as it.
  useIsoLayoutEffect(() => {
    const now = input.current?.value ?? '';
    if (now !== text) setText(now);
  });
  useIsoLayoutEffect(() => { if (input.current) setFace(input.current.value); }, [shown]);

  // The input's own text comes back once the drum has settled.
  React.useEffect(() => {
    if (!turn) return;
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-spring-settle-d')) * 1000 || 440;
    const t = window.setTimeout(() => setTurn(null), ms);
    return () => clearTimeout(t);
  }, [turn]);

  // Alt (fine) or Shift (coarse) held while the field is under the pointer or has focus.
  const live = !disabled && !readOnly && !inspector;
  const hot = () => { const g = groupRef.current; return !!g && (g.matches(':hover') || g.contains(document.activeElement)); };
  React.useEffect(() => {
    if (!live) { setHeld(null); return; }
    const read = (e: KeyboardEvent) => setHeld(hot() ? (e.altKey ? 'fine' : e.shiftKey ? 'coarse' : null) : null);
    const clear = () => setHeld(null);
    window.addEventListener('keydown', read);
    window.addEventListener('keyup', read);
    window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', read); window.removeEventListener('keyup', read); window.removeEventListener('blur', clear); };
  }, [live]);
  const heldAmount = held === 'fine' ? smallStep : held === 'coarse' ? largeStep : null;
  const legend = heldAmount != null && heldAmount !== stepNum ? new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(heldAmount) : null;

  const shownText = (n: number) => `${new Intl.NumberFormat(locale, format).format(n)}${unit ? ` ${unit}` : ''}`;
  const turnTo = (next: number | null) => {
    const prev = shownRef.current;
    if (prev != null && next != null && next !== prev) setTurn((t) => ({ n: (t?.n ?? 0) + 1, dir: next > prev ? 'up' : 'down' }));
  };

  /** A change the field makes itself: a typed draft or back to default. Hands it to the host like Base UI's own. */
  const change = (next: number | null, event: Event, typed: boolean) => {
    const prev = shownRef.current;
    const kept = next == null || allowOutOfRange ? next : Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next));
    if (kept === prev && !mixed) return;
    const details = changeDetails(event, typed);
    onValueChange?.(kept, details);
    if (details.isCanceled) return;
    if (value === undefined) setCurrent(kept);
    shownRef.current = kept;
    onValueCommitted?.(kept, commitDetails(event));
  };

  /** Commits the draft: what it means, or a refusal when it means nothing. */
  const commit = (event: Event) => {
    if (draft == null) return;
    const next = readDraft(draft, shownRef.current, scale);
    setDraft(null);
    if (next === undefined) { refuse(drum.current); return; }
    if (isArithmetic(draft)) turnTo(next);
    change(next, event, true);
  };

  const reset = (event: Event) => {
    if (defaultValue === undefined || disabled || readOnly) return;
    setDraft(null);
    turnTo(defaultValue);
    change(defaultValue, event, false);
  };

  const reading = draft != null && isArithmetic(draft) ? readDraft(draft, shown, scale) : undefined;
  const clampedReading = reading == null || allowOutOfRange ? reading : Math.min(max ?? Infinity, Math.max(min ?? -Infinity, reading));
  const readback = reading == null ? '' : `= ${shownText(reading)}${clampedReading !== reading ? ` · ${reading > (max ?? Infinity) ? 'up to' : 'at least'} ${shownText(clampedReading ?? reading)}` : ''}`;

  // Soft limits: a committed value past a limit, said under the field until it changes.
  const over = allowOutOfRange && shown != null && max != null && shown > max;
  const under = allowOutOfRange && shown != null && min != null && shown < min;
  const outside = (over || under) && draft == null;
  const limitSaid = outside ? (over ? `Up to ${shownText(max)}` : `At least ${shownText(min ?? 0)}`) : '';
  const [limitLast, setLimitLast] = React.useState(limitSaid);
  if (limitSaid && limitSaid !== limitLast) setLimitLast(limitSaid);
  const isInvalid = invalid || outside;

  const hasDefault = defaultValue !== undefined;
  const changed = hasDefault ? !mixed && shown !== defaultValue : undefined;

  // A scrub pushed past a limit: the digits refuse once per push.
  const pinned = React.useRef(false);
  const onScrubStart = () => {
    pinned.current = false;
    const move = (e: PointerEvent) => {
      const at = shownRef.current;
      const pushing = at != null && ((e.movementX > 0 && max != null && at >= max) || (e.movementX < 0 && min != null && at <= min));
      if (pushing && !pinned.current) refuse(drum.current, e.movementX > 0 ? 1 : -1);
      if (e.movementX !== 0) pinned.current = pushing;
    };
    const up = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  };
  const onLabelClick = (e: React.MouseEvent) => {
    const now = e.timeStamp;
    if (now - lastLabelClick.current < DOUBLE_MS) { lastLabelClick.current = 0; reset(e.nativeEvent); } else lastLabelClick.current = now;
  };

  // ⌘-click (Ctrl-click) a keycap: back to default instead of a step.
  const keyProps = {
    onPointerDown: (e: React.PointerEvent & { preventBaseUIHandler?: () => void }) => {
      if (e.metaKey || e.ctrlKey) { e.preventBaseUIHandler?.(); e.preventDefault(); return; }
      if (draft != null) flushSync(() => commit(e.nativeEvent));
    },
    onClick: (e: React.MouseEvent & { preventBaseUIHandler?: () => void }) => {
      if (e.metaKey || e.ctrlKey) { e.preventBaseUIHandler?.(); reset(e.nativeEvent); }
    },
  };

  const keyLegend = (sign: '−' | '+', glyph: 'minus' | 'plus') => (
    <SwapIcon swapKey={legend ?? glyph}>
      {legend ? <span className={sized.legend}>{sign}{legend}</span> : <Icon name={glyph} size={12} />}
    </SwapIcon>
  );

  const scrubLabel = (inside: boolean) => (
    <BaseNumberField.ScrubArea className={inside ? 'flex-none inline-flex' : 'w-max mb-number-field-gap'} onPointerDown={onScrubStart} onClick={onLabelClick}>
      <span id={labelId} className={inside ? LETTER : LABEL}>
        {label}
        {!inside && changed !== undefined && <ChangedMark changed={changed} label="off its default" className={MARK_HANG} />}
      </span>
    </BaseNumberField.ScrubArea>
  );

  return (
    <BaseNumberField.Root
      className={className ? `${ROOT} ${className}` : ROOT}
      value={mixed ? null : shown}
      min={min}
      max={max}
      step={step}
      smallStep={smallStep}
      largeStep={largeStep}
      allowOutOfRange={allowOutOfRange}
      format={format}
      locale={locale}
      disabled={disabled}
      readOnly={readOnly}
      onValueChange={(next, details) => {
        if (mixed && STEPPED.has(details.reason)) {
          // Each item steps from its own value: the host applies the amount; "Mixed" stays.
          const e = details.event;
          const dir = details.reason === 'increment-press' ? 1 : details.reason === 'decrement-press' ? -1
            : e instanceof KeyboardEvent ? (e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0)
              : e instanceof WheelEvent ? (e.deltaY < 0 ? 1 : -1)
                : e instanceof PointerEvent ? Math.sign(e.movementX) : 0;
          const mods = e as Partial<Pick<KeyboardEvent, 'altKey' | 'shiftKey'>>;
          if (dir) {
            details.cancel();
            onStep?.(dir * (mods.altKey ? smallStep : mods.shiftKey ? largeStep : stepNum));
            return;
          }
        }
        if (STEPPED.has(details.reason)) turnTo(next);
        onValueChange?.(next, details);
        if (details.isCanceled) return;
        if (value === undefined) setCurrent(next);
        shownRef.current = next;
      }}
      onValueCommitted={onValueCommitted}
      {...props}
    >
      {label != null && !inspector && scrubLabel(false)}
      <BaseNumberField.Group
        className={`${GROUP} ${inspector ? `${sized.inspector} ${INSPECTOR}` : sized.group}`}
        ref={groupRef}
        data-invalid={isInvalid ? '' : undefined}
        onPointerEnter={(e) => { if (live) setHeld(e.altKey ? 'fine' : e.shiftKey ? 'coarse' : null); }}
        onPointerLeave={() => { if (!groupRef.current?.contains(document.activeElement)) setHeld(null); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(':hover')) setHeld(null); }}
      >
        {inspector
          ? label != null && scrubLabel(true)
          : <BaseNumberField.Decrement className={`${KEY} ${sized.key}`} aria-label={decrementLabel} {...keyProps}>{keyLegend('−', 'minus')}</BaseNumberField.Decrement>}
        <span
          className={`${WINDOW} ${inspector ? 'justify-start' : 'justify-center'}${turn?.dir === 'down' ? ' swap-down' : ''}`}
          ref={drum}
          // The window is the input's: pressing beside the digits puts the caret at their end.
          onMouseDown={(e) => {
            const el = input.current;
            if (!el || e.target === el || el.disabled) return;
            e.preventDefault();
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }}
        >
          <span className={SIZER}>
            <span aria-hidden className={`${MIRROR} ${sized.value}`}>{text || (mixed ? 'Mixed' : '') || ' '}</span>
            <BaseNumberField.Input
              ref={input}
              className={`${INPUT} ${sized.value} ${inspector ? 'text-left' : 'text-center'}`}
              data-turning={turn ? '' : undefined}
              placeholder={mixed ? 'Mixed' : undefined}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : label != null ? labelId : undefined}
              aria-invalid={isInvalid || undefined}
              aria-keyshortcuts={hasDefault && !readOnly ? 'Meta+Backspace Control+Backspace' : undefined}
              aria-describedby={[readback && readbackId, outside && limitId].filter(Boolean).join(' ') || undefined}
              {...(draft != null ? { value: draft } : {})}
              onChange={(e: React.ChangeEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) => {
                // Typing is a draft the field reads itself, so a unit or arithmetic can be typed.
                e.preventBaseUIHandler?.();
                setDraft(e.currentTarget.value);
              }}
              onPaste={(e: React.ClipboardEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) => e.preventBaseUIHandler?.()}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) => {
                const up = e.key === 'ArrowUp', down = e.key === 'ArrowDown';
                if (draft != null && e.key === 'Escape') { e.preventBaseUIHandler?.(); e.stopPropagation(); setDraft(null); return; }
                if (draft != null && e.key === 'Enter') { e.preventBaseUIHandler?.(); commit(e.nativeEvent); return; }
                // ⌘⌫ (Ctrl+Backspace): back to default, the keyboard twin of ⌘-click on a keycap.
                if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey) && hasDefault && !readOnly) { e.preventBaseUIHandler?.(); e.preventDefault(); reset(e.nativeEvent); return; }
                // A step from a draft steps from what it means.
                if (draft != null && (up || down)) flushSync(() => commit(e.nativeEvent));
                if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) { e.preventBaseUIHandler?.(); return; }
                const at = shownRef.current;
                if ((up && max != null && at != null && at >= max) || (down && min != null && at != null && at <= min)) refuse(drum.current, up ? 1 : -1);
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) => {
                if (draft == null) return;
                // Base UI's blur reads the value from its last render, so commit first, then let it see the blur.
                e.preventBaseUIHandler?.();
                const el = e.currentTarget;
                const related = e.relatedTarget;
                flushSync(() => commit(e.nativeEvent));
                el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: related }));
              }}
            />
            <span aria-hidden className={`${DRUM} ${sized.value} ${inspector ? 'justify-self-start' : 'justify-self-center'}${turn ? '' : ' invisible'}`}><SwapText value={face} /></span>
          </span>
          {unit && !mixed && <span aria-hidden className={`${UNIT} ${sized.value}`}>{unit}</span>}
        </span>
        {inspector
          ? changed !== undefined && <ChangedMark changed={changed} label="off its default" className={MARK_INSIDE} />
          : <BaseNumberField.Increment className={`${KEY} ${sized.key}`} aria-label={incrementLabel} {...keyProps}>{keyLegend('+', 'plus')}</BaseNumberField.Increment>}
      </BaseNumberField.Group>
      {/* What arithmetic comes to, before it commits (the form field's shared line). */}
      <FormField><FormField.Readback id={readbackId} className={READBACK}>{readback}</FormField.Readback></FormField>
      <p id={limitId} className={LIMIT} data-ending-style={limitSaid ? undefined : ''}>
        <span className={LIMIT_TEXT} aria-hidden={limitSaid ? undefined : true}>{limitSaid || limitLast}</span>
      </p>
    </BaseNumberField.Root>
  );
}

// Base UI hands its parts over as a namespace (`export * as NumberField`), so a bundler cannot tell a property read on
// it from a getter with effects; read them inside a call it is told is pure, and an app without NumberField ships none of it.
export const NumberField = Object.assign(Root, /* @__PURE__ */ (() => ({
  Label: BaseNumberField.ScrubArea,
  Group: BaseNumberField.Group,
  Decrement: BaseNumberField.Decrement,
  Input: BaseNumberField.Input,
  Increment: BaseNumberField.Increment,
  Root,
}))());
