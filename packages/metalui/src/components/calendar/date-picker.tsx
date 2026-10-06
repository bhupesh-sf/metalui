'use client';

import * as React from 'react';
import { Field } from '../field/field';
import { FormField } from '../form-field/form-field';
import { Popover } from '../popover/popover';
import { buttonClasses } from '../button/button';
import { menuParts } from '../menu/menu';
import { Icon } from '../../icons/Icon';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { Calendar, addMonths, sameDay, startOfDay, type CalendarSingleProps, type DateRange } from './calendar';

/* ─────────────────────────────────────────────────────────
 * DATE PICKER, a form field you type a date into, or open a calendar from
 *
 *   rest      the field's well: the date in the reader's words ("30 Sept 2026"), or the locale's
 *             pattern as the hint ("dd/mm/yyyy"); the trail holds the clear key and the calendar key
 *   type      digits in the locale's order ("7/10", "7 oct", "2026-10-07"), the year and month taken
 *             from today when left out; under the field the readback says what was understood
 *             ("Wed, 7 Oct 2026") on the drum. Leaving the field writes it in the reader's words
 *   segments  ↑ ↓ step the part under the caret (day, month or year) and select it, like a dial
 *   wrong     a date that can't be read, or is out of min / max: the field's invalid ring once you
 *             leave it, and the message for FormField.Error (the input's own validity)
 *   open      the calendar key (or Alt ↓) opens the calendar in the popover, focus on the chosen day
 *             (or today); choosing closes it and focus returns to the field. Beside the calendar:
 *             Today (one day), and the host's presets ("Last 7 days") as menu rows
 *   range     mode="range": "1–7 Oct 2026" in one field; the popover closes when the range is whole
 *   clear     the field's clear key pops in once there is something to clear
 *   form      `name` sends ISO 8601 (2026-10-07, or 2026-10-01/2026-10-07 for a range) in a hidden
 *             input; `required`, `readOnly`, `disabled` and `invalid` as the field's; in a FormField it
 *             takes the label, description and error like any control
 * Reduce Motion: the field's and the calendar's own (keys fade, the drum crossfades).
 * ───────────────────────────────────────────────────────── */

type CalendarOptions = Pick<CalendarSingleProps, 'min' | 'max' | 'isDateUnavailable' | 'marks' | 'locale' | 'weekStartsOn' | 'weekNumbers' | 'months' | 'defaultMonth'>;

/** A ready choice beside the calendar: "Last 7 days", "This month". */
export interface DatePreset<V> { label: string; value: V }

interface DatePickerBase extends CalendarOptions {
  /** Names the field when there is no visible label (inside a FormField, its label names it). */
  'aria-label'?: string;
  id?: string;
  /** The hint while empty. Default: the locale's pattern, "dd/mm/yyyy". */
  placeholder?: string;
  /** regular (32, the default) or compact (28): the field ladder. */
  size?: 'regular' | 'compact';
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Sends the value with a form, as ISO 8601, in a hidden input. */
  name?: string;
  /** How the chosen day is written in the field. */
  format?: Intl.DateTimeFormatOptions;
  /** Say what a typed date was understood as, under the field. Default true. */
  readback?: boolean;
  className?: string;
}

export interface DatePickerSingleProps extends DatePickerBase {
  mode?: 'single';
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | null) => void;
  /** A Today key under the calendar. Default true. */
  today?: boolean;
  presets?: DatePreset<Date>[];
}
export interface DatePickerRangeProps extends DatePickerBase {
  mode: 'range';
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
  minDays?: number;
  maxDays?: number;
  presets?: DatePreset<DateRange>[];
}
export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;
type PickerValue = Date | DateRange | null;

/* ── reading typed dates ───────────────────────────────── */

type Part = 'day' | 'month' | 'year';

