'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Field } from '../field/field';
import { FormField } from '../form-field/form-field';
import { Popover } from '../popover/popover';
import { buttonClasses } from '../button/button';
import { RadioKey, RadioKeys } from '../toggle/toggle';
import { ClockIcon, CloseIcon } from '../../icons/components.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * TIME PICKER, a form field you type a time into, or choose one from slots; DatePicker's sibling
 *
 *   rest      the field's well: the time in the reader's words ("14:30", "2:30 PM"), or the hint
 *             ("hh:mm"); a zone engraved as the suffix ("WEST"); the trail holds the clear key and
 *             the clock key
 *   type      "14:30", "1430", "930", "9", "2.30pm", "230p", "14h30"; under the field the readback
 *             says it with its part of the day ("2:30 in the afternoon"), so 02:30 and 14:30 can't
 *             be mixed up. Leaving writes it in the reader's words. An hour without AM/PM on a
 *             12-hour clock is the working day's (7–11 morning, 12–6 afternoon), or the one inside
 *             min / max
 *   dial      ↑ ↓ step the part under the caret and select it: the hour by one, the minute to the
 *             next slot, the second by one, AM/PM flips; the ends of min / max stop it
 *   wrong     words that aren't a time, or a time outside min / max: the invalid ring once you
 *             leave, and the message as the input's validity (FormField.Error says it)
 *   open      the clock key (or Alt ↓) opens the slots: latching keys (RadioKeys), four to a row,
 *             every `step` minutes inside min / max, scrolled to the chosen one (or now) with focus
 *             on it. A press chooses and closes; arrows move the latch and the field follows; Enter
 *             or Space closes. Unavailable slots in ink3, said, still choosable. Now under them
 *   end       `from` (the start of a pair): the slots begin after it and each says how long it
 *             would be ("1 h 30"), two to a row
 *   night     min after max ("22:00" to "02:00") is one window across midnight
 *   form      `name` sends ISO 8601 (14:30, or 14:30:05) in a hidden input; required, readOnly,
 *             disabled and invalid as the field's
 * Reduce Motion: the field's, the popover's and the keys' own.
 * ───────────────────────────────────────────────────────── */

export type TimeGranularity = 'hour' | 'minute' | 'second';

export interface TimePickerProps {
  /** The time as ISO 8601 ("14:30", "14:30:05"), or null when empty. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Minutes between slots, and the minute dial's step. Default 15 (60 at hour granularity). */
  step?: number;
  /** The earliest and latest time ("09:00", "17:30"). min after max is one window across midnight. */
  min?: string;
  max?: string;
  /** The start of a pair: the slots begin after it and say how long each would be. */
  from?: string | null;
  /** Times with nothing to offer (booked): quiet, and described as unavailable. They can still be chosen. */
  isTimeUnavailable?: (time: string) => boolean;
  /** 12 or 24 hours. Default: the locale's. */
  hourCycle?: 12 | 24;
  /** How precise the time is. Default minute. */
  granularity?: TimeGranularity;
  /** An IANA zone ("Europe/Lisbon"): its short name is engraved after the time. The value stays wall time. */
  timeZone?: string;
  locale?: string;
  /** Names the field when there is no visible label. */
  'aria-label'?: string;
  id?: string;
  placeholder?: string;
  /** regular (32, the default) or compact (28). */
  size?: 'regular' | 'compact';
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Sends the value with a form, as ISO 8601, in a hidden input. */
  name?: string;
  /** Say what a typed time was understood as, under the field. Default true. */
  readback?: boolean;
  /** A Now key under the slots. Default true. */
  now?: boolean;
  className?: string;
}

/* ── times as seconds since midnight ───────────────────── */

const DAY = 86400;
const wrap = (n: number) => ((n % DAY) + DAY) % DAY;
const pad = (n: number) => String(n).padStart(2, '0');

/** Seconds since midnight from "14:30" or "14:30:05". */
export function secondsOf(time: string) {
  const [h, m, s = 0] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}
