'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Well } from '../well/well';
import { Kbd } from '../kbd/kbd';
import { buttonParts } from '../button/button';
import { SwapIcon, SwapText } from '../../motion/swap';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * FIELD, text input in a well, a leading glyph and trailing keys
 *
 *   large     44 (the palette's field): the caret is the focus, since a palette's field always has it
 *   regular   32, compact 28: the form sizes (they match the select); focus shows the flush green ring
 *   invalid   the foundation's invalid ring on the well; the input says aria-invalid
 *   disabled  the well at 40 %; the input is disabled
 *   prefix    fixed parts of the value ("https://", "$", "kg"), engraved in ink3 on the well's floor,
 *   suffix    not selectable, not part of the value; pressing one puts the caret at its end of the input.
 *             The input's description says them, so a screen reader hears "https://" too
 *   keys      mini keys in the trail (compact caps, 20 round, a 24 hit area), as far from the edge as
 *             from the top and bottom in every size; pressing one keeps the caret in the input
 *   clear     a key that shows while there is text: it pops in on the settle spring (from 60 %) and
 *             leaves on the release spring, keeping its place so the trail never shifts
 *   copy      shows while there is text; copies it, and its glyph turns on the drum to a check for the
 *             recipe's copy.hold (copy → check strains too far to morph); "Copied" is said once
 *   reveal    show password: the input is a password; pressing it shows the text (aria-pressed), and
 *             its glyph morphs eye ↔ eye-off
 *   shortcut  a keycap ("⌘K") that focuses the field, and turns on the drum to "Esc" while the field is
 *             active; Esc clears the text, or leaves the field when it is empty
 *   check     a remote check that passed ("name available"): the host's check glyph acts as it arrives;
 *             an ordinary valid field shows nothing
 *   counter   with maxLength, Textarea's counter in the trail: it fades in at Textarea's share of the
 *             limit (80 %), turns red at the limit, and typing past it shakes only the counter
 *   chars     sizes the input to an expected length ("a postcode is 8"), in its own font's characters
 * Reduce Motion: keys fade without the pop; the drum crossfades; nothing shakes.
 * SEARCH FIELD: a button in a well that opens search (the dock's search well), light or graphite.
 * Field slots: Field.Root, Field.Icon, Field.Prefix, Field.Input, Field.Suffix, Field.Trail, Field.Key,
 * Field.Clear, Field.Copy, Field.Reveal, Field.Shortcut, Field.Check.
 * ───────────────────────────────────────────────────────── */

export type FieldSize = 'large' | 'regular' | 'compact';

/* Styled with the theme's utilities (the field recipe on the well recipe). */
const FRAME = 'mu-field relative flex items-center cursor-text data-disabled:opacity-field-state-disabled data-disabled:cursor-default data-invalid:invalid-ring has-[input[data-invalid]]:invalid-ring has-[input[data-disabled]]:opacity-field-state-disabled';
const SIZES: Record<FieldSize, string> = {
  large: 'gap-field-field-gap h-field-field-height pl-field-field-pad-left pr-field-field-pad-right rounded-field-field-radius text-field-field-hint [&>.mu-field-icon>svg]:size-field-field-glyph',
  regular: 'gap-field-regular-gap h-field-regular-height pl-field-regular-pad-left pr-field-regular-pad-right rounded-field-regular-radius text-field-field-hint focus-within:focus-ring-flush [&>.mu-field-icon>svg]:size-field-regular-glyph',
  compact: 'gap-field-compact-gap h-field-compact-height pl-field-compact-pad-left pr-field-compact-pad-right rounded-field-compact-radius text-field-field-hint focus-within:focus-ring-flush [&>.mu-field-icon>svg]:size-field-compact-glyph',
};
// The glyph a check shows at, by size (the leading glyph's).
const GLYPH: Record<FieldSize, string> = {
  large: '[&_svg]:size-field-field-glyph',
  regular: '[&_svg]:size-field-regular-glyph',
  compact: '[&_svg]:size-field-compact-glyph',
};
const ICON = 'mu-field-icon inline-grid flex-none';
const INPUT = {
  large: 'mu-field-input flex-1 min-w-0 p-0 border-0 outline-none bg-transparent type-field-field text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint focus-visible:outline-none disabled:cursor-default',
  form: 'mu-field-input flex-1 min-w-0 h-full p-0 border-0 outline-none bg-transparent type-ui text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint focus-visible:outline-none disabled:cursor-default',
};
// Prefix and suffix write in the input's type, so their baselines meet the value's. A suffix, the counter
// and the trail are ordered after the input whatever order they are written in.
const AFFIX = { large: 'field-affix type-field-field', form: 'field-affix type-ui' };
const COUNT = 'mu-field-count order-2 flex-none field-count type-meta tabular-nums text-ink3 data-at-limit:text-red';
const TRAIL = 'mu-field-trail order-3 inline-flex items-center gap-field-key-gap ml-auto';
const KEY = `${buttonParts.FRAME} mu-field-key mu-icon-trigger relative flex-none size-field-key-size p-0 rounded-pill text-ink2 hover:text-ink recipe-button-compact transition-button-compact field-key-hit [&_svg]:size-field-key-glyph not-disabled:active:translate-y-button-travel not-disabled:active:duration-button-press not-disabled:active:ease-linear not-disabled:active:recipe-button-compact-pressed disabled:cursor-default disabled:opacity-button-disabled`;
const CHECK = 'mu-field-check inline-grid flex-none place-items-center text-green-deep';
const SEARCH = {
  graphite: 'mu-search-field box-border flex items-center gap-field-search-gap h-field-search-height min-w-field-search-min-width pl-field-search-pad-left pr-field-search-pad-right border-0 rounded-field-search-radius type-field-search cursor-text [&>.mu-field-icon>svg]:size-field-search-glyph [&>.mu-kbd]:ml-auto focus-visible:focus-ring-flush text-field-search-ink recipe-well-graphite',
  light: 'mu-search-field box-border flex items-center gap-field-search-gap h-field-search-height min-w-field-search-min-width pl-field-search-pad-left pr-field-search-pad-right border-0 rounded-field-search-radius type-field-search cursor-text [&>.mu-field-icon>svg]:size-field-search-glyph [&>.mu-kbd]:ml-auto focus-visible:focus-ring-flush text-field-field-hint recipe-well-field',
};

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

interface FieldContext {
  size: FieldSize;
  invalid?: boolean;
  disabled?: boolean;
  chars?: number;
  input: React.MutableRefObject<HTMLInputElement | null>;
  /** The input has text. */
  filled: boolean;
  setFilled: (filled: boolean) => void;
  /** The input has focus. */
  active: boolean;
  setActive: (active: boolean) => void;
  /** Ids of the prefix and suffix, which describe the input. */
  affix: { prefix?: string; suffix?: string };
  setAffix: (end: 'prefix' | 'suffix', id: string | undefined) => void;
  /** The shortcut a Field.Shortcut shows ("⌘K"): Esc then clears or leaves. */
  shortcut?: string;
  setShortcut: (keys: string | undefined) => void;
  /** A Field.Reveal is in the trail: the input is a password, shown as text while `revealed`. */
  revealable: boolean;
  setRevealable: (on: boolean) => void;
  revealed: boolean;
  setRevealed: (on: boolean) => void;
}

const noop = () => {};
const FieldCtx = React.createContext<FieldContext>({
  size: 'large', input: { current: null }, filled: false, setFilled: noop, active: false, setActive: noop,
  affix: {}, setAffix: noop, setShortcut: noop, revealable: false, setRevealable: noop, revealed: false, setRevealed: noop,
});

/** Empties an input the way typing would, so a controlled host's onChange hears it, and keeps the caret there. */
function clearInput(input: HTMLInputElement | null) {
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

/** Puts the caret at the start or the end of the input (types without a selection, such as email, just focus). */
function placeCaret(input: HTMLInputElement | null, end: boolean) {
  if (!input || input.disabled) return;
  input.focus();
  const at = end ? input.value.length : 0;
  try { input.setSelectionRange(at, at); } catch { /* no selection on this input type */ }
}

export interface FieldRootProps extends React.HTMLAttributes<HTMLElement> {
  tone?: 'light' | 'graphite';
  /** large (44, the palette's field, the default), regular (32) or compact (28) for forms. */
  size?: FieldSize;
  /** The value will not be accepted: the invalid ring, and aria-invalid on the input. */
  invalid?: boolean;
  disabled?: boolean;
  /** The expected length, in characters: the input is that wide (a postcode 8, a year 4), so the box says how much to type. */
  chars?: number;
}

const Root = React.forwardRef<HTMLElement, FieldRootProps>(function FieldRoot({ tone = 'light', size = 'large', invalid, disabled, chars, className, style, ...props }, ref) {
  const input = React.useRef<HTMLInputElement | null>(null);
  const [filled, setFilled] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [affix, setAffixState] = React.useState<FieldContext['affix']>({});
  const [shortcut, setShortcut] = React.useState<string>();
  const [revealable, setRevealable] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const setAffix = React.useCallback((end: 'prefix' | 'suffix', id: string | undefined) => setAffixState((a) => (a[end] === id ? a : { ...a, [end]: id })), []);
  const ctx = React.useMemo<FieldContext>(
    () => ({ size, invalid, disabled, chars, input, filled, setFilled, active, setActive, affix, setAffix, shortcut, setShortcut, revealable, setRevealable, revealed, setRevealed }),
    [size, invalid, disabled, chars, filled, active, affix, setAffix, shortcut, revealable, revealed],
  );
  const own = cx(FRAME, SIZES[size], chars != null && 'w-max', className);
  const sized = chars != null ? ({ ...style, '--mu-field-chars': chars } as React.CSSProperties) : style;
  return (
    <FieldCtx.Provider value={ctx}>
      <Well ref={ref} as="label" variant={tone === 'graphite' ? 'graphite' : 'field'} data-size={size} data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined} className={own} style={sized} {...props} />
    </FieldCtx.Provider>
  );
});

function Icon({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden className={cx(ICON, className)} {...props} />;
}

function useAffix(end: 'prefix' | 'suffix', idProp?: string) {
  const { setAffix } = React.useContext(FieldCtx);
  const own = React.useId();
  const id = idProp ?? own;
  useIsoLayoutEffect(() => {
    setAffix(end, id);
    return () => setAffix(end, undefined);
  }, [end, id, setAffix]);
  return id;
}

function Affix({ end, className, id: idProp, onMouseDown, onClick, ...props }: React.HTMLAttributes<HTMLSpanElement> & { end: 'prefix' | 'suffix' }) {
  const { size, input } = React.useContext(FieldCtx);
  const id = useAffix(end, idProp);
  return (
    <span
      id={id}
      className={cx(`mu-field-${end}`, AFFIX[size === 'large' ? 'large' : 'form'], end === 'suffix' && 'order-1', className)}
      // Keep focus (and the caret) in the input: a press here would otherwise blur it, and a blur checks the value.
      onMouseDown={(e) => { onMouseDown?.(e); e.preventDefault(); }}
      onClick={(e) => { onClick?.(e); e.preventDefault(); placeCaret(input.current, end === 'suffix'); }}
      {...props}
    />
  );
}

/** A fixed part before the value ("https://", "$"): engraved in the well, not selectable, not part of the value. */
function Prefix(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <Affix end="prefix" {...props} />;
}

/** A fixed part after the value (".com", "kg"): engraved in the well, not selectable, not part of the value. */
function Suffix(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <Affix end="suffix" {...props} />;
}

export interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** The share of `maxLength` at which the counter shows: 0 shows it always, 1 only at the limit. Default Textarea's (0.8). */
  countFrom?: number;
}

const Input = React.forwardRef<HTMLInputElement, FieldInputProps>(function FieldInput(
  { className, type, maxLength, countFrom, value, defaultValue, onChange, onKeyDown, onPaste, onFocus, onBlur, 'aria-describedby': describedBy, ...props },
  ref,
) {
  const { size, invalid, disabled, chars, input, setFilled, setActive, affix, shortcut, revealable, revealed } = React.useContext(FieldCtx);
  const [typed, setTyped] = React.useState(() => String(defaultValue ?? ''));
  const [refusals, setRefusals] = React.useState(0);
  const count = React.useRef<HTMLSpanElement>(null);
  const countId = React.useId();
  const length = (value !== undefined ? String(value) : typed).length;

  useIsoLayoutEffect(() => setFilled(length > 0), [length, setFilled]);
  // The counter shakes once per refusal (after it has rendered at the limit).
  React.useEffect(() => { if (refusals) refuse(count.current); }, [refusals]);

  const setRef = React.useCallback((el: HTMLInputElement | null) => {
    input.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [input, ref]);

  const room = maxLength != null ? maxLength - length : Infinity;
  const shown = maxLength != null && length >= maxLength * (countFrom ?? readShow(input.current));
  const own = cx(size === 'large' ? INPUT.large : INPUT.form, chars != null && 'field-chars', className);
  const described = cx(affix.prefix, affix.suffix, maxLength != null && countId, describedBy) || undefined;

  return (
    <>
      {/* Base UI's control: inside a FormField it takes the label, description and error, and the field's states. */}
      <BaseField.Control
        ref={setRef}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        aria-keyshortcuts={shortcut ? ariaKeys(shortcut) : undefined}
        // With a Field.Reveal the input is a password, shown as text while revealed.
        type={revealable ? (revealed ? 'text' : 'password') : type}
        disabled={disabled}
        value={value as BaseField.Control.Props['value']}
        defaultValue={defaultValue as BaseField.Control.Props['defaultValue']}
        maxLength={maxLength}
        className={own}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          if (value === undefined) setTyped(e.target.value);
          onChange?.(e);
        }}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => { setActive(true); onFocus?.(e); }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => { setActive(false); onBlur?.(e); }}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          // The shortcut's Esc: clear the text, or leave the field when there is none.
          if (shortcut && e.key === 'Escape') {
            if (e.currentTarget.value) { e.stopPropagation(); clearInput(e.currentTarget); } else e.currentTarget.blur();
            return;
          }
          if (maxLength == null || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
          const el = e.currentTarget;
          if (room + ((el.selectionEnd ?? 0) - (el.selectionStart ?? 0)) <= 0) setRefusals((n) => n + 1);
        }}
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          onPaste?.(e);
          if (maxLength == null) return;
          const el = e.currentTarget;
          if (e.clipboardData.getData('text').length > room + ((el.selectionEnd ?? 0) - (el.selectionStart ?? 0))) setRefusals((n) => n + 1);
        }}
        {...(props as BaseField.Control.Props)}
      />
      {maxLength != null && (
        <span ref={count} id={countId} className={COUNT} data-shown={shown ? '' : undefined} data-at-limit={room <= 0 ? '' : undefined}>
          {length}/{maxLength}
          <span className="sr-only" aria-live="polite">{refusals > 0 && room <= 0 ? `Limit reached, ${maxLength} characters` : ''}</span>
        </span>
      )}
    </>
  );
});

