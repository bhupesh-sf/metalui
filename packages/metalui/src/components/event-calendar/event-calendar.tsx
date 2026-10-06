'use client';

import * as React from 'react';
import { SwapText } from '../../motion/swap';
import { useRowMotion } from '../../motion/rows';
import { haptic } from '../../motion/haptic';
import { refuse } from '../../motion/refuse';
import { useAwake } from '../../motion/awake';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { Button, buttonClasses } from '../button/button';
import { Switcher } from '../switcher/switcher';
import { Popover } from '../popover/popover';
import { addMonths, sameDay, startOfDay, weekStartOf } from '../calendar/calendar';
import { ChevronIcon } from '../../icons/components.generated';

/* ─────────────────────────────────────────────────────────
 * EVENT CALENDAR, the person's time: their events on a month or on days by hours (a place)
 *
 *   head      ‹ › step a month, a week or a day; Today; the title turns on the drum; the view Switcher
 *   month     six weeks of days; each day's events as one-line chips under its date, events over
 *             several days (and all-day ones) as bars across the days, round at their true ends and
 *             nearly square where they run on; past maxEvents rows, "+N more" opens that day
 *   days      week, day or N days: day heads (today with the green lamp), the all-day lane of bars,
 *             then hours from dayStart to dayEnd in a grid that scrolls on its own; timed events stand
 *             at their time and length, events that overlap share the day side by side
 *   now       a green hairline across today at this minute (now is live); it moves once a minute,
 *             only while the calendar is seen (useAwake); on mount the grid scrolls to it
 *   move      press an event and move: it lifts (Sortable's lift) and steps by the snap, to another
 *             hour or day, a detent each step; the others re-share their day and glide; release lands
 *             it. Bars and month chips move by whole days. Escape puts it back
 *   resize    the grip on a timed event's lower edge moves its end by the snap
 *   keys      an event is a button named with its title, day and time; ↑ ↓ move it by the snap (a
 *             week in the month), ← → by a day (mirrored right to left), Shift ↑ ↓ change its end;
 *             each step is said politely; Enter or leaving keeps it (one commit), Escape puts it back.
 *             Enter on an event you haven't moved opens its details
 *   details   pressing an event opens a Popover from it: title, day and time, renderDetails(event)
 *   save      onEventsChange(next) then onEventsCommit(next, previous) once per move; a promise holds the
 *             calendar busy (nothing lifts); a rejection gives previous back and every event glides home
 *   refuse    a disabled event (or readOnly) shakes once and says why
 * Reduce Motion: no lift scale, no glides, the title crossfades; following the hand stays.
 * A place: events are the person's objects; the drag is its own instrument with Sortable's look.
 * ───────────────────────────────────────────────────────── */

/** One of the person's events. An all-day event's `start` and `end` are its first and last days, both
 *  included (times ignored); a timed event's `end` is the instant it ends. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  /** The person's colour for it (a calendar's colour): data, never a state. Any CSS colour. */
  color?: string;
  /** It can't be moved or resized; it still opens. */
  disabled?: boolean;
}

export type EventCalendarView = 'month' | 'week' | 'day' | 'days';

export interface EventCalendarWords {
  allDay: string;
  today: string;
  previous: (view: EventCalendarView) => string;
  next: (view: EventCalendarView) => string;
  views: Record<EventCalendarView, string>;
  more: (n: number) => string;
  /** Said after a move, by hand or by keys. */
  moved: (title: string, when: string) => string;
  /** Said on Escape. */
  back: (title: string, when: string) => string;
  /** Said when a save was refused. */
  failed: (title: string, when: string) => string;
  cantMove: (title: string) => string;
}

const said: EventCalendarWords = {
  allDay: 'All day',
  today: 'Today',
  previous: (v) => `Previous ${v === 'days' ? 'days' : v}`,
  next: (v) => `Next ${v === 'days' ? 'days' : v}`,
  views: { month: 'Month', week: 'Week', day: 'Day', days: 'Days' },
  more: (n) => `+${n} more`,
  moved: (t, w) => `${t}, ${w}.`,
  back: (t, w) => `Put ${t} back, ${w}.`,
  failed: (t, w) => `Couldn’t save. ${t} is back at ${w}.`,
  cantMove: (t) => `${t} can’t be moved.`,
};

export interface EventRenderState {
  start: Date;
  end: Date;
  /** A one-line chip: a month day, the all-day lane, or a timed event under 45 minutes. */
  compact: boolean;
}