/** The locale's order of day, month and year, and its numeric pattern as a hint ("dd/mm/yyyy"). */
function patternOf(locale?: string) {
  const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date(2026, 10, 22));
  const order = parts.map((p) => p.type).filter((t): t is Part => t === 'day' || t === 'month' || t === 'year');
  const hint = parts.map((p) => (p.type === 'day' ? 'dd' : p.type === 'month' ? 'mm' : p.type === 'year' ? 'yyyy' : p.value)).join('');
  return { order, hint };
}

/** Month names, long and short, in the locale and in English, without dots. */
function monthNames(locale?: string) {
  const names = (loc: string | undefined) => Array.from({ length: 12 }, (_, m) => (['long', 'short'] as const).map((month) => new Intl.DateTimeFormat(loc, { month }).format(new Date(2026, m, 1)).toLowerCase().replace(/\./g, '')));
  const local = names(locale);
  const en = names('en');
  return local.map((n, m) => [...n, ...en[m]]);
}

/** One day from typed words: a Date, null when empty, undefined when it can't be read. Left-out parts come from `ref`. */
export function parseDay(text: string, locale: string | undefined, ref: Date): Date | null | undefined {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return real(+iso[1], +iso[2] - 1, +iso[3]);
  const tokens = t.split(/[\s/.,\-]+/).filter(Boolean);
  let month: number | undefined;
  let year: number | undefined;
  const nums: number[] = [];
  const names = monthNames(locale);
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      // Three or four digits are the year wherever they stand.
      if (tok.length >= 3) { if (year != null) return undefined; year = +tok; } else nums.push(+tok);
      continue;
    }
    const m = names.findIndex((n) => n.some((x) => x === tok || (tok.length >= 3 && x.startsWith(tok))));
    if (m < 0 || month != null) return undefined;
    month = m;
  }
  const slots = patternOf(locale).order.filter((p) => (p !== 'year' || year == null) && (p !== 'month' || month == null));
  let day: number | undefined;
  // One number alone is a day, whatever the locale's order.
  if (nums.length === 1) day = nums[0];
  else {
    if (nums.length > slots.length) return undefined;
    nums.forEach((n, i) => {
      if (slots[i] === 'day') day = n;
      else if (slots[i] === 'month') month = n - 1;
      else year = n < 100 ? 2000 + n : n;
    });
  }
  if (day == null) return undefined;
  return real(year ?? ref.getFullYear(), month ?? ref.getMonth(), day);
}

/** The date, if those parts make one (not 31 June). */
function real(y: number, m: number, d: number) {
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : undefined;
}

/** A range from typed words: "1/10 – 7/10", "1–7 Oct 2026"; the left end takes what it leaves out from the right. */
function parseRange(text: string, locale: string | undefined, ref: Date): DateRange | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const [a, b, ...rest] = t.split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/i).filter((s, i) => s || i === 0);
  if (rest.length) return undefined;
  if (!b) {
    const start = parseDay(a, locale, ref);
    return start ? { start, end: null } : undefined;
  }
  const end = parseDay(b, locale, ref);
  const start = end ? parseDay(a, locale, end) : undefined;
  if (!start || !end) return undefined;
  return start <= end ? { start, end } : { start: end, end: start };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const keyOf = (v: PickerValue | undefined) => (v == null ? String(v) : v instanceof Date ? iso(v) : `${iso(v.start)}/${v.end ? iso(v.end) : ''}`);

/* ── looks ─────────────────────────────────────────────── */

const FIELD = { single: 'mu-date-picker min-w-calendar-picker-min-width', range: 'mu-date-picker min-w-calendar-picker-range-min-width' };
const PLATE = 'mu-date-picker-plate max-w-none!';
const LAYOUT = 'flex items-start gap-calendar-presets-gap';
const PRESETS = 'mu-date-picker-presets grid content-start w-calendar-presets-width pt-calendar-pad';
const PRESET = `${menuParts.ROW} w-full border-0 bg-transparent text-left cursor-pointer hover:recipe-menu-row-hover focus-visible:recipe-menu-row-hover aria-pressed:recipe-menu-row-hover`;
const FOOT = 'mu-date-picker-foot flex justify-end px-calendar-pad';
const TODAY = buttonClasses('standard', 'compact');