/** The share of the limit at which the counter shows: Textarea's count.show, as tuned where the field is. */
function readShow(el: Element | null) {
  if (typeof document === 'undefined') return 0.8;
  return parseFloat(getComputedStyle(el ?? document.documentElement).getPropertyValue('--mu-r-textarea-count-show')) || 0.8;
}

function Trail({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx(TRAIL, className)} {...props} />;
}

export interface FieldKeyProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The accessible name: "Clear", "Copy". */
  label: string;
  /** The glyph, sized by the key (12): `<Icon name="close" />`. */
  icon: React.ReactNode;
  /** A key that comes and goes: false hides it (it keeps its place); omit for a key that always shows. */
  shown?: boolean;
}

/** True from the frame after mount: a key that comes and goes only animates once it has been seen at rest,
 *  so a field that loads with text shows its clear key without a pop. */
function useReady() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready ? '' : undefined;
}

/** A mini key in the trail: a compact cap with a glyph. Pressing it keeps the caret in the input. */
const Key = React.forwardRef<HTMLButtonElement, FieldKeyProps>(function FieldKey({ label, icon, shown, className, type = 'button', disabled, onMouseDown, ...props }, ref) {
  const field = React.useContext(FieldCtx);
  const ready = useReady();
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      disabled={disabled ?? field.disabled}
      data-shown={shown === false ? undefined : ''}
      data-ready={ready}
      className={cx(KEY, shown !== undefined && 'field-presence', className)}
      onMouseDown={(e) => { onMouseDown?.(e); e.preventDefault(); }}
      {...props}
    >
      {icon}
    </button>
  );
});

