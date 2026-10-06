'use client';

import * as React from 'react';
import { Button } from '../button/button';
import { Popover } from '../popover/popover';
import { Dialog } from '../dialog/dialog';
import { Switcher } from '../switcher/switcher';
import { CalendarIcon } from '../../icons/components.generated';
import { Calendar, endOf, startOf, startOfDay, type CalendarPeriod, type CalendarSingleProps, type DateRange } from './calendar';

/* ─────────────────────────────────────────────────────────
 * DATE SELECTOR, a date condition you choose and then apply: "Due before 6 Oct 2026"
 *
 *   rest      a key (the button's cap, the calendar glyph) reading the condition as a sentence, or
 *             the placeholder ("Any date")
 *   open      the key opens the panel in a popover (or a dialog, titled by the label): the operator
 *             switcher (is, before, after, between: Filters' words), two months, and the foot with the
 *             draft in words, Clear, Cancel and Apply. Focus lands on the chosen day (or today)
 *   operator  the switcher's thumb glides; the day carries across (is 6 Oct → between 6 – 6 Oct;
 *             between → its start)
 *   draft     choosing changes only the draft; Apply (off until the draft is whole and changed)
 *             commits and closes; Cancel, Esc or a click outside throws the draft away; Clear commits
 *             no condition. Focus returns to the key
 *   narrow    the panel is the calendar's container: as wide as two months, or what the popover's room
 *             or the dialog leaves; narrower, the calendar shows one month with both steps
 *   form      `name` sends "before:2026-10-06" or "between:2026-10-01/2026-10-07"
 * Reduce Motion: the popover's, the dialog's, the switcher's and the calendar's own.
 * ───────────────────────────────────────────────────────── */

/** How a date relates to the chosen one: Filters' words. */
export type DateOperator = 'is' | 'before' | 'after' | 'between';
/** A condition on a date. With a period other than day, a date is its unit's first day and a range's end the last day of its last unit. */
export type DateCondition =
  | { op: 'is' | 'before' | 'after'; value: Date }
  | { op: 'between'; value: { start: Date; end: Date } };

type CalendarOptions = Pick<CalendarSingleProps, 'period' | 'min' | 'max' | 'isDateUnavailable' | 'marks' | 'locale' | 'weekStartsOn'>;

