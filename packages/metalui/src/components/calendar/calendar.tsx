'use client';

import * as React from 'react';
import { SwapText } from '../../motion/swap';
import { buttonClasses } from '../button/button';
import { Icon } from '../../icons/Icon';

/* ─────────────────────────────────────────────────────────
 * CALENDAR, a month to choose a day from (or a range, several days, a month, quarter, half, year)
 *
 *   grid      weekday initials, then six rows of days (always six: the height never jumps)
 *   hover     a day sinks a touch into the switcher's track look (only what is chosen stands raised)
 *   today     a small green lamp under its number; a marked day a small dot beside it (ink2, or the
 *             amber / red LED for urgent / failed), said with the day
 *   choose    the chosen day takes the switcher's raised thumb look and lands into it on the part
 *             spring (a day is not a track: the choice lands where it is, never glides across weeks)
 *   range     the first press lands a thumb; until the second, the stretch it would make shows as the
 *             sunken track from it to the day under the pointer (or the keys). The second press
 *             stretches one raised thumb across each week of the range, round at its true ends,
 *             nearly square where it runs on to the next week; it settles in on the part spring.
 *             minDays / maxDays put the days out of reach at 40 % while the second end is chosen
 *   several   mode="multiple": each chosen day its own thumb; pressing one again lets it go
 *   month     the title turns on the drum (up for later, down for earlier); the grid comes in two
 *             grid steps from the side you are heading to as it fades in, on the settle spring
 *   jump      the title is a key: it opens the months of its year, and that title the years (a level
 *             up comes in from a touch larger, a level down from a touch smaller, in the same
 *             footprint). Choosing one goes back down to it; Esc goes back without moving
 *   periods   period="month" | "quarter" | "half" | "year": the same grid of larger units, chosen,
 *             ranged and marked the same way
 *   months    months={2}: pages side by side, the step keys on the outer ends; days of the next or
 *             last month are left out, so each day shows once
 *   keys      arrows by unit and row, Page Up / Down by page (Shift: a year), Home / End to the row's
 *             ends, Enter or Space chooses; moving past the page turns it
 *   limits    units outside the page in ink3; out of range disabled at 40 %, and the steps stop
 *   quiet     an unavailable day (isDateUnavailable) in ink3, still focusable and choosable,
 *             described as "Unavailable"; out of range is the one that can't be chosen
 * Reduce Motion: the grid arrives, the choice and the range land at once; the fades stay.
 * ───────────────────────────────────────────────────────── */

export type CalendarPeriod = 'day' | 'month' | 'quarter' | 'half' | 'year';
/** A range of days, both ends included. `end` is null while the second end is being chosen. With a period
 *  other than day, `start` is the first day of the first unit and `end` the last day of the last one. */
export interface DateRange { start: Date; end: Date | null }
/** Something on a day (an event, a deadline): a dot beside the number, and its words said with the day.
 *  `tone` uses the LED's meaning: amber waiting or urgent, red failed; without it the dot is ink. */
export interface DayMark { label: string; tone?: 'amber' | 'red' }
type CalendarValue = Date | DateRange | Date[] | null;

/* ── dates ─────────────────────────────────────────────── */

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** n months on, keeping the day of the month where it can (31 Jan + 1 → 28 Feb). */
export const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
type LargeUnit = Exclude<CalendarPeriod, 'day'>;
const MONTHS: Record<LargeUnit, number> = { month: 1, quarter: 3, half: 6, year: 12 };
const COLS: Record<CalendarPeriod, number> = { day: 7, month: 3, quarter: 2, half: 2, year: 3 };
// The level a title opens: days → months → years; months, quarters and halves → years.
const levelUp: Partial<Record<CalendarPeriod, CalendarPeriod>> = { day: 'month', month: 'year', quarter: 'year', half: 'year' };