export interface FieldClearProps extends Omit<FieldKeyProps, 'label' | 'shown'> {
  /** The accessible name. Default "Clear". */
  label?: string;
}

/** The clear key: shows while the input has text, and empties it (a controlled host hears onChange with ""). */
const Clear = React.forwardRef<HTMLButtonElement, FieldClearProps>(function FieldClear({ label = 'Clear', onClick, ...props }, ref) {
  const { input, filled } = React.useContext(FieldCtx);
  return (
    <Key
      ref={ref}
      label={label}
      shown={filled}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) clearInput(input.current); }}
      {...props}
    />
  );
});

export interface FieldCopyProps extends Omit<FieldKeyProps, 'label' | 'icon' | 'shown'> {
  /** The accessible name. Default "Copy". */
  label?: string;
  /** Said once after a copy. Default "Copied". */
  copiedLabel?: string;
  /** What to copy. Default the input's value. */
  value?: string;
  /** The copy glyph: `<Icon name="copy" />`. */
  icon: React.ReactNode;
  /** The glyph while the copy holds: `<Icon name="check" />`. It turns on the drum (copy → check strains too far to morph). */
  copiedIcon: React.ReactNode;
}

/** The copy key: shows while there is text; copies it, and its glyph turns on the drum to the check for the recipe's copy.hold. */
const Copy = React.forwardRef<HTMLButtonElement, FieldCopyProps>(function FieldCopy({ label = 'Copy', copiedLabel = 'Copied', value, icon, copiedIcon, onClick, ...props }, ref) {
  const { input, filled } = React.useContext(FieldCtx);
  const [copied, setCopied] = React.useState(0);
  React.useEffect(() => {
    if (!copied) return;
    const hold = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-field-copy-hold')) || 1400;
    const t = setTimeout(() => setCopied(0), hold);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <>
      <Key
        ref={ref}
        label={label}
        shown={filled || value != null}
        icon={<SwapIcon swapKey={copied ? 'copied' : 'copy'}>{copied ? copiedIcon : icon}</SwapIcon>}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          navigator.clipboard?.writeText(value ?? input.current?.value ?? '').then(() => setCopied((n) => n + 1), () => setCopied(0));
        }}
        {...props}
      />
      <span role="status" className="sr-only">{copied ? copiedLabel : ''}</span>
    </>
  );
});