export interface DateSelectorProps extends CalendarOptions {
  value?: DateCondition | null;
  defaultValue?: DateCondition | null;
  /** Hears the applied condition, or null when cleared. Choosing in the panel is a draft until Apply. */
  onValueChange?: (value: DateCondition | null) => void;
  /** The operators offered, in order. Default all four; one hides the switcher. */
  operators?: DateOperator[];
  /** What is being conditioned ("Due"): leads the key's sentence and titles the dialog. */
  label?: string;
  /** The key's words with no condition. Default "Any date". */
  placeholder?: string;
  /** popover (the default) under the key, or a dialog. */
  presentation?: 'popover' | 'dialog';
  /** Months side by side. Default 2; a narrow panel shows one. */
  months?: number;
  /** regular (32, the default) or compact (28). */
  size?: 'regular' | 'compact';
  /** Sends the condition with a form ("before:2026-10-06") in a hidden input. */
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

const allOps: DateOperator[] = ['is', 'before', 'after', 'between'];
const opWords: Record<DateOperator, string> = { is: 'is', before: 'before', after: 'after', between: 'between' };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyOf = (c: DateCondition | null | undefined) => (!c ? '' : c.op === 'between' ? `between:${iso(c.value.start)}/${iso(c.value.end)}` : `${c.op}:${iso(c.value)}`);

/** Does a date meet the condition? Days are compared whole, in local time; `period` as the selector's. */
export function matchesDate(condition: DateCondition, date: Date, period: CalendarPeriod = 'day') {
  const d = startOfDay(date);
  switch (condition.op) {
    case 'is': return d >= startOf(condition.value, period) && d <= endOf(condition.value, period);
    case 'before': return d < startOf(condition.value, period);
    case 'after': return d > endOf(condition.value, period);
    case 'between': return d >= startOfDay(condition.value.start) && d <= startOfDay(condition.value.end);
  }
}

/** A unit in the reader's words: "6 Oct 2026", "Oct 2026", "Q3 2026", "2026"; a range as Intl ranges it. */
function unitWords(locale: string | undefined, period: CalendarPeriod) {
  const opts: Intl.DateTimeFormatOptions = period === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' } : period === 'month' ? { month: 'short', year: 'numeric' } : { year: 'numeric' };
  const f = new Intl.DateTimeFormat(locale, opts);
  // Quarters and halves have no Intl name: "Q3", "H1" (English, as the calendar's).
  const tag = (d: Date) => (period === 'quarter' ? `Q${Math.floor(d.getMonth() / 3) + 1} ` : period === 'half' ? `H${Math.floor(d.getMonth() / 6) + 1} ` : '');
  const one = (d: Date) => `${tag(d)}${f.format(d)}`;
  return {
    one,
    range: (a: Date, b: Date) => (tag(a) ? `${one(a)} – ${one(startOf(b, period))}` : f.formatRange(a, startOf(b, period))),
  };
}

type Draft = Date | DateRange | null;
const buttonSize = { regular: 'default', compact: 'compact' } as const;
const BODY = 'mu-date-selector-body grid justify-items-center gap-calendar-selector-gap';
const SAID = 'mu-date-selector-said m-0 justify-self-stretch type-meta text-ink2 text-center';
const FOOT = 'mu-date-selector-foot flex items-center justify-end gap-dialog-actions-gap';
const PLATE = 'mu-date-selector max-w-none!';

/** A date condition (is, before, after, between) chosen over two months and applied. */
export function DateSelector(props: DateSelectorProps) {
  const {
    operators = allOps, label, placeholder = 'Any date', presentation = 'popover', months = 2, size = 'regular', name, disabled, className,
    period = 'day', min, max, isDateUnavailable, marks, locale, weekStartsOn,
  } = props;
  const [own, setOwn] = React.useState<DateCondition | null>(props.defaultValue ?? null);
  const value = props.value !== undefined ? props.value : own;
  const [open, setOpen] = React.useState(false);
  const [op, setOp] = React.useState<DateOperator>(value?.op ?? operators[0]);
  const [draft, setDraft] = React.useState<Draft>(value ? value.value : null);
  const words = React.useMemo(() => unitWords(locale, period), [locale, period]);
  const keyRef = React.useRef<HTMLButtonElement>(null);
  const wasOpen = React.useRef(false);
  // The dialog has no trigger of its own to hand focus back to: closing returns it to the key.
  React.useEffect(() => {
    if (presentation === 'dialog' && wasOpen.current && !open) keyRef.current?.focus();
    wasOpen.current = open;
  }, [open, presentation]);

  const say = (c: DateCondition | null) => {
    if (!c) return '';
    const v = c.op === 'between' ? words.range(c.value.start, c.value.end) : words.one(c.value);
    const s = `${opWords[c.op]} ${v}`;
    return label ? `${label} ${s}` : s[0].toUpperCase() + s.slice(1);
  };
  const condition: DateCondition | null = op === 'between'
    ? draft && !(draft instanceof Date) && draft.end ? { op, value: { start: draft.start, end: draft.end } } : null
    : draft instanceof Date ? { op, value: draft } : null;
  const ready = !!condition && keyOf(condition) !== keyOf(value);

  const openWith = (o: boolean) => {
    // Opening starts the draft from the value; closing any way but Apply throws it away.
    if (o) { setOp(value?.op ?? operators[0]); setDraft(value ? value.value : null); }
    setOpen(o);
  };
  const commit = (c: DateCondition | null) => {
    if (props.value === undefined) setOwn(c);
    props.onValueChange?.(c);
    setOpen(false);
  };
  const changeOp = (next: DateOperator) => {
    // The day carries across: one day becomes a range of it; a range gives its start.
    if (next === 'between' && draft instanceof Date) setDraft({ start: draft, end: endOf(draft, period) });
    else if (next !== 'between' && draft && !(draft instanceof Date)) setDraft(draft.start);
    setOp(next);
  };

  const pending = op === 'between' ? (draft && !(draft instanceof Date) ? 'Choose the last day' : 'Choose the first day') : 'Choose a day';
  const calendar = { period, min, max, isDateUnavailable, marks, locale, weekStartsOn, months, autoFocus: true, 'aria-label': label ? `${label} ${opWords[op]}` : `Date ${opWords[op]}` };
  const body = (
    <div className={presentation === 'popover' ? `${BODY} calendar-selector-popover` : BODY}>
      {operators.length > 1 && (
        <Switcher aria-label="Operator" value={op} onValueChange={changeOp} options={operators.map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))} />
      )}
      {op === 'between'
        ? <Calendar {...calendar} mode="range" value={draft instanceof Date ? null : draft} onValueChange={setDraft} />
        : <Calendar {...calendar} value={draft instanceof Date ? draft : null} onValueChange={setDraft} />}
      <p className={SAID} aria-live="polite">{condition ? say(condition) : pending}</p>
    </div>
  );
  const keys = (
    <>
      {value && <Button size="compact" onClick={() => commit(null)}>Clear</Button>}
      <Button size="compact" onClick={() => setOpen(false)}>Cancel</Button>
      <Button size="compact" cap="primary" disabled={!ready} onClick={() => commit(condition)}>Apply</Button>
    </>
  );
  const key = (
    <Button ref={keyRef} size={buttonSize[size]} icon={<CalendarIcon />} disabled={disabled} aria-label={props['aria-label']} className={className} onClick={presentation === 'dialog' ? () => openWith(true) : undefined}>
      {say(value) || (label ? `${label}: ${placeholder.toLowerCase()}` : placeholder)}
    </Button>
  );
  const hidden = name && <input type="hidden" name={name} value={keyOf(value)} disabled={disabled} />;

  if (presentation === 'dialog') {
    return (
      <>
        {key}
        {hidden}
        <Dialog open={open} onOpenChange={openWith}>
          <Dialog.Popup aria-label={label ?? 'Date'} className="calendar-selector-dialog">
            <Dialog.Title>{label ?? 'Date'}</Dialog.Title>
            {body}
            <Dialog.Actions>{keys}</Dialog.Actions>
          </Dialog.Popup>
        </Dialog>
      </>
    );
  }
  return (
    <>
      <Popover open={open} onOpenChange={openWith}>
        <Popover.Trigger>{key}</Popover.Trigger>
        <Popover.Content align="start" className={PLATE} aria-label={label ?? 'Date'}>
          <div className="grid gap-calendar-selector-gap">
            {body}
            <div className={FOOT}>{keys}</div>
          </div>
        </Popover.Content>
      </Popover>
      {hidden}
    </>
  );
}