/** A form field you type a date (or a range) into, or open a calendar from. */
export function DatePicker(props: DatePickerProps) {
  const {
    mode = 'single', id, placeholder, size = 'regular', invalid, disabled, readOnly, required, name, readback = true, className,
    format = { day: 'numeric', month: 'short', year: 'numeric' },
    min, max, isDateUnavailable, marks, locale, weekStartsOn, weekNumbers, months, defaultMonth,
  } = props;
  const range = mode === 'range';
  const [own, setOwn] = React.useState<PickerValue>(props.defaultValue ?? null);
  const value: PickerValue = props.value !== undefined ? props.value : own;
  const input = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [left, setLeft] = React.useState(false);
  const caretPart = React.useRef<number | null>(null);

  const fmt = React.useMemo(() => new Intl.DateTimeFormat(locale, format), [locale, format]);
  const readout = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), [locale]);
  const { hint } = React.useMemo(() => patternOf(locale), [locale]);
  const show = (v: PickerValue) => (v == null ? '' : v instanceof Date ? fmt.format(v) : v.end ? fmt.formatRange(v.start, v.end) : `${fmt.format(v.start)} – `);
  const parse = (t: string): PickerValue | undefined => (range ? parseRange(t, locale, startOfDay(new Date())) : parseDay(t, locale, startOfDay(new Date())));
  const lo = min ? startOfDay(min) : null;
  const hi = max ? startOfDay(max) : null;
  const outside = (d: Date) => (lo != null && d < lo) || (hi != null && d > hi);

  const [text, setText] = React.useState(() => show(value));
  const parsed = parse(text);
  // Keep the words in step with a value set from outside (a calendar pick, a preset, the host).
  const valueKey = keyOf(value);
  React.useEffect(() => {
    if (keyOf(parse(text)) !== valueKey) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const set = (v: PickerValue) => {
    if (props.value === undefined) setOwn(v);
    (props.onValueChange as ((v: PickerValue) => void) | undefined)?.(v);
  };
  const days = (v: PickerValue | undefined) => (v == null ? [] : v instanceof Date ? [v] : [v.start, ...(v.end ? [v.end] : [])]);
  const span = lo && hi ? `from ${fmt.format(lo)} to ${fmt.format(hi)}` : lo ? `from ${fmt.format(lo)}` : hi ? `up to ${fmt.format(hi)}` : '';
  const message = parsed === undefined ? `Enter a date like ${hint}` : days(parsed).some(outside) ? `Choose a day ${span}` : '';

  // The input's own validity carries the message, so a FormField's error says it and a form won't submit.
  useIsoLayoutEffect(() => { input.current?.setCustomValidity(message); }, [message]);

  // A dial step selects the part it changed.
  useIsoLayoutEffect(() => {
    const at = caretPart.current;
    const el = input.current;
    if (at == null || !el || !(value instanceof Date)) return;
    caretPart.current = null;
    let pos = 0;
    for (const [i, p] of fmt.formatToParts(value).entries()) {
      if (i === at) { el.setSelectionRange(pos, pos + p.value.length); break; }
      pos += p.value.length;
    }
  }, [text]);

  const accept = (v: PickerValue, close = true) => {
    set(v);
    setText(show(v));
    setLeft(false);
    if (close) setOpen(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setText(t);
    const p = parse(t);
    if (p !== undefined && !days(p).some(outside) && keyOf(p) !== valueKey) set(p);
    if (!t) setLeft(false);
  };
  const onBlur = () => {
    // Leaving writes a date that was understood in the reader's words; one that wasn't shows the invalid ring.
    if (parsed !== undefined && !message) setText(show(parsed));
    setLeft(!!message);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!readOnly && !disabled) setOpen(true); return; }
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || readOnly || !(value instanceof Date) || text !== show(value)) return;
    // ↑ ↓ step the part under the caret: the day, the month or the year.
    e.preventDefault();
    const caret = e.currentTarget.selectionStart ?? 0;
    const parts = fmt.formatToParts(value);
    let pos = 0;
    let at = -1;
    parts.forEach((p, i) => {
      const end = pos + p.value.length;
      if (at < 0 && p.type !== 'literal' && caret >= pos && caret <= end) at = i;
      pos = end;
    });
    if (at < 0) at = parts.findIndex((p) => p.type === 'day');
    const type = parts[at]?.type;
    const n = e.key === 'ArrowUp' ? 1 : -1;
    const stepped = type === 'month' ? addMonths(value, n) : type === 'year' ? addMonths(value, 12 * n) : new Date(value.getFullYear(), value.getMonth(), value.getDate() + n);
    const next = lo && stepped < lo ? lo : hi && stepped > hi ? hi : stepped;
    caretPart.current = at;
    accept(next, false);
  };

  // Under the field: what the typed words were understood as, until they are written back in the reader's words.
  const reading = parsed != null && !message && text !== show(parsed) ? days(parsed).map((d) => readout.format(d)).join(' to ') : '';
  const today = startOfDay(new Date());
  const calendarProps = { min, max, isDateUnavailable, marks, locale, weekStartsOn, weekNumbers, months, defaultMonth, autoFocus: true, 'aria-label': props['aria-label'] ?? 'Calendar' };
  const presets = props.presets as DatePreset<Date | DateRange>[] | undefined;

  return (
    <>
      <Field size={size} invalid={invalid || (left && !!message)} disabled={disabled} className={className ? `${FIELD[mode]} ${className}` : FIELD[mode]}>
        <Field.Input
          ref={input}
          id={id}
          value={text}
          placeholder={placeholder ?? (range ? `${hint} – ${hint}` : hint)}
          aria-label={props['aria-label']}
          required={required}
          readOnly={readOnly}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        <Field.Trail>
          {!readOnly && <Field.Clear icon={<Icon name="close" />} />}
          <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
              <Field.Key label={range ? 'Choose dates' : 'Choose a day'} icon={<Icon name="calendar" />} disabled={disabled || readOnly} />
            </Popover.Trigger>
            <Popover.Content align="end" className={PLATE} finalFocus={input}>
              <div className={LAYOUT}>
                {presets?.length ? (
                  <div role="group" aria-label="Presets" className={PRESETS}>
                    {presets.map((p) => (
                      <button key={p.label} type="button" className={PRESET} aria-pressed={keyOf(p.value) === valueKey} onClick={() => accept(p.value)}>{p.label}</button>
                    ))}
                  </div>
                ) : null}
                <div className="grid">
                  {props.mode === 'range' ? (
                    <Calendar {...calendarProps} mode="range" minDays={props.minDays} maxDays={props.maxDays} value={value instanceof Date ? null : value} onValueChange={(v) => accept(v, !!v.end)} />
                  ) : (
                    <Calendar {...calendarProps} value={value instanceof Date ? value : null} onValueChange={(d) => accept(d)} />
                  )}
                  {!range && props.mode !== 'range' && props.today !== false && (
                    <div className={FOOT}>
                      <button type="button" className={TODAY} disabled={outside(today)} aria-pressed={value instanceof Date && sameDay(value, today)} onClick={() => accept(today)}>Today</button>
                    </div>
                  )}
                </div>
              </div>
            </Popover.Content>
          </Popover>
        </Field.Trail>
      </Field>
      {name && <input type="hidden" name={name} value={value == null || (!(value instanceof Date) && !value.end) ? '' : keyOf(value)} disabled={disabled} />}
      {readback && <FormField.Readback>{reading}</FormField.Readback>}
    </>
  );
}