export interface EventCalendarProps<T extends CalendarEvent = CalendarEvent> {
  events: readonly T[];
  /** The events after a move or resize (once, when it lands), and `previous` again on a rollback. */
  onEventsChange?: (next: T[]) => void;
  /** Once per move that changed anything. Return a promise to hold the calendar busy; reject to roll back. */
  onEventsCommit?: (next: T[], previous: T[]) => void | Promise<unknown>;
  view?: EventCalendarView;
  defaultView?: EventCalendarView;
  onViewChange?: (view: EventCalendarView) => void;
  /** The views the Switcher offers, in order. Default month, week, day. */
  views?: EventCalendarView[];
  /** A day in what is shown (the month, the week, the day, the first of N days). */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** How many days `view="days"` shows. Default 3. */
  days?: number;
  /** Show Saturday and Sunday. Default true. */
  weekends?: boolean;
  /** Days off (holidays, closed days): quiet, still taking events. */
  offDays?: (date: Date) => boolean;
  /** The first and last hour drawn (0–24). Default 7 and 21. */
  dayStart?: number;
  dayEnd?: number;
  /** Minutes every move and resize snaps to, by hand or keys. Default 15. */
  snap?: number;
  /** The week's first day (0 Sunday … 6 Saturday), over the locale's. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Names, times and digits (the browser's by default). */
  locale?: string;
  /** Fixes "now" (the now line, Today); a clock by default. */
  now?: Date;
  /** Rows of events a month day shows before "+N more". Default 3. */
  maxEvents?: number;
  /** Nothing moves; events still open. */
  readOnly?: boolean;
  /** What is inside an event's chip (the plate, drag and name stay the calendar's). */
  renderEvent?: (event: T, state: EventRenderState) => React.ReactNode;
  /** What an event's details popover holds under its title and time: the host's editor, actions. */
  renderDetails?: (event: T) => React.ReactNode;
  words?: Partial<EventCalendarWords>;
  'aria-label'?: string;
  className?: string;
}

/* ── dates ─────────────────────────────────────────────── */

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
const dayDiff = (a: Date, b: Date) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const atMinutes = (day: Date, m: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m);
const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
/** The first and last day an event covers. */
function spanOf(e: CalendarEvent): [Date, Date] {
  const a = startOfDay(e.start);
  const b = e.allDay ? startOfDay(e.end) : startOfDay(new Date(e.end.getTime() - 1));
  return [a, b < a ? a : b];
}
/** All-day events and anything that crosses midnight run as bars. */
const isBar = (e: CalendarEvent) => !!e.allDay || !sameDay(...spanOf(e));

/** The days a view shows, and the month a month view is of. */
function daysOf(view: EventCalendarView, date: Date, first: number, n: number, weekends: boolean) {
  const d = startOfDay(date);
  let out: Date[];
  if (view === 'month') {
    const page = new Date(d.getFullYear(), d.getMonth(), 1);
    const lead = (page.getDay() - first + 7) % 7;
    out = Array.from({ length: 42 }, (_, i) => addDays(page, i - lead));
  } else if (view === 'week') {
    const s = addDays(d, -((d.getDay() - first + 7) % 7));
    out = Array.from({ length: 7 }, (_, i) => addDays(s, i));
  } else if (view === 'day') out = [d];
  else out = Array.from({ length: Math.max(1, n) }, (_, i) => addDays(d, i));
  return weekends || view === 'day' ? out : out.filter((x) => !weekend(x));
}

function stepOf(view: EventCalendarView, date: Date, by: number, n: number) {
  if (view === 'month') return addMonths(new Date(date.getFullYear(), date.getMonth(), 1), by);
  return addDays(startOfDay(date), by * (view === 'week' ? 7 : view === 'day' ? 1 : n));
}

/* ── layout ────────────────────────────────────────────── */

/** Side by side for events that overlap: a column each, and how many columns its cluster has. */
function share(list: { id: string; s: number; e: number }[]) {
  const out = new Map<string, { col: number; cols: number }>();
  let cluster: string[] = [];
  let ends: number[] = [];
  let reach = -Infinity;
  const flush = () => { for (const id of cluster) out.get(id)!.cols = ends.length; cluster = []; ends = []; };
  for (const it of [...list].sort((a, b) => a.s - b.s || b.e - a.e)) {
    if (it.s >= reach) { flush(); reach = -Infinity; }
    let c = ends.findIndex((end) => end <= it.s);
    if (c < 0) { c = ends.length; ends.push(it.e); } else ends[c] = it.e;
    out.set(it.id, { col: c, cols: 1 });
    cluster.push(it.id);
    reach = Math.max(reach, it.e);
  }
  flush();
  return out;
}

/** Bars over a run of days: their first and last index (clipped), whether they run on, and a row each. */
function bars<T extends CalendarEvent>(events: readonly T[], days: Date[]) {
  const first = days[0], last = days[days.length - 1];
  const index = (d: Date) => days.findIndex((x) => x >= d);
  const list = events.filter(isBar).flatMap((e) => {
    const [s, f] = spanOf(e);
    if (f < first || s > last) return [];
    const a = s < first ? 0 : index(s);
    let b = f > last ? days.length - 1 : days.findIndex((x) => x > f) - 1;
    if (b < 0) b = days.length - 1;
    if (a < 0 || b < a) return [];
    return [{ event: e, a, b, openStart: s < days[a], openEnd: f > days[b], row: 0 }];
  }).sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  const rows: number[] = [];
  for (const it of list) {
    let r = rows.findIndex((end) => end < it.a);
    if (r < 0) { r = rows.length; rows.push(it.b); } else rows[r] = it.b;
    it.row = r;
  }
  return { list, rows: rows.length };
}

/* ── words ─────────────────────────────────────────────── */