/** The first day of the unit (day, month, quarter, half year, year) a date falls in. */
export function startOf(d: Date, unit: CalendarPeriod) {
  if (unit === 'day') return startOfDay(d);
  const m = MONTHS[unit];
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / m) * m, 1);
}
/** The last day of the unit a date falls in. */
export function endOf(d: Date, unit: CalendarPeriod) {
  if (unit === 'day') return startOfDay(d);
  const s = startOf(d, unit);
  return new Date(s.getFullYear(), s.getMonth() + MONTHS[unit], 0);
}
const sameUnit = (a: Date | null | undefined, b: Date | null | undefined, unit: CalendarPeriod) => !!a && !!b && startOf(a, unit).getTime() === startOf(b, unit).getTime();
/** Moves a date by n units, keeping the day where it can. */
const shift = (d: Date, unit: CalendarPeriod, n: number) => (unit === 'day' ? addDays(d, n) : addMonths(d, n * MONTHS[unit]));
/** Whole units from a to b (b after a is positive). */
function unitsBetween(a: Date, b: Date, unit: CalendarPeriod) {
  if (unit === 'day') return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  const at = (d: Date) => { const u = startOf(d, unit); return u.getFullYear() * 12 + u.getMonth(); };
  return (at(b) - at(a)) / MONTHS[unit];
}

/* A page is what one grid shows: a month of days, a year of months, quarters or halves, or ten years. */
function pageOf(d: Date, unit: CalendarPeriod) {
  if (unit === 'day') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (unit === 'year') return new Date(Math.floor(d.getFullYear() / 10) * 10, 0, 1);
  return new Date(d.getFullYear(), 0, 1);
}
function addPage(page: Date, unit: CalendarPeriod, n: number) {
  if (unit === 'day') return new Date(page.getFullYear(), page.getMonth() + n, 1);
  return new Date(page.getFullYear() + n * (unit === 'year' ? 10 : 1), 0, 1);
}
/** The units a page shows, in reading order: 42 days (from the week's first day), 12 months, 4 quarters,
 *  2 halves, or 12 years (the decade with one year either side, in ink3 like the days of other months). */
function cellsOf(page: Date, unit: CalendarPeriod, weekStart: number) {
  const y = page.getFullYear();
  switch (unit) {
    case 'day': {
      const lead = (page.getDay() - weekStart + 7) % 7;
      return Array.from({ length: 42 }, (_, i) => addDays(page, i - lead));
    }
    case 'year': return Array.from({ length: 12 }, (_, i) => new Date(y - 1 + i, 0, 1));
    default: return Array.from({ length: 12 / MONTHS[unit] }, (_, i) => new Date(y, i * MONTHS[unit], 1));
  }
}

/** The first day of the week for a locale, as a JS day (0 Sunday … 6 Saturday). */
export function weekStartOf(locale?: string) {
  try {
    const loc = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const first = loc.getWeekInfo?.().firstDay ?? loc.weekInfo?.firstDay ?? 1;
    return first % 7;
  } catch {
    return 1;
  }
}

/** The ISO week number of the week a day is in. */
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

/** Names and faces of units in a locale. */
function words(locale?: string) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
  const full = f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = f({ month: 'long', year: 'numeric' });
  const long = f({ month: 'long' });
  const short = f({ month: 'short' });
  const year = f({ year: 'numeric' });
  const span = (d: Date, unit: CalendarPeriod) => [d, new Date(d.getFullYear(), d.getMonth() + MONTHS[unit as 'month'] - 1, 1)];
  const tag = (d: Date, unit: CalendarPeriod) => `${unit === 'quarter' ? 'Q' : 'H'}${Math.floor(d.getMonth() / MONTHS[unit as 'month']) + 1}`;
  return {
    /** What assistive tech hears: "Wednesday, 30 September 2026", "Q3 2026, July to September". */
    name(d: Date, unit: CalendarPeriod) {
      if (unit === 'day') return full.format(d);
      if (unit === 'month') return monthYear.format(d);
      if (unit === 'year') return year.format(d);
      const [a, b] = span(d, unit);
      return `${tag(d, unit)} ${year.format(d)}, ${long.format(a)} to ${long.format(b)}`;
    },
    /** What the cell shows: the day's number, "Sep", "Q3" over "Jul – Sep", "2026". */
    face(d: Date, unit: CalendarPeriod): { main: string; sub?: string } {
      if (unit === 'day') return { main: String(d.getDate()) };
      if (unit === 'month') return { main: short.format(d) };
      if (unit === 'year') return { main: year.format(d) };
      const [a, b] = span(d, unit);
      return { main: tag(d, unit), sub: `${short.format(a)} – ${short.format(b)}` };
    },
    title(page: Date, unit: CalendarPeriod) {
      if (unit === 'day') return monthYear.format(page);
      if (unit === 'year') return `${year.format(page)} – ${year.format(new Date(page.getFullYear() + 9, 0, 1))}`;
      return year.format(page);
    },
  };
}