export interface FieldRevealProps extends Omit<FieldKeyProps, 'label' | 'icon' | 'shown'> {
  /** The accessible name of the toggle. Default "Show password". */
  label?: string;
  /** The glyph while the password is hidden: `<MorphIcon name="eye" />`. */
  icon: React.ReactNode;
  /** The glyph while it shows: `<MorphIcon name="eye-off" />`. The same component as `icon`, so it morphs. */
  hideIcon: React.ReactNode;
}

/** The show-password key: makes the input a password and toggles it to text; aria-pressed says which. */
const Reveal = React.forwardRef<HTMLButtonElement, FieldRevealProps>(function FieldReveal({ label = 'Show password', icon, hideIcon, onClick, ...props }, ref) {
  const { revealed, setRevealed, setRevealable } = React.useContext(FieldCtx);
  useIsoLayoutEffect(() => {
    setRevealable(true);
    return () => { setRevealable(false); setRevealed(false); };
  }, [setRevealable, setRevealed]);
  return (
    <Key
      ref={ref}
      label={label}
      aria-pressed={revealed}
      // One slot for both glyphs: React keeps the element, so a MorphIcon morphs eye ↔ eye-off.
      icon={revealed ? hideIcon : icon}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) setRevealed(!revealed); }}
      {...props}
    />
  );
});