function formats(locale?: string) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
  const time = f({ hour: 'numeric', minute: '2-digit' });
  const hour = f({ hour: 'numeric' });
  const day = f({ weekday: 'long', day: 'numeric', month: 'long' });
  const dayTime = f({ weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const weekday = f({ weekday: 'short' });
  const num = f({ day: 'numeric' });
  const month = f({ month: 'long', year: 'numeric' });
  const span = f({ day: 'numeric', month: 'short', year: 'numeric' });
  const full = f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return {
    time: (d: Date) => time.format(d),
    hour: (h: number) => hour.format(new Date(2000, 0, 1, h)),
    weekday: (d: Date) => weekday.format(d),
    num: (d: Date) => num.format(d),
    full: (d: Date) => full.format(d),
    /** "Tuesday 6 October, 10:00 – 11:00", "Tuesday 6 – Thursday 8 October, all day". */
    when(start: Date, end: Date, allDay: boolean | undefined, allDayWord: string) {
      if (allDay) return `${sameDay(start, end) ? day.format(start) : day.formatRange(startOfDay(start), startOfDay(end))}, ${allDayWord.toLowerCase()}`;
      return dayTime.formatRange(start, end);
    },
    title(view: EventCalendarView, date: Date, days: Date[]) {
      if (view === 'month') return month.format(date);
      if (days.length === 1) return full.format(days[0]);
      return span.formatRange(days[0], days[days.length - 1]);
    },
  };
}

/* ── looks ─────────────────────────────────────────────── */

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const ROOT = 'mu-event-calendar event-calendar';
const HEAD = 'mu-event-calendar-head event-calendar-head';
const TITLE = 'mu-event-calendar-title type-title text-ink truncate';
const STEP = `${buttonClasses('standard', 'compact')} mu-event-calendar-step px-0! w-event-calendar-head-height flex-none justify-center`;
const TRAY = 'mu-event-calendar-tray event-calendar-tray recipe-well-field';
const ROW = 'mu-event-calendar-row event-calendar-row';
const GUTTER = 'event-calendar-gutter type-meta text-ink3';
const DAY_HEAD = 'mu-event-calendar-day-head event-calendar-day-head';
const LANE = 'mu-event-calendar-lane event-calendar-lane';
const CELLS = 'event-calendar-cells';
const SCROLL = 'mu-event-calendar-scroll event-calendar-scroll';
const HOURS = 'mu-event-calendar-hours event-calendar-hours';
const HOUR = 'event-calendar-hour type-meta tabular-nums text-ink3';
const COLUMN = 'mu-event-calendar-column event-calendar-column';
const LAYER = 'mu-event-calendar-events event-calendar-events';
const EVENT = 'mu-event-calendar-event event-calendar-event';
const LINE = 'event-calendar-line';
const TIMED = 'event-calendar-timed';
const GRIP = 'mu-event-calendar-grip event-calendar-grip';
const NOW = 'mu-event-calendar-now event-calendar-now';
const WEEKDAYS = 'event-calendar-weekdays type-meta text-ink3';
const WEEK = 'mu-event-calendar-week event-calendar-week';
const DATE = 'mu-event-calendar-date event-calendar-date type-ui tabular-nums';
const MORE = 'mu-event-calendar-more event-calendar-more type-meta text-ink2';
const TODAY = 'event-calendar-today';
const SWATCH = 'event-calendar-swatch';
const META = 'type-meta tabular-nums text-ink2';
const NAME = 'type-ui text-ink';

/* A strip of days the hand can be over: the timed layer, the all-day lane, a month week. Its rows glide. */
type Strips = Map<HTMLElement, { kind: 'time' | 'day'; days: Date[] }>;
interface StripProps extends React.HTMLAttributes<HTMLDivElement> {
  order: string;
  kind: 'time' | 'day';
  days: Date[];
  strips: Strips;
}
function Strip({ order, kind, days, strips, ...rest }: StripProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useRowMotion(ref, order);
  const set = (el: HTMLDivElement | null) => {
    if (ref.current && ref.current !== el) strips.delete(ref.current);
    ref.current = el;
    if (el) strips.set(el, { kind, days });
  };
  return <div ref={set} data-ec-strip={kind} {...rest} />;
}

/* ── the calendar ──────────────────────────────────────── */

interface Draft { id: string; start: Date; end: Date }
interface Drag { id: string; kind: 'time' | 'day'; mode: 'move' | 'resize'; x0: number; y0: number; started: boolean; grabMin: number; grabDay: Date; key: string; el: HTMLElement; scroll: HTMLElement | null }

/** The person's events on a month, a week, a day or a few days; moved and resized by hand or keys. */
export function EventCalendar<T extends CalendarEvent = CalendarEvent>(props: EventCalendarProps<T>) {
  const {
    events, onEventsChange, onEventsCommit, view: viewProp, defaultView = 'week', onViewChange, views = ['month', 'week', 'day'],
    date: dateProp, defaultDate, onDateChange, days: n = 3, weekends = true, offDays, dayStart = 7, dayEnd = 21, snap = 15,
    weekStartsOn, locale, now: nowProp, maxEvents = 3, readOnly, renderEvent, renderDetails, className,
  } = props;
  const words = React.useMemo(() => ({ ...said, ...props.words }), [props.words]);
  const f = React.useMemo(() => formats(locale), [locale]);
  const [ownView, setOwnView] = React.useState(defaultView);
  const view = viewProp ?? ownView;
  const [ownDate, setOwnDate] = React.useState(() => defaultDate ?? nowProp ?? new Date());
  const date = dateProp ?? ownDate;
  const first = weekStartsOn ?? weekStartOf(locale);
  const shown = React.useMemo(() => daysOf(view, date, first, n, weekends), [view, date, first, n, weekends]);
  const timeGrid = view !== 'month';
  const hours = Math.max(1, dayEnd - dayStart);

  // The clock: once a minute, only while seen.
  const [awakeRef, awake] = useAwake();
  const [clock, setClock] = React.useState(() => new Date());
  React.useEffect(() => {
    if (nowProp || !awake) return;
    let t = 0;
    const tick = () => { setClock(new Date()); t = window.setTimeout(tick, 60000 - (Date.now() % 60000)); };
    tick();
    return () => window.clearTimeout(t);
  }, [awake, nowProp]);
  const now = nowProp ?? clock;

  const [draft, setDraftState] = React.useState<Draft | null>(null);
  const draftRef = React.useRef<Draft | null>(null);
  const setDraft = (d: Draft | null) => { draftRef.current = d; setDraftState(d); };
  const [held, setHeld] = React.useState<{ id: string; by: 'hand' | 'keys' } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [opened, setOpened] = React.useState<string | null>(null);
  const anchor = React.useRef<HTMLElement | null>(null);
  const announcer = React.useRef<HTMLDivElement>(null);
  const root = React.useRef<HTMLDivElement | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const strips = React.useRef<Strips>(new Map()).current;
  const editing = React.useRef<{ id: string; previous: readonly T[] } | null>(null);
  const drag = React.useRef<Drag | null>(null);
  const clickEaten = React.useRef(false);
  const [rtl, setRtl] = React.useState(false);
  useIsoLayoutEffect(() => { if (root.current) setRtl(getComputedStyle(root.current).direction === 'rtl'); }, []);

  const say = (text: string) => {
    const el = announcer.current;
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = text; });
  };

  const live = { events, shown, dayStart, dayEnd, snap, rtl, busy, readOnly, words, f, onEventsChange, onEventsCommit };
  const L = React.useRef(live);
  L.current = live;

  const shownEvents = React.useMemo(() => (draft ? events.map((e) => (e.id === draft.id ? { ...e, start: draft.start, end: draft.end } : e)) : events), [events, draft]);
  const byId = (id: string) => L.current.events.find((e) => e.id === id);

  const setView = (v: EventCalendarView) => { if (viewProp === undefined) setOwnView(v); onViewChange?.(v); };
  const setDate = (d: Date) => { if (dateProp === undefined) setOwnDate(d); onDateChange?.(d); };
  const openDay = (d: Date) => { setDate(d); setView('day'); };

  /** Lands a change: the host hears it once, and a refused save gives the previous events back. */
  const land = (d: Draft, previous: readonly T[]) => {
    const { onEventsChange: change, onEventsCommit: commit, words: w, f: fm } = L.current;
    const e = previous.find((x) => x.id === d.id);
    if (!e || (e.start.getTime() === d.start.getTime() && e.end.getTime() === d.end.getTime())) return;
    const next = previous.map((x) => (x.id === d.id ? { ...x, start: d.start, end: d.end } : x));
    change?.(next);
    say(w.moved(e.title, fm.when(d.start, d.end, e.allDay, w.allDay)));
    const p = commit?.(next, [...previous]);
    if (p && typeof (p as Promise<unknown>).then === 'function') {
      setBusy(true);
      (p as Promise<unknown>).then(() => setBusy(false), () => {
        setBusy(false);
        change?.([...previous]);
        say(w.failed(e.title, fm.when(e.start, e.end, e.allDay, w.allDay)));
      });
    }
  };

  const frozen = (e: T) => !!(e.disabled || L.current.readOnly || L.current.busy);
  const refuseMove = (e: T, el: Element | null) => {
    refuse(el);
    haptic('refusal');
    if (!L.current.busy) say(L.current.words.cantMove(e.title));
  };

  /* Where the hand is: the strip under it (or nearest), the day in it, and the minute (in the timed layer). */
  const locate = (kind: 'time' | 'day', x: number, y: number) => {
    let best: { el: HTMLElement; days: Date[]; d: number } | null = null;
    for (const [el, s] of strips) {
      if (!el.isConnected) { strips.delete(el); continue; }
      if (s.kind !== kind) continue;
      const r = el.getBoundingClientRect();
      const d = Math.max(r.top - y, 0, y - r.bottom);
      if (!best || d < best.d) best = { el, days: s.days, d };
    }
    if (!best) return null;
    const r = best.el.getBoundingClientRect();
    const count = best.days.length;
    let i = Math.floor(((x - r.left) / r.width) * count);
    i = Math.min(count - 1, Math.max(0, i));
    if (L.current.rtl) i = count - 1 - i;
    const minute = L.current.dayStart * 60 + ((y - r.top) / r.height) * (L.current.dayEnd - L.current.dayStart) * 60;
    return { day: best.days[i], minute };
  };

  /** Where a move or resize puts an event, snapped and kept inside the day's hours. */
  const place = (e: T, d: Drag, at: { day: Date; minute: number }): Draft => {
    const { snap: s, dayStart: a, dayEnd: b } = L.current;
    if (d.kind === 'day') {
      const by = dayDiff(d.grabDay, at.day);
      return { id: e.id, start: addDays(e.start, by), end: addDays(e.end, by) };
    }
    const len = minutesOf(e.end) - minutesOf(e.start) + dayDiff(e.start, e.end) * 1440;
    if (d.mode === 'resize') {
      const end = Math.min(b * 60, Math.max(minutesOf(e.start) + s, Math.round(at.minute / s) * s));
      return { id: e.id, start: e.start, end: atMinutes(e.start, end) };
    }
    const start = Math.max(a * 60, Math.min(b * 60 - len, Math.round((at.minute - d.grabMin) / s) * s));
    const s0 = atMinutes(at.day, start);
    return { id: e.id, start: s0, end: new Date(s0.getTime() + len * 60000) };
  };

  // Pointer listeners live on the window while a press is down (a chip that changes week is a new node).
  const hand = React.useMemo(() => {
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const e = byId(d.id);
      if (!e) return;
      if (!d.started) {
        const threshold = parseFloat(getComputedStyle(d.el).getPropertyValue('--mu-r-sortable-self-threshold')) || 4;
        if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < threshold) return;
        clickEaten.current = true;
        if (frozen(e)) { stop(); refuseMove(e, d.el); return; }
        d.started = true;
        setHeld({ id: d.id, by: 'hand' });
        haptic('alignment');
      }
      ev.preventDefault();
      // Near the grid's top or bottom it scrolls toward the hand (on each move).
      // ponytail: scrolls only while the hand moves; a frame loop if holding still at the edge matters.
      const sc = d.scroll;
      if (sc && d.kind === 'time') {
        const r = sc.getBoundingClientRect();
        const edge = 48;
        if (ev.clientY < r.top + edge) sc.scrollTop -= (r.top + edge - ev.clientY) / 3;
        else if (ev.clientY > r.bottom - edge) sc.scrollTop += (ev.clientY - (r.bottom - edge)) / 3;
      }
      const at = locate(d.kind, ev.clientX, ev.clientY);
      if (!at) return;
      const next = place(e, d, at);
      const key = `${next.start.getTime()}:${next.end.getTime()}`;
      if (key === d.key) return;
      if (d.key) haptic('detent');
      d.key = key;
      setDraft(next);
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); finish(false); } };
    function stop() {
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
    }
    function finish(keep: boolean) {
      const d = drag.current;
      stop();
      if (!d?.started) return;
      const dr = draftRef.current;
      setDraft(null);
      setHeld(null);
      const e = byId(d.id);
      if (!e) return;
      if (!keep) {
        const { words: w, f: fm } = L.current;
        say(w.back(e.title, fm.when(e.start, e.end, e.allDay, w.allDay)));
        return;
      }
      if (dr) land(dr, L.current.events);
    }
    const start = (ev: React.PointerEvent<HTMLElement>, e: T, kind: 'time' | 'day', mode: 'move' | 'resize') => {
      if (ev.button !== 0 || drag.current || editing.current) return;
      ev.stopPropagation();
      clickEaten.current = false;
      const at = locate(kind, ev.clientX, ev.clientY);
      if (!at) return;
      const chip = (ev.currentTarget.closest('[data-ec-event]') as HTMLElement | null) ?? ev.currentTarget;
      drag.current = {
        id: e.id, kind, mode, x0: ev.clientX, y0: ev.clientY, started: false,
        grabMin: kind === 'time' ? at.minute - minutesOf(e.start) : 0, grabDay: kind === 'time' ? startOfDay(e.start) : at.day,
        key: '', el: chip, scroll: scroller.current,
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      window.addEventListener('keydown', key, true);
    };
    return { start, stop };
    // The handlers read the latest props through L; they are made once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => () => hand.stop(), [hand]);

  /* Keys: a few arrows are one move, kept on Enter or leaving, put back on Escape. */
  const keep = () => {
    const ed = editing.current;
    editing.current = null;
    setHeld(null);
    const dr = draftRef.current;
    setDraft(null);
    if (ed && dr) land(dr, ed.previous);
  };
  const onKey = (ev: React.KeyboardEvent<HTMLElement>, e: T, kind: 'time' | 'day') => {
    const { words: w, f: fm, snap: s, dayStart: a, dayEnd: b, shown: days } = L.current;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (editing.current) keep();
      else { anchor.current = ev.currentTarget; setOpened(e.id); }
      return;
    }
    if (ev.key === 'Escape' && editing.current) {
      ev.preventDefault();
      editing.current = null;
      setDraft(null);
      setHeld(null);
      const was = byId(e.id) ?? e;
      say(w.back(was.title, fm.when(was.start, was.end, was.allDay, w.allDay)));
      return;
    }
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [rtl ? 1 : -1, 0], ArrowRight: [rtl ? -1 : 1, 0] };
    const step = arrows[ev.key];
    if (!step) return;
    ev.preventDefault();
    if (frozen(e)) { refuseMove(e, ev.currentTarget); return; }
    const cur = draftRef.current?.id === e.id ? draftRef.current : { id: e.id, start: e.start, end: e.end };
    let next: Draft;
    if (step[0]) next = { id: e.id, start: addDays(cur.start, step[0]), end: addDays(cur.end, step[0]) };
    else if (kind === 'day') next = { id: e.id, start: addDays(cur.start, step[1] * 7), end: addDays(cur.end, step[1] * 7) };
    else if (ev.shiftKey) {
      const end = minutesOf(cur.end) + step[1] * s;
      if (end < minutesOf(cur.start) + s || end > b * 60 || !sameDay(cur.start, cur.end)) { haptic('refusal'); return; }
      next = { id: e.id, start: cur.start, end: atMinutes(cur.start, end) };
    } else {
      const start = minutesOf(cur.start) + step[1] * s;
      const len = (cur.end.getTime() - cur.start.getTime()) / 60000;
      if (start < a * 60 || start + len > b * 60) { haptic('refusal'); return; }
      next = { id: e.id, start: atMinutes(cur.start, start), end: new Date(atMinutes(cur.start, start).getTime() + len * 60000) };
    }
    // Only to days on screen: the event stays where the eye (and focus) is.
    if (!days.some((d) => sameDay(d, next.start))) { haptic('refusal'); return; }
    if (!editing.current) editing.current = { id: e.id, previous: L.current.events };
    setHeld({ id: e.id, by: 'keys' });
    setDraft(next);
    haptic('detent');
    say(w.moved(e.title, fm.when(next.start, next.end, e.allDay, w.allDay)));
  };
  const onBlur = (e: T) => {
    // A chip that changes week is a new node: focus follows it (below), so wait a frame before keeping.
    requestAnimationFrame(() => {
      if (editing.current?.id !== e.id) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset.ecEvent === e.id) return;
      keep();
    });
  };
  // Keys keep focus on the event they move, even when it is redrawn in another week.
  useIsoLayoutEffect(() => {
    const id = editing.current?.id;
    if (!id || !root.current) return;
    const active = document.activeElement as HTMLElement | null;
    if (active?.dataset.ecEvent === id) return;
    root.current.querySelector<HTMLElement>(`[data-ec-event="${CSS.escape(id)}"]`)?.focus();
  });

  // On arriving at days with today in them, the grid scrolls so now is a third of the way down.
  const todayShown = timeGrid && shown.some((d) => sameDay(d, now));
  useIsoLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc || !timeGrid) return;
    const px = sc.scrollHeight / hours;
    const at = todayShown ? (minutesOf(now) / 60 - dayStart) * px - sc.clientHeight / 3 : 0;
    sc.scrollTop = Math.max(0, at);
    // Only when the days change, not each minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, shown[0]?.getTime(), timeGrid]);

  /* ── an event's chip ── */
  const chip = (e: T, kind: 'time' | 'day', opts: { compact: boolean; className?: string; style?: React.CSSProperties; openStart?: boolean; openEnd?: boolean; resize?: boolean }) => {
    const label = `${e.title}, ${f.when(e.start, e.end, e.allDay, words.allDay)}`;
    const lifted = held?.id === e.id;
    const inner = renderEvent ? renderEvent(e, { start: e.start, end: e.end, compact: opts.compact }) : kind === 'day' && !e.allDay && !isBar(e) ? (
      <>
        <span className={META}>{f.time(e.start)}</span>
        <span className={NAME}>{e.title}</span>
      </>
    ) : opts.compact ? (
      <span className={NAME}>{e.title}{!e.allDay && kind === 'time' && <span className={META}> {f.time(e.start)}</span>}</span>
    ) : (
      <>
        <span className={META}>{f.time(e.start)} – {f.time(e.end)}</span>
        <span className={NAME}>{e.title}</span>
      </>
    );
    return (
      <button
        key={e.id}
        type="button"
        data-row={e.id}
        data-ec-event={e.id}
        aria-label={label}
        aria-haspopup="dialog"
        aria-keyshortcuts={frozen(e) ? undefined : 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown'}
        data-compact={opts.compact ? '' : undefined}
        data-lifted={lifted ? '' : undefined}
        data-row-held={lifted && held?.by === 'hand' ? '' : undefined}
        data-disabled={e.disabled ? '' : undefined}
        data-readonly={readOnly ? '' : undefined}
        data-open-start={opts.openStart ? '' : undefined}
        data-open-end={opts.openEnd ? '' : undefined}
        className={cx(EVENT, opts.className)}
        style={{ ...opts.style, ...(e.color ? { '--mu-ec-color': e.color } : null) } as React.CSSProperties}
        onPointerDown={(ev) => hand.start(ev, e, kind, 'move')}
        onClick={(ev) => {
          if (clickEaten.current) { clickEaten.current = false; return; }
          anchor.current = ev.currentTarget;
          setOpened(e.id);
        }}
        onKeyDown={(ev) => onKey(ev, e, kind)}
        onBlur={() => onBlur(e)}
      >
        {inner}
        {opts.resize && !e.disabled && !readOnly && <span aria-hidden className={GRIP} onPointerDown={(ev) => hand.start(ev, e, 'time', 'resize')} />}
      </button>
    );
  };

  const orderOf = (list: { event: T }[] | T[], extra: (i: number) => string) => list.map((x, i) => `${'event' in x ? x.event.id : x.id}@${extra(i)}`).join('|');

  /* ── the days by hours ── */
  const renderTimeGrid = () => {
    const lane = bars(shownEvents, shown);
    const timed = shownEvents.flatMap((e) => {
      if (isBar(e)) return [];
      const i = shown.findIndex((d) => sameDay(d, e.start));
      if (i < 0) return [];
      const s = Math.max(minutesOf(e.start), dayStart * 60);
      const en = Math.min(minutesOf(e.end) || 1440, dayEnd * 60);
      if (en <= dayStart * 60 || s >= dayEnd * 60) return [];
      // Overlap counts at least half an hour: a short event still takes room on screen.
      return [{ event: e, day: i, s, en, e: Math.max(en, s + 30) }];
    });
    const cols = new Map<string, { col: number; cols: number }>();
    shown.forEach((_, i) => share(timed.filter((t) => t.day === i).map((t) => ({ id: t.event.id, s: t.s, e: t.e }))).forEach((v, k) => cols.set(k, v)));
    const nowAt = (minutesOf(now) - dayStart * 60) / 60;
    const vars = { '--mu-ec-days': shown.length, '--mu-ec-hours': hours } as React.CSSProperties;
    return (
      <div className={TRAY} data-view={view} style={vars}>
        <div className={ROW}>
          <div aria-hidden />
          {shown.map((d) => {
            const today = sameDay(d, now);
            return (
              <button key={d.getTime()} type="button" className={DAY_HEAD} aria-label={f.full(d)} aria-current={today ? 'date' : undefined} onClick={() => openDay(d)} data-today={today ? '' : undefined}>
                <span className="type-meta text-ink3">{f.weekday(d)}</span>
                <span className={cx('type-ui tabular-nums text-ink', today && TODAY)}>{f.num(d)}</span>
              </button>
            );
          })}
        </div>
        <div className={ROW}>
          <div className={GUTTER}>{words.allDay}</div>
          <Strip kind="day" days={shown} strips={strips} order={orderOf(lane.list, (i) => `${lane.list[i].a}-${lane.list[i].b}-${lane.list[i].row}`)} className={LANE} role="group" aria-label={words.allDay}>
            <div aria-hidden className={CELLS}>{shown.map((d) => <div key={d.getTime()} data-off={offDays?.(d) ? '' : undefined} />)}</div>
            {lane.list.map((b) => chip(b.event, 'day', {
              compact: true, className: LINE, openStart: b.openStart, openEnd: b.openEnd,
              style: { gridColumn: `${b.a + 1} / ${b.b + 2}`, gridRow: b.row + 1 },
            }))}
          </Strip>
        </div>
        <div ref={scroller} className={SCROLL}>
          <div className={HOURS}>
            {Array.from({ length: hours - 1 }, (_, i) => (
              <span key={i} aria-hidden className={HOUR} style={{ '--mu-ec-at': i + 1 } as React.CSSProperties}>{f.hour(dayStart + i + 1)}</span>
            ))}
            <div aria-hidden />
            {shown.map((d) => (
              <div key={d.getTime()} aria-hidden className={COLUMN} data-off={offDays?.(d) ? '' : undefined}>
                {sameDay(d, now) && nowAt >= 0 && nowAt <= hours && <div className={NOW} style={{ '--mu-ec-now': nowAt } as React.CSSProperties} />}
              </div>
            ))}
            <Strip
              kind="time" days={shown} strips={strips} role="group" aria-label={f.title(view, date, shown)}
              order={orderOf(timed, (i) => { const t = timed[i]; const c = cols.get(t.event.id)!; return `${t.day}-${t.s}-${t.e}-${c.col}-${c.cols}`; })}
              className={LAYER}
            >
              {timed.map((t) => {
                const c = cols.get(t.event.id)!;
                const compact = t.en - t.s < 45;
                return chip(t.event, 'time', {
                  compact, resize: true, className: TIMED,
                  style: { '--mu-ec-day': t.day, '--mu-ec-col': c.col, '--mu-ec-cols': c.cols, '--mu-ec-top': (t.s - dayStart * 60) / 60, '--mu-ec-len': (t.en - t.s) / 60 } as React.CSSProperties,
                });
              })}
            </Strip>
          </div>
        </div>
      </div>
    );
  };

  /* ── the month ── */
  const renderMonth = () => {
    const per = weekends ? 7 : 5;
    const weeks = Array.from({ length: shown.length / per }, (_, i) => shown.slice(i * per, i * per + per));
    const month = date.getMonth();
    const vars = { '--mu-ec-days': per, '--mu-ec-rows': maxEvents } as React.CSSProperties;
    return (
      <div className={TRAY} data-view="month" style={vars}>
        <div aria-hidden className={WEEKDAYS}>{weeks[0].map((d) => <span key={d.getDay()}>{f.weekday(d)}</span>)}</div>
        {weeks.map((week) => {
          const lane = bars(shownEvents, week);
          const used = week.map(() => new Set<number>());
          const hidden = week.map(() => 0);
          const shownBars = lane.list.filter((b) => {
            const fits = b.row < maxEvents;
            for (let i = b.a; i <= b.b; i++) if (fits) used[i].add(b.row); else hidden[i]++;
            return fits;
          });
          const singles = week.map((d, i) => {
            const list = shownEvents.filter((e) => !isBar(e) && sameDay(e.start, d)).sort((a, b) => a.start.getTime() - b.start.getTime());
            const out: { event: T; slot: number }[] = [];
            let slot = 0;
            for (const e of list) {
              while (used[i].has(slot)) slot++;
              if (slot >= maxEvents) { hidden[i]++; continue; }
              out.push({ event: e, slot: slot++ });
            }
            return out;
          });
          const order = [...shownBars.map((b) => `${b.event.id}@${b.a}-${b.b}-${b.row}`), ...singles.flatMap((l, i) => l.map((s) => `${s.event.id}@${i}-${s.slot}`))].join('|');
          return (
            <Strip key={week[0].getTime()} kind="day" days={week} strips={strips} order={order} className={WEEK} role="group" aria-label={f.title('week', week[0], week)}>
              <div aria-hidden className={CELLS}>{week.map((d) => <div key={d.getTime()} data-off={offDays?.(d) ? '' : undefined} />)}</div>
              {week.map((d, i) => {
                const today = sameDay(d, now);
                return (
                  <button key={d.getTime()} type="button" className={DATE} style={{ gridColumn: i + 1 }} aria-label={f.full(d)} aria-current={today ? 'date' : undefined} data-outside={d.getMonth() !== month ? '' : undefined} onClick={() => openDay(d)}>
                    <span className={cx(today && TODAY)}>{f.num(d)}</span>
                  </button>
                );
              })}
              {shownBars.map((b) => chip(b.event, 'day', { compact: true, className: LINE, openStart: b.openStart, openEnd: b.openEnd, style: { gridColumn: `${b.a + 1} / ${b.b + 2}`, gridRow: b.row + 2 } }))}
              {singles.flatMap((l, i) => l.map((s) => chip(s.event, 'day', { compact: true, className: LINE, style: { gridColumn: i + 1, gridRow: s.slot + 2 } })))}
              {week.map((d, i) => hidden[i] > 0 && (
                <button key={`more-${d.getTime()}`} type="button" className={MORE} style={{ gridColumn: i + 1, gridRow: maxEvents + 2 }} aria-label={`${words.more(hidden[i])}, ${f.full(d)}`} onClick={() => openDay(d)}>
                  {words.more(hidden[i])}
                </button>
              ))}
            </Strip>
          );
        })}
      </div>
    );
  };

  const title = f.title(view, date, shown);
  const step = (by: number) => setDate(stepOf(view, date, by, n));
  const open = opened ? shownEvents.find((e) => e.id === opened) ?? null : null;
  // The last opened event stays in the plate while it fades out.
  const lastOpen = React.useRef<T | null>(null);
  if (open) lastOpen.current = open;
  const shownOpen = open ?? lastOpen.current;

  return (
    <div
      ref={(el) => { root.current = el; awakeRef(el); }}
      role="group"
      aria-label={props['aria-label'] ?? title}
      aria-busy={busy || undefined}
      data-dragging={held?.by === 'hand' ? '' : undefined}
      data-view={view}
      className={cx(ROOT, className)}
    >
      <div className={HEAD}>
        <button type="button" className={STEP} aria-label={words.previous(view)} onClick={() => step(-1)}><ChevronIcon turn={rtl ? 270 : 90} /></button>
        <button type="button" className={STEP} aria-label={words.next(view)} onClick={() => step(1)}><ChevronIcon turn={rtl ? 90 : 270} /></button>
        <Button size="compact" onClick={() => setDate(nowProp ?? new Date())}>{words.today}</Button>
        <h2 className={TITLE}><SwapText value={title} /></h2>
        {views.length > 1 && (
          <Switcher size="regular" aria-label="View" value={view} onValueChange={(v) => setView(v as EventCalendarView)} options={views.map((v) => ({ value: v, label: words.views[v] }))} />
        )}
      </div>
      {timeGrid ? renderTimeGrid() : renderMonth()}
      <div ref={announcer} className="sr-only" aria-live="polite" aria-atomic />
      <Popover.Root open={!!open} onOpenChange={(o) => { if (!o) setOpened(null); }}>
        {shownOpen && (
          <Popover.Content anchor={anchor} side="bottom" align="start" finalFocus={anchor}>
            <Popover.Title className="flex items-center gap-event-calendar-chip-pad">
              {shownOpen.color && <span aria-hidden className={SWATCH} style={{ '--mu-ec-color': shownOpen.color } as React.CSSProperties} />}
              {shownOpen.title}
            </Popover.Title>
            <Popover.Description>{f.when(shownOpen.start, shownOpen.end, shownOpen.allDay, words.allDay)}</Popover.Description>
            {renderDetails && <Popover.Body>{renderDetails(shownOpen)}</Popover.Body>}
          </Popover.Content>
        )}
      </Popover.Root>
    </div>
  );
}