/* ── looks ─────────────────────────────────────────────── */

const ROOT = 'mu-calendar inline-grid gap-calendar-head-gap p-calendar-pad select-none';
const PAGES = 'mu-calendar-pages flex items-start gap-calendar-page-gap';
const PAGE = 'mu-calendar-page grid gap-calendar-head-gap';
const HEAD = 'mu-calendar-head flex items-center justify-between gap-calendar-head-gap h-calendar-head-height';
const TITLE = 'mu-calendar-title type-title text-ink';
const TITLE_KEY = 'mu-calendar-title-key inline-flex items-center gap-calendar-unit-sub-gap h-calendar-head-height px-calendar-head-gap rounded-pill border-0 bg-transparent type-title text-ink cursor-pointer outline-none transition-row hover:recipe-switcher focus-visible:focus-ring [&>svg]:size-calendar-step-glyph [&>svg]:text-ink3';
const STEP = `${buttonClasses('standard', 'compact')} mu-calendar-step px-0! w-calendar-head-height flex-none justify-center`;
const STEP_SPACER = 'w-calendar-head-height flex-none';
const TABLE = 'mu-calendar-grid calendar-grid';
const SHEET = 'calendar-sheet';
const WEEKDAY = 'mu-calendar-weekday size-calendar-day-size p-0 type-meta text-ink3 text-center';
const WEEK = 'mu-calendar-week size-calendar-day-size align-middle type-meta tabular-nums text-ink3 text-center font-normal';
const CELL = 'relative p-0';
const STATES = 'relative z-1 border-0 bg-transparent type-ui tabular-nums text-ink cursor-pointer outline-none transition-row hover:not-data-selected:not-data-in-range:recipe-switcher data-selected:recipe-switcher-thumb data-selected:text-ink data-selected:calendar-land focus-visible:focus-ring data-outside:text-ink3 data-unavailable:not-data-selected:text-ink3 disabled:opacity-calendar-disabled disabled:cursor-default data-today:calendar-today';
const DAY = `mu-calendar-day grid place-items-center size-calendar-day-size rounded-calendar-day-radius ${STATES}`;
const UNIT = `mu-calendar-unit flex flex-col items-center justify-center gap-calendar-unit-sub-gap w-full h-full rounded-calendar-day-radius ${STATES}`;
const SUB = 'type-meta text-ink3';
const BAND = { chosen: 'mu-calendar-band calendar-band recipe-switcher-thumb calendar-band-land', preview: 'mu-calendar-band calendar-band recipe-switcher' };
const MARK = 'mu-calendar-mark calendar-mark';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/* ── props ─────────────────────────────────────────────── */

interface CalendarShared {
  /** day (the default), or a larger unit to choose: month, quarter, half (year), year. */
  period?: CalendarPeriod;
  /** The month shown first, uncontrolled (the value's, or today's). */
  defaultMonth?: Date;
  /** The month shown first, controlled (with periods: any day of the year or decade shown). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  /** The earliest and latest days that can be chosen: days beyond are disabled and the steps stop. */
  min?: Date;
  max?: Date;
  /** Days with nothing to offer (weekends, booked days): quiet, and described as unavailable. They can still be
   * chosen, so the host can say why (and what's next); to forbid a day, keep it out of `min` / `max`. */
  isDateUnavailable?: (date: Date) => boolean;
  /** Something on a unit (events, a deadline): a dot beside the number, said with it. */
  marks?: (date: Date) => DayMark | null | undefined | false;
  /** A locale for names and the first day of the week (the browser's by default). */
  locale?: string;
  /** The week's first day (0 Sunday … 6 Saturday), over the locale's. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** ISO week numbers before each week. */
  weekNumbers?: boolean;
  /** Pages side by side (two months for a range). Default 1. */
  months?: number;
  /** Put focus on the chosen day (or today) when it mounts: for a calendar opened in a picker. */
  autoFocus?: boolean;
  'aria-label'?: string;
  className?: string;
}