const MODIFIERS: Record<string, { aria: string; held: (e: KeyboardEvent) => boolean }> = {
  '⌘': { aria: 'Meta', held: (e) => e.metaKey || e.ctrlKey },
  '⌃': { aria: 'Control', held: (e) => e.ctrlKey },
  '⌥': { aria: 'Alt', held: (e) => e.altKey },
  '⇧': { aria: 'Shift', held: (e) => e.shiftKey },
};
const splitKeys = (keys: string) => ({ mods: [...keys].filter((c) => MODIFIERS[c]), key: [...keys].filter((c) => !MODIFIERS[c]).join('') });
const ariaKeys = (keys: string) => {
  const { mods, key } = splitKeys(keys);
  return [...mods.map((m) => MODIFIERS[m].aria), key.length === 1 ? key.toUpperCase() : key].join('+');
};

export interface FieldShortcutProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** The keys that focus the field, as glyphs: "⌘K", "/". ⌘ also answers to Ctrl. */
  keys: string;
  /** Listen for the keys on the page and focus the field. Default true; false when the host binds them. */
  bind?: boolean;
}

/** A keycap that says how to reach the field ("⌘K"), and turns on the drum to "Esc" while the field is active. */
function Shortcut({ keys, bind = true, className, ...props }: FieldShortcutProps) {
  const { input, active, setShortcut } = React.useContext(FieldCtx);
  useIsoLayoutEffect(() => {
    setShortcut(keys);
    return () => setShortcut(undefined);
  }, [keys, setShortcut]);
  React.useEffect(() => {
    if (!bind) return;
    const { mods, key } = splitKeys(keys);
    const onKey = (e: KeyboardEvent) => {
      const el = input.current;
      if (!el || el.disabled || e.key.toLowerCase() !== key.toLowerCase() || !mods.every((m) => MODIFIERS[m].held(e))) return;
      // A bare key ("/") only when nothing else is being typed in.
      const target = e.target as HTMLElement | null;
      if (!mods.length && target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [keys, bind, input]);
  // The input says the keys (aria-keyshortcuts); the cap is for the eye.
  return <Kbd aria-hidden className={cx('mu-field-shortcut', className)} {...props}><SwapText value={active ? 'Esc' : keys} /></Kbd>;
}

export interface FieldCheckProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The remote check passed. */
  shown: boolean;
  /** What passed, said once to a screen reader: "Name available". */
  label: string;
  /** The glyph, which acts as it arrives: `<Icon name="check" act />`. Sized by the field. */
  children: React.ReactNode;
}

/** A remote check that passed ("name available"): its glyph arrives acting. Ordinary valid fields show nothing. */
function Check({ shown, label, children, className, ...props }: FieldCheckProps) {
  const { size } = React.useContext(FieldCtx);
  const ready = useReady();
  return (
    <span role="status" className={cx(CHECK, 'size-field-key-size', GLYPH[size], className)} {...props}>
      {/* The glyph mounts as it shows, so its act plays on arrival. */}
      <span aria-hidden className="inline-grid field-presence" data-shown={shown ? '' : undefined} data-ready={ready}>{shown && children}</span>
      <span className="sr-only">{shown ? label : ''}</span>
    </span>
  );
}

export const Field = Object.assign(Root, { Icon, Prefix, Input, Suffix, Trail, Key, Clear, Copy, Reveal, Shortcut, Check, Root });

export interface SearchFieldProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** What the well says: "Lens or action". */
  placeholder: string;
  icon?: React.ReactNode;
  /** The key that opens it (a keycap at the end): "⌘K". */
  shortcut?: string;
  tone?: 'light' | 'graphite';
}

/** A button in a well that opens search. */
export const SearchField = React.forwardRef<HTMLButtonElement, SearchFieldProps>(function SearchField({ placeholder, icon, shortcut = '⌘K', tone = 'graphite', className, type = 'button', ...props }, ref) {
  return (
    <button ref={ref} type={type} data-tone={tone} aria-keyshortcuts={shortcut ? ariaKeys(shortcut) : undefined} className={cx(SEARCH[tone], className)} {...props}>
      {icon && <span aria-hidden className={ICON}>{icon}</span>}
      <span className="mu-search-field-text">{placeholder}</span>
      {shortcut && <Kbd surface={tone === 'graphite' ? 'strip' : 'default'} size="default">{shortcut}</Kbd>}
    </button>
  );
});