/** "14:30" (or "14:30:05" at second granularity) from seconds since midnight. */
export function timeOf(n: number, granularity: TimeGranularity = 'minute') {
  const t = wrap(n);
  const hm = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}`;
  return granularity === 'second' ? `${hm}:${pad(t % 60)}` : hm;
}
const dateOf = (n: number) => new Date(2000, 0, 1, Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60);

/** A window of the day: inside min and max, or, when min is after max, across midnight. */
function windowOf(min?: string, max?: string) {
  const lo = min ? secondsOf(min) : null;
  const hi = max ? secondsOf(max) : null;
  const inside = (n: number) => {
    if (lo != null && hi != null && lo > hi) return n >= lo || n <= hi;
    return (lo == null || n >= lo) && (hi == null || n <= hi);
  };
  return { lo, hi, inside };
}

/** The locale's words for the two halves of the day, and its clock. */
function clockOf(locale: string | undefined, hourCycle: 12 | 24 | undefined) {
  const twelve = hourCycle ? hourCycle === 12 : ['h11', 'h12'].includes(new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle ?? '');
  const half = (h: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' }).formatToParts(new Date(2000, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value.toLowerCase();
  const am = [half(1), 'a.m.', 'am', 'a'].filter((w): w is string => !!w);
  const pm = [half(13), 'p.m.', 'pm', 'p'].filter((w): w is string => !!w);
  return { twelve, am, pm };
}

/** A time from typed words, as seconds: null when empty, undefined when it can't be read. */
function parseTime(text: string, clock: ReturnType<typeof clockOf>, inside: (n: number) => boolean): number | null | undefined {
  let t = text.trim().toLowerCase();
  if (!t) return null;
  let pm: boolean | undefined;
  const marks = [...clock.am.map((w) => [w, false] as const), ...clock.pm.map((w) => [w, true] as const)].sort((a, b) => b[0].length - a[0].length);
  for (const [w, isPm] of marks) {
    if (t.endsWith(w)) { pm = isPm; t = t.slice(0, -w.length).trim(); break; }
    if (t.startsWith(w)) { pm = isPm; t = t.slice(w.length).trim(); break; }
  }
  const m = t.match(/^(\d{1,2})(?:\s*[:.h]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?)?$/) ?? t.match(/^(\d{1,2})(\d{2})(\d{2})?$/);
  if (!m) return undefined;
  let h = +m[1];
  const min = +(m[2] ?? 0);
  const sec = +(m[3] ?? 0);
  if (min > 59 || sec > 59) return undefined;
  const rest = min * 60 + sec;
  if (pm !== undefined) {
    if (h > 12) return undefined;
    h = (h % 12) + (pm ? 12 : 0);
  } else if (clock.twelve && h >= 1 && h <= 12) {
    // No AM or PM on a 12-hour clock: the one inside the window, else the working day's.
    const morning = (h % 12) * 3600 + rest;
    const afternoon = morning + 12 * 3600;
    if (inside(morning) !== inside(afternoon)) return inside(morning) ? morning : afternoon;
    return h >= 7 && h <= 11 ? morning : afternoon;
  }
  if (h > 23) return undefined;
  return h * 3600 + rest;
}

/** How long from one time to another: "45 min", "1 h", "1 h 30". */
function lengthOf(from: number, to: number) {
  const m = Math.round(wrap(to - from) / 60);
  const h = Math.floor(m / 60);
  return h ? (m % 60 ? `${h} h ${m % 60}` : `${h} h`) : `${m} min`;
}

/* ── looks ─────────────────────────────────────────────── */

const FIELD = { minute: 'mu-time-picker min-w-time-picker-min-width', second: 'mu-time-picker min-w-time-picker-seconds-min-width' };
const PLATE = 'mu-time-picker-plate max-w-none!';
const SCROLL = 'mu-time-picker-slots time-picker-scroll';
const GRID = 'time-picker-grid';
const SLOT = 'tabular-nums data-unavailable:not-data-pressed:text-ink3';
const LENGTH = 'type-meta text-ink3';
const FOOT = 'mu-time-picker-foot flex justify-end pt-time-picker-pad';
const NOW = buttonClasses('standard', 'compact');

/** A form field you type a time into, or choose one from slots. */
export function TimePicker(props: TimePickerProps) {
  const {
    id, placeholder, size = 'regular', invalid, disabled, readOnly, required, name, readback = true, now: nowKey = true, className,
    granularity = 'minute', min, max, from, isTimeUnavailable, hourCycle, timeZone, locale,
  } = props;
  const step = Math.max(1, props.step ?? (granularity === 'hour' ? 60 : 15));
  const [own, setOwn] = React.useState<string | null>(props.defaultValue ?? null);
  const value = props.value !== undefined ? props.value : own;
  const n = value == null ? null : secondsOf(value);
  const input = React.useRef<HTMLInputElement>(null);
  const plate = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [left, setLeft] = React.useState(false);
  const caretPart = React.useRef<number | null>(null);
  const quietId = React.useId();

  const start = from ? secondsOf(from) : null;
  const win = React.useMemo(() => windowOf(min ?? from ?? undefined, max), [min, max, from]);
  const clock = React.useMemo(() => clockOf(locale, hourCycle), [locale, hourCycle]);
  const fmt = React.useMemo(() => new Intl.DateTimeFormat(locale, {
    hour: clock.twelve ? 'numeric' : '2-digit', minute: '2-digit', second: granularity === 'second' ? '2-digit' : undefined, hourCycle: clock.twelve ? 'h12' : 'h23',
  }), [locale, clock.twelve, granularity]);
  const words = React.useMemo(() => new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', second: granularity === 'second' ? '2-digit' : undefined, hourCycle: 'h12', dayPeriod: 'long',
  }), [locale, granularity]);
  const zone = React.useMemo(() => {
    if (!timeZone) return null;
    try { return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? timeZone; } catch { return timeZone; }
  }, [timeZone, locale]);
  const hint = React.useMemo(() => fmt.formatToParts(dateOf(9 * 3600)).map((p) => (
    p.type === 'hour' ? 'hh' : p.type === 'minute' ? 'mm' : p.type === 'second' ? 'ss' : p.type === 'dayPeriod' ? `${clock.am[0]}/${clock.pm[0]}` : p.value
  )).join(''), [fmt, clock]);

  const precise = (s: number) => secondsOf(timeOf(s, granularity)); // drops what the granularity doesn't keep
  const show = (s: number | null) => (s == null ? '' : fmt.format(dateOf(s)));
  const parse = (t: string) => { const p = parseTime(t, clock, win.inside); return p == null ? p : precise(p); };

  const [text, setText] = React.useState(() => show(n));
  const parsed = parse(text);
  // Keep the words in step with a value set from outside (a slot, Now, the host).
  React.useEffect(() => {
    if (parse(text) !== n) setText(show(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, fmt]);

  const span = win.lo != null && win.hi != null ? `from ${show(win.lo)} to ${show(win.hi)}` : win.lo != null ? `from ${show(win.lo)}` : `up to ${show(win.hi)}`;
  const message = parsed === undefined ? `Enter a time like ${show(14.5 * 3600)}` : parsed != null && !win.inside(parsed) ? `Choose a time ${span}` : '';
  useIsoLayoutEffect(() => { input.current?.setCustomValidity(message); }, [message]);

  // A dial step selects the part it changed.
  useIsoLayoutEffect(() => {
    const at = caretPart.current;
    const el = input.current;
    if (at == null || !el || n == null) return;
    caretPart.current = null;
    let pos = 0;
    for (const [i, p] of fmt.formatToParts(dateOf(n)).entries()) {
      if (i === at) { el.setSelectionRange(pos, pos + p.value.length); break; }
      pos += p.value.length;
    }
  }, [text]);

  const set = (s: number | null) => {
    const v = s == null ? null : timeOf(s, granularity);
    if (props.value === undefined) setOwn(v);
    props.onValueChange?.(v);
  };
  const accept = (s: number | null) => { set(s); setText(show(s)); setLeft(false); };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setText(t);
    const p = parse(t);
    if (p !== undefined && (p == null || win.inside(p)) && p !== n) set(p);
    if (!t) setLeft(false);
  };
  const onBlur = () => {
    if (parsed !== undefined && !message) setText(show(parsed));
    setLeft(!!message);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!readOnly && !disabled) setOpen(true); return; }
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || readOnly || n == null || text !== show(n)) return;
    // ↑ ↓ step the part under the caret: the hour, the minute (to the next slot), the second, or AM/PM.
    e.preventDefault();
    const caret = e.currentTarget.selectionStart ?? 0;
    const parts = fmt.formatToParts(dateOf(n));
    let pos = 0;
    let at = -1;
    parts.forEach((p, i) => {
      const end = pos + p.value.length;
      if (at < 0 && p.type !== 'literal' && caret >= pos && caret <= end) at = i;
      pos = end;
    });
    if (at < 0) at = parts.findIndex((p) => p.type === 'minute' || p.type === 'hour');
    const type = parts[at]?.type;
    const up = e.key === 'ArrowUp' ? 1 : -1;
    let next: number;
    if (type === 'hour') next = n + up * 3600;
    else if (type === 'dayPeriod') next = n + 12 * 3600;
    else if (type === 'second') next = n + up;
    else {
      // Minutes land on the slots, counted from the window's start.
      const base = Math.round((win.lo ?? 0) / 60);
      const mins = Math.floor(n / 60) - base;
      const slot = up > 0 ? (Math.floor(mins / step) + 1) * step : (Math.ceil(mins / step) - 1) * step;
      next = (base + slot) * 60 + (granularity === 'second' ? n % 60 : 0);
    }
    next = wrap(next);
    // The window's ends stop the dial.
    if (!win.inside(next)) next = up > 0 ? (win.hi ?? next) : (win.lo ?? next);
    caretPart.current = at;
    accept(next);
  };

  // The slots: every `step` minutes inside the window (after the start of a pair).
  const slots = React.useMemo(() => {
    const first = start != null ? start + step * 60 : (win.lo ?? 0);
    const out: number[] = [];
    for (let s = first; s < first + DAY && out.length < 1440; s += step * 60) {
      const t = wrap(s);
      if (start != null && s >= start + DAY) break;
      if (win.inside(t)) out.push(t);
      else if (out.length) break;
    }
    return out;
  }, [start, step, win]);

  const nowSeconds = () => { const d = new Date(); return precise(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()); };
  // On open: the chosen slot (or the one nearest now) in the middle of the plate, with focus on it.
  const focusSlot = () => {
    const box = plate.current;
    if (!box) return true;
    const keys = [...box.querySelectorAll<HTMLElement>('[role=radio]')];
    let el = keys.find((k) => k.hasAttribute('data-checked'));
    if (!el && keys.length) {
      const target = n ?? nowSeconds();
      const gap = (k: HTMLElement) => { const d = Math.abs(secondsOf(k.dataset.time!) - target); return Math.min(d, DAY - d); };
      el = keys.reduce((a, b) => (gap(b) < gap(a) ? b : a));
    }
    if (!el) return true;
    box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
    return el;
  };
  const nowOut = !win.inside(nowSeconds());
  const reading = parsed != null && !message && text !== show(parsed) ? words.format(dateOf(parsed)) : '';
  const quiet = (s: number) => !!isTimeUnavailable?.(timeOf(s, granularity));

  return (
    <>
      <Field size={size} invalid={invalid || (left && !!message)} disabled={disabled} className={className ? `${FIELD[granularity === 'second' ? 'second' : 'minute']} ${className}` : FIELD[granularity === 'second' ? 'second' : 'minute']}>
        <Field.Input
          ref={input}
          id={id}
          value={text}
          inputMode="text"
          placeholder={placeholder ?? hint}
          aria-label={props['aria-label']}
          required={required}
          readOnly={readOnly}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        {zone && <Field.Suffix>{zone}</Field.Suffix>}
        <Field.Trail>
          {!readOnly && <Field.Clear icon={<CloseIcon />} />}
          <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
              <Field.Key label="Choose a time" icon={<ClockIcon />} disabled={disabled || readOnly} />
            </Popover.Trigger>
            <Popover.Content align="end" className={PLATE} finalFocus={input} initialFocus={focusSlot}>
              {/* Its own field root: inside a FormField the slots would otherwise take the field's label and validity. */}
              <BaseField.Root ref={plate} className={SCROLL}>
                <RadioKeys
                  aria-label={props['aria-label'] ? `${props['aria-label']}, times` : 'Times'}
                  value={value == null ? null : timeOf(secondsOf(value), granularity)}
                  onValueChange={(v) => v != null && accept(secondsOf(String(v)))}
                  className={GRID}
                  data-lengths={start != null ? '' : undefined}
                  // A press chooses and closes; arrows only move the latch.
                  onClick={(e) => { if ((e.target as Element).closest('[role=radio]')) setOpen(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); } }}
                >
                  {slots.map((s) => (
                    <RadioKey
                      key={s}
                      value={timeOf(s, granularity)}
                      data-time={timeOf(s, granularity)}
                      data-unavailable={quiet(s) ? '' : undefined}
                      aria-describedby={quiet(s) ? quietId : undefined}
                      className={SLOT}
                    >
                      {show(s)}
                      {start != null && <span className={LENGTH}>{lengthOf(start, s)}</span>}
                    </RadioKey>
                  ))}
                </RadioKeys>
              </BaseField.Root>
              {isTimeUnavailable && <span id={quietId} hidden>Unavailable</span>}
              {nowKey && start == null && (
                <div className={FOOT}>
                  <button type="button" className={NOW} disabled={nowOut} onClick={() => { accept(nowSeconds()); setOpen(false); }}>Now</button>
                </div>
              )}
            </Popover.Content>
          </Popover>
        </Field.Trail>
      </Field>
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      {readback && <FormField.Readback>{reading}</FormField.Readback>}
    </>
  );
}