export interface CalendarSingleProps extends CalendarShared {
  mode?: 'single';
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date) => void;
}
export interface CalendarRangeProps extends CalendarShared {
  mode: 'range';
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  /** Hears the first end ({ start, end: null }) and then the whole range. */
  onValueChange?: (value: DateRange) => void;
  /** The shortest and longest range, counted in the period's units, both ends included. */
  minDays?: number;
  maxDays?: number;
}
export interface CalendarMultipleProps extends CalendarShared {
  mode: 'multiple';
  value?: Date[];
  defaultValue?: Date[];
  onValueChange?: (value: Date[]) => void;
}
export type CalendarProps = CalendarSingleProps | CalendarRangeProps | CalendarMultipleProps;

/** A month to choose a day from: or a range, several days, or a month, quarter, half year or year. */
export function Calendar(props: CalendarProps) {
  const { mode = 'single', period = 'day', defaultMonth, month: monthProp, onMonthChange, min, max, isDateUnavailable, marks, locale, weekStartsOn, weekNumbers, months = 1, autoFocus, className } = props;
  const minDays = props.mode === 'range' ? props.minDays : undefined;
  const maxDays = props.mode === 'range' ? props.maxDays : undefined;
  const [own, setOwn] = React.useState<CalendarValue>(props.defaultValue ?? null);
  const value: CalendarValue = props.value !== undefined ? props.value : own;
  const single = mode === 'single' ? (value as Date | null) : null;
  const range = mode === 'range' ? (value as DateRange | null) : null;
  const several = mode === 'multiple' ? ((value as Date[] | null) ?? []) : [];
  const anchor = single ?? range?.end ?? range?.start ?? several[0] ?? null;

  const today = startOfDay(new Date());
  const lo = min ? startOfDay(min) : null;
  const hi = max ? startOfDay(max) : null;
  const clamp = (d: Date) => (lo && d < lo ? lo : hi && d > hi ? hi : d);
  const [focused, setFocused] = React.useState<Date>(() => clamp(startOfDay(anchor ?? defaultMonth ?? monthProp ?? today)));
  const [ownPage, setOwnPage] = React.useState<Date>(() => monthProp ?? anchor ?? defaultMonth ?? today);
  const [view, setView] = React.useState<CalendarPeriod>(period);
  const [dir, setDir] = React.useState<'later' | 'earlier' | 'up' | 'down' | null>(null);
  const [hover, setHover] = React.useState<Date | null>(null);
  // Where the person was when they opened a level up: it stands raised there.
  const [here, setHere] = React.useState<Date>(today);
  const moved = React.useRef(autoFocus ?? false);
  const body = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const quietId = React.useId();
  const markId = React.useId();

  const first = weekStartsOn ?? weekStartOf(locale);
  const w = React.useMemo(() => words(locale), [locale]);
  const nav = view !== period;
  const pages = nav ? 1 : Math.max(1, months);
  const page = pageOf(monthProp ?? ownPage, view);
  const shown = Array.from({ length: pages }, (_, i) => addPage(page, view, i));
  const last = shown[pages - 1];
  const visible = (d: Date) => shown.some((p) => p.getTime() === pageOf(d, view).getTime());
  const out = (d: Date, unit = view) => (lo != null && endOf(d, unit) < lo) || (hi != null && startOf(d, unit) > hi);

  // A period that changes takes the calendar back to its own level.
  React.useEffect(() => setView(period), [period]);

  const setPage = (next: Date) => {
    if (monthProp === undefined) setOwnPage(next);
    if (next.getTime() !== page.getTime()) onMonthChange?.(next);
  };

  const go = (next: Date, byKey: boolean, unit = view) => {
    const d = clamp(next);
    moved.current = byKey;
    setFocused(d);
    const p = pageOf(d, unit);
    if (p < page) { setDir('earlier'); setPage(p); }
    else if (p > last) { setDir('later'); setPage(addPage(p, unit, -(pages - 1))); }
  };
  const turn = (n: number) => {
    setDir(n > 0 ? 'later' : 'earlier');
    setPage(addPage(page, view, n));
    setFocused(clamp(view === 'day' ? addMonths(focused, n) : addMonths(focused, n * 12 * (view === 'year' ? 10 : 1))));
  };

  /* Range: while the second end is chosen, units too near or too far from the first are out of reach. */
  const pending = !nav && mode === 'range' && !!range && !range.end;
  const reach = (d: Date) => {
    if (!pending || !range) return true;
    const len = Math.abs(unitsBetween(range.start, d, view)) + 1;
    return !(minDays != null && len < minDays) && !(maxDays != null && len > maxDays);
  };

  const emit = (next: CalendarValue) => {
    if (props.value === undefined) setOwn(next);
    (props.onValueChange as ((v: CalendarValue) => void) | undefined)?.(next);
  };
  const pick = (d: Date) => {
    if (out(d)) return;
    const s = startOf(d, view);
    if (mode === 'single') emit(s);
    else if (mode === 'multiple') emit(several.some((x) => sameUnit(x, s, view)) ? several.filter((x) => !sameUnit(x, s, view)) : [...several, s].sort((a, b) => a.getTime() - b.getTime()));
    else if (!range || range.end) emit({ start: s, end: null });
    else {
      if (!reach(d)) return;
      const [a, b] = range.start <= s ? [range.start, s] : [s, range.start];
      emit({ start: startOf(a, view), end: endOf(b, view) });
      setHover(null);
    }
    // A unit of the next or last page turns to it; focus follows it, since the pressed button leaves.
    if (!visible(d)) go(d, true); else setFocused(d);
  };

  /** One level up: the title's key. */
  const ascend = (from: Date) => {
    const up = levelUp[view];
    if (!up) return;
    setHere(from);
    setDir('up');
    setView(up);
    moved.current = true;
    if (!sameUnit(from, focused, view)) setFocused(clamp(view === 'day' ? from : startOf(from, view)));
    setPage(from);
  };
  /** One level down, onto the unit chosen (or back where it was, with Esc). */
  const descend = (d: Date | null) => {
    const down: CalendarPeriod = view === 'year' && period === 'day' ? 'month' : period;
    let next = focused;
    if (d) next = view === 'year' ? addMonths(focused, (d.getFullYear() - focused.getFullYear()) * 12) : addMonths(focused, unitsBetween(focused, d, 'month'));
    next = clamp(next);
    setDir('down');
    setView(down);
    moved.current = true;
    setFocused(next);
    setPage(d ? next : here);
  };

  // A value set from outside (a typed date, a preset) opens its page.
  const anchorTime = anchor ? startOfDay(anchor).getTime() : null;
  React.useEffect(() => {
    if (anchorTime == null) return;
    const d = new Date(anchorTime);
    if (!visible(d)) go(d, false);
    // Only a new value moves the page; browsing away from the value must stay where it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorTime]);

  // Keyboard moves (and level changes) carry focus with them.
  React.useEffect(() => {
    if (!moved.current) return;
    body.current?.querySelector<HTMLButtonElement>('table button[tabindex="0"]')?.focus();
    moved.current = false;
  }, [focused, view, page.getTime()]);

  const onKey = (e: React.KeyboardEvent) => {
    const cols = COLS[view];
    const cells = cellsOf(pageOf(focused, view), view, first);
    const at = cells.findIndex((c) => sameUnit(c, focused, view));
    const row = at - (at % cols);
    const keep = (c: Date) => (view === 'day' ? c : addMonths(focused, unitsBetween(focused, c, 'month')));
    const pageStep = (n: number) => (view === 'day' ? addMonths(focused, n * (e.shiftKey ? 12 : 1)) : addMonths(focused, n * 12 * (view === 'year' ? 10 : 1)));
    const map: Record<string, () => Date> = {
      ArrowLeft: () => shift(focused, view, -1),
      ArrowRight: () => shift(focused, view, 1),
      ArrowUp: () => shift(focused, view, -cols),
      ArrowDown: () => shift(focused, view, cols),
      PageUp: () => pageStep(-1),
      PageDown: () => pageStep(1),
      Home: () => keep(cells[row]),
      End: () => keep(cells[row + cols - 1]),
    };
    if (map[e.key]) {
      e.preventDefault();
      const next = map[e.key]();
      go(next, true);
      if (pending) setHover(startOf(clamp(next), view));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (nav) descend(focused); else pick(focused);
    } else if (e.key === 'Escape' && nav) {
      // Back down without moving; the popover around it stays open.
      e.preventDefault();
      e.stopPropagation();
      descend(null);
    }
  };

  /* The roving tab stop: the focused unit, or the first that can be chosen on the first page. */
  const tabStop = visible(focused) && !out(focused) ? startOf(focused, view) : cellsOf(page, view, first).find((c) => pageOf(c, view).getTime() === page.getTime() && !out(c)) ?? page;

  /* The band: a chosen range, or the stretch a pending one would make to the unit under the pointer. */
  const band: { from: Date; to: Date; kind: 'chosen' | 'preview' } | null = nav || !range
    ? null
    : range.end
      ? { from: startOf(range.start, view), to: startOf(range.end, view), kind: 'chosen' }
      : hover && !sameUnit(hover, range.start, view) && reach(hover)
        ? { from: startOf(range.start < hover ? range.start : hover, view), to: startOf(range.start < hover ? hover : range.start, view), kind: 'preview' }
        : null;
  const inBand = (d: Date) => !!band && startOf(d, view) >= band.from && startOf(d, view) <= band.to;

  const arrive = dir === 'later' ? 'calendar-arrive-later' : dir === 'earlier' ? 'calendar-arrive-earlier' : dir === 'up' ? 'calendar-zoom-out' : dir === 'down' ? 'calendar-zoom-in' : '';
  const stepWord = view === 'day' ? 'month' : view === 'year' ? 'years' : 'year';
  const prevLabel = view === 'year' ? 'Earlier years' : `Previous ${stepWord}`;
  const nextLabel = view === 'year' ? 'Later years' : `Next ${stepWord}`;
  const look = view === 'day' ? DAY : UNIT;
  const upWord = levelUp[view] === 'month' ? 'a month' : 'a year';
  const prev = (
    <button type="button" className={STEP} aria-label={prevLabel} onClick={() => turn(-1)} disabled={lo != null && page <= pageOf(lo, view)}>
      <Icon name="chevron" turn={90} />
    </button>
  );
  const next = (
    <button type="button" className={STEP} aria-label={nextLabel} onClick={() => turn(1)} disabled={hi != null && last >= pageOf(hi, view)}>
      <Icon name="chevron" turn={270} />
    </button>
  );

  const renderCell = (d: Date, pg: Date, i: number, cells: Date[]) => {
    const outside = pageOf(d, view).getTime() !== pg.getTime();
    // Side by side, a day of the next or last month is left out: it shows on its own page.
    if (outside && pages > 1) return <td key={i} className={CELL} />;
    const s = startOf(d, view);
    const selected = nav
      ? sameUnit(d, here, view)
      : mode === 'single' ? sameUnit(d, single, view) : mode === 'multiple' ? several.some((x) => sameUnit(x, d, view)) : !!range && !range.end && sameUnit(d, range.start, view);
    const ranged = inBand(d);
    const quiet = !nav && view === 'day' && !out(d) && !!isDateUnavailable?.(d);
    const mark = !nav ? marks?.(s) || null : null;
    const isToday = sameUnit(d, today, view);
    const anchorDay = pending && range ? sameUnit(d, range.start, view) : false;
    const disabled = out(d) || (!reach(d) && !anchorDay);
    const face = w.face(d, view);
    // The band is drawn once per run of the week, in the run's first cell, under the days.
    const runStart = ranged && band && (i % COLS[view] === 0 || !inBand(shift(d, view, -1)) || (pages > 1 && pageOf(shift(d, view, -1), view).getTime() !== pg.getTime()));
    let run = 0;
    if (runStart) {
      const cols = COLS[view];
      for (let k = i; k < i - (i % cols) + cols; k++) {
        const c = cells[k];
        if (!inBand(c) || (pages > 1 && pageOf(c, view).getTime() !== pg.getTime())) break;
        run++;
      }
    }
    const runEnd = runStart ? shift(d, view, run - 1) : null;
    const described = cx(quiet && quietId, !!mark && `${markId}-${s.getTime()}`) || undefined;
    return (
      <td key={i} role="gridcell" aria-selected={selected || (ranged && band?.kind === 'chosen')} className={CELL}>
        {runStart && band && (
          <span
            aria-hidden
            key={`${band.kind}-${band.from.getTime()}-${band.to.getTime()}`}
            className={BAND[band.kind]}
            data-open-start={sameUnit(d, band.from, view) ? undefined : ''}
            data-open-end={runEnd && sameUnit(runEnd, band.to, view) ? undefined : ''}
            style={{ '--mu-calendar-run': run } as React.CSSProperties}
          />
        )}
        <button
          type="button"
          tabIndex={sameUnit(d, tabStop, view) && !outside ? 0 : -1}
          className={look}
          aria-label={w.name(d, view)}
          aria-current={isToday ? 'date' : undefined}
          aria-describedby={described}
          data-today={isToday ? '' : undefined}
          data-selected={selected ? '' : undefined}
          data-in-range={ranged ? '' : undefined}
          data-outside={outside ? '' : undefined}
          data-unavailable={quiet ? '' : undefined}
          data-marked={mark ? '' : undefined}
          disabled={disabled}
          onClick={() => (nav ? descend(d) : pick(d))}
          onMouseEnter={pending ? () => setHover(s) : undefined}
          // Only units of the shown page take the roving focus: focusing one of the next or last page would
          // turn the page and remove the button before its click lands.
          onFocus={() => {
            if (!outside && !sameUnit(d, focused, view)) setFocused(view === 'day' ? d : addMonths(focused, unitsBetween(focused, d, 'month')));
            if (pending) setHover(s);
          }}
        >
          {face.main}
          {face.sub && <span className={SUB}>{face.sub}</span>}
          {mark && <span id={`${markId}-${s.getTime()}`} className={MARK} data-tone={mark.tone}><span className="sr-only">{mark.label}</span></span>}
        </button>
      </td>
    );
  };

  const renderPage = (pg: Date, p: number) => {
    const cells = cellsOf(pg, view, first);
    const cols = COLS[view];
    const rows = cells.length / cols;
    const id = `${titleId}-${p}`;
    const title = w.title(pg, view);
    const up = levelUp[view];
    const sheet = view !== 'day';
    const vars = sheet ? ({ '--mu-calendar-cols': weekNumbers && period === 'day' ? 8 : 7, '--mu-calendar-pages': nav ? Math.max(1, months) : 1, '--mu-calendar-rows': rows } as React.CSSProperties) : undefined;
    return (
      <div key={p} className={PAGE}>
        <div className={HEAD}>
          {p === 0 ? prev : <span className={STEP_SPACER} />}
          {up ? (
            <button type="button" className={TITLE_KEY} aria-label={`${title}, choose ${upWord}`} onClick={() => ascend(pg)}>
              <span id={id} aria-live="polite" className={dir === 'earlier' ? 'swap-down' : undefined}><SwapText value={title} /></span>
              <Icon name="chevron" />
            </button>
          ) : (
            <span id={id} aria-live="polite" className={dir === 'earlier' ? `${TITLE} swap-down` : TITLE}><SwapText value={title} /></span>
          )}
          {p === pages - 1 ? next : <span className={STEP_SPACER} />}
        </div>
        <table
          key={`${view}-${pg.getTime()}`}
          role="grid"
          aria-labelledby={id}
          aria-multiselectable={mode !== 'single' && !nav ? true : undefined}
          className={cx(TABLE, sheet && SHEET, arrive)}
          style={vars}
          onKeyDown={onKey}
          onMouseLeave={pending ? () => setHover(null) : undefined}
        >
          {view === 'day' && (
            <thead>
              <tr>
                {weekNumbers && <th scope="col" className={WEEKDAY}><span className="sr-only">Week</span></th>}
                {cells.slice(0, 7).map((d, i) => <th key={i} scope="col" abbr={new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d)} className={WEEKDAY}>{new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d)}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {view === 'day' && weekNumbers && <th scope="row" className={WEEK} aria-label={`Week ${isoWeek(cells[r * 7 + 3])}`}>{isoWeek(cells[r * 7 + 3])}</th>}
                {cells.slice(r * cols, r * cols + cols).map((d, k) => renderCell(d, pg, r * cols + k, cells))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={cx(ROOT, className)} aria-label={props['aria-label']} role="group">
      <div ref={body} className={PAGES}>{shown.map(renderPage)}</div>
      {isDateUnavailable && <span id={quietId} hidden>Unavailable</span>}
    </div>
  );
}
