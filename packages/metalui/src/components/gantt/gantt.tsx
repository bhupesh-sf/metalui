'use client';

import * as React from 'react';
import { haptic } from '../../motion/haptic';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { startOfDay, weekStartOf } from '../calendar/calendar';

/* ─────────────────────────────────────────────────────────
 * GANTT, a plan laid out against dates (a place)
 *
 *   rest      a sticky two-tier header (months over days or weeks, years over months), a sticky name
 *             column, one row per task: a bar on the raised plate with Progress's well inside, or a
 *             diamond for a milestone; hairlines at each lower unit; today's line with NOW
 *   move      press a bar and move (4): it lifts and follows the hand; its slot, snapped to whole days,
 *             is the recess; release and it lands there on the object spring
 *   resize    press an end: that end moves a day at a time (the detent haptic); never past the other
 *   keys      ← → a day, Shift ← → its end, Alt Shift ← → its start, ↑ ↓ the next bar; each step said
 *             in a polite status; the burst commits after a pause or when focus leaves; Escape undoes it
 *   commit    onTasksCommit(next, previous): a promise holds the chart busy; a rejection puts the
 *             dates back and says so (the host's toast says why)
 *   locked    it doesn't lift: it shakes once and says so
 * Reduce Motion: no scale and no travel (the travel tokens); the hand is still followed.
 * A place: the bars are the chart's own (their look is their dates). The side column has Table's look.
 * ───────────────────────────────────────────────────────── */

export type GanttScale = 'day' | 'week' | 'month';

export interface GanttTask {
  id: string;
  /** Its name: the side column, the bar's name and what is said. */
  name: string;
  /** Its first day. */
  start: Date;
  /** Its last day, included. A milestone's is its start. */
  end: Date;
  /** How much is done, 0 to 100: Progress's fill in the bar. */
  progress?: number;
  /** A date that matters: a diamond on its day, with no length. */
  milestone?: boolean;
  /** It can't be moved or resized. */
  locked?: boolean;
}

export interface GanttWords {
  /** How a day reads ("Oct 6"). */
  date?: (d: Date) => string;
  /** The bar's name. */
  bar?: (t: GanttTask, date: (d: Date) => string) => string;
  /** What is said as it moves. */
  moved?: (t: GanttTask, date: (d: Date) => string) => string;
  locked?: (t: GanttTask) => string;
  failed?: (t: GanttTask, date: (d: Date) => string) => string;
  instructions?: string;
  now?: string;
}

const DAY = 864e5;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
const sameDates = (a: GanttTask, b: GanttTask) => daysBetween(a.start, b.start) === 0 && daysBetween(a.end, b.end) === 0;
const lastOf = (t: GanttTask) => (t.milestone ? t.start : t.end);

const when = (t: GanttTask, date: (d: Date) => string) => (t.milestone ? date(t.start) : `${date(t.start)} to ${date(t.end)}`);
const said: Required<Omit<GanttWords, 'date'>> = {
  bar: (t, date) => `${t.name}, ${t.milestone ? 'milestone, ' : ''}${when(t, date)}${t.progress != null && !t.milestone ? `, ${Math.round(t.progress)}% done` : ''}`,
  moved: (t, date) => `${t.name}, ${when(t, date)}.`,
  locked: (t) => `${t.name} can’t be moved.`,
  failed: (t, date) => `Couldn’t save. ${t.name} is back at ${when(t, date)}.`,
  instructions: 'Left and right move it a day. Shift with left and right moves its end, Alt and Shift its start. Up and down go to the next task.',
  now: 'Now',
};

type Mode = 'move' | 'start' | 'end';

/** The task with its dates shifted by `days` (by mode); an end never passes the other. */
function shifted(t: GanttTask, mode: Mode, days: number): GanttTask {
  if (t.milestone || mode === 'move') return { ...t, start: addDays(t.start, days), end: addDays(lastOf(t), days) };
  if (mode === 'end') return { ...t, end: addDays(t.start, Math.max(0, daysBetween(t.start, t.end) + days)) };
  return { ...t, start: addDays(t.end, -Math.max(0, daysBetween(t.start, t.end) - days)) };
}

interface Unit { at: number; span: number; label: string }

/** Runs of days that share a key, as header units. */
function unitsOf(from: Date, days: number, key: (d: Date, i: number) => number, label: (d: Date) => string): Unit[] {
  const out: Unit[] = [];
  let last = NaN;
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    const k = key(d, i);
    if (k === last) out[out.length - 1].span++;
    else out.push({ at: i, span: 1, label: label(d) });
    last = k;
  }
  return out;
}

/** The chart's first and last day: a unit beyond the tasks either side, on unit starts. */
function rangeOf(tasks: readonly GanttTask[], scale: GanttScale, weekStart: number): [Date, Date] {
  const today = startOfDay(new Date());
  const lo = tasks.reduce((m, t) => (t.start < m ? t.start : m), tasks[0]?.start ?? today);
  const hi = tasks.reduce((m, t) => (lastOf(t) > m ? lastOf(t) : m), tasks[0] ? lastOf(tasks[0]) : addDays(today, 28));
  if (scale === 'day') return [addDays(lo, -2), addDays(hi, 2)];
  if (scale === 'week') {
    const from = addDays(lo, -7 - ((lo.getDay() - weekStart + 7) % 7));
    const to = addDays(hi, 7 + 6 - ((hi.getDay() - weekStart + 7) % 7));
    return [from, to];
  }
  return [new Date(lo.getFullYear(), lo.getMonth() - 1, 1), new Date(hi.getFullYear(), hi.getMonth() + 2, 0)];
}

const ROOT = 'mu-gantt gantt';
const GRID = 'mu-gantt-grid gantt-grid';
const HEAD = 'mu-gantt-head gantt-head';
const CORNER = 'mu-gantt-corner gantt-corner type-label engraved';
const UNIT = 'mu-gantt-unit gantt-unit type-readout tabular-nums';
const ROW = 'mu-gantt-row gantt-row';
const NAME = 'mu-gantt-name gantt-name type-ui text-ink';
const TRACK = 'mu-gantt-track gantt-track';
const LINES = 'mu-gantt-lines gantt-lines';
const NOW = 'mu-gantt-now gantt-now';
const NOW_WORD = 'type-readout text-ink2';
const SLOT = 'mu-gantt-slot gantt-slot';
const BAR = 'mu-gantt-bar gantt-bar';
const PLATE = 'mu-gantt-plate gantt-plate';
const WELL = 'mu-gantt-well gantt-well recipe-switch';
const FILL = 'mu-progress-fill block recipe-switch-on progress-fill';
const EDGE = 'mu-gantt-edge gantt-edge';
const DATES = 'mu-gantt-dates gantt-dates type-meta tabular-nums text-ink2';

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const px = (el: Element, name: string, fallback: number) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || fallback;
/** Lets go of a bar: it drops its lift and travels the rest of the way into its box. */
const settle = (el: HTMLElement) => {
  el.removeAttribute('data-following');
  el.removeAttribute('data-lifted');
  el.style.setProperty('--mu-gantt-follow', '0px');
};
const vars = (v: Record<string, number>) => Object.fromEntries(Object.entries(v).map(([k, n]) => [`--${k}`, n])) as React.CSSProperties;

export interface GanttProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The plan, one row per task, in the order shown. */
  tasks: readonly GanttTask[];
  /** The tasks while moving (live), on Escape and on rollback. */
  onTasksChange: (next: GanttTask[]) => void;
  /** Once per drop, and once per burst of keys, that changed anything. Return a promise to hold the chart busy; reject to roll back to `previous`. */
  onTasksCommit?: (next: GanttTask[], previous: GanttTask[]) => void | Promise<unknown>;
  /** How wide a day is and what the header counts: days, weeks or months. */
  scale?: GanttScale;
  /** Where the now line sits; the hour counts. */
  today?: Date;
  /** The chart's first and last day. A unit beyond the tasks either side by default. */
  from?: Date;
  to?: Date;
  /** The name column's heading. */
  nameLabel?: string;
  locale?: string;
  /** Nothing moves. */
  disabled?: boolean;
  words?: GanttWords;
  /** The plan's name ("Autumn catalogue"). */
  'aria-label'?: string;
}

interface Drag { id: string; mode: Mode; x: number; dx: number; base: GanttTask; previous: GanttTask[]; lifted: boolean; el: HTMLElement }

export function Gantt({
  tasks, onTasksChange, onTasksCommit, scale = 'week', today, from: fromProp, to: toProp, nameLabel = 'Task', locale, disabled,
  words, className, style, 'aria-label': label, ...rest
}: GanttProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const status = React.useRef<HTMLDivElement>(null);
  const instructionsId = React.useId();
  const [held, setHeld] = React.useState<{ id: string; mode: Mode } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const drag = React.useRef<Drag | null>(null);
  const homing = React.useRef<Drag | null>(null);
  const burst = React.useRef<{ previous: GanttTask[]; timer: number } | null>(null);
  const latest = React.useRef({ tasks, onTasksChange, onTasksCommit, busy });
  latest.current = { tasks, onTasksChange, onTasksCommit, busy };

  const w = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return { ...said, date: (d: Date) => fmt.format(d), ...words };
  }, [locale, words]);
  const weekStart = React.useMemo(() => weekStartOf(locale), [locale]);
  const [auto0, auto1] = React.useMemo(() => rangeOf(tasks, scale, weekStart), [tasks, scale, weekStart]);
  const from = fromProp ? startOfDay(fromProp) : auto0;
  const fromTime = from.getTime();
  const days = daysBetween(from, toProp ?? auto1) + 1;

  const tiers = React.useMemo(() => {
    const from = new Date(fromTime);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
    const month = f({ month: 'long', year: 'numeric' });
    const monthShort = f({ month: 'short' });
    const year = f({ year: 'numeric' });
    const week = f({ month: 'short', day: 'numeric' });
    const ym = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    if (scale === 'month') return [unitsOf(from, days, (d) => d.getFullYear(), (d) => year.format(d)), unitsOf(from, days, ym, (d) => monthShort.format(d))];
    const upper = unitsOf(from, days, ym, (d) => month.format(d));
    if (scale === 'day') return [upper, unitsOf(from, days, (_, i) => i, (d) => `${d.getDate()}`)];
    const lead = (from.getDay() - weekStart + 7) % 7;
    return [upper, unitsOf(from, days, (_, i) => Math.floor((i + lead) / 7), (d) => week.format(d))];
  }, [fromTime, days, scale, locale, weekStart]);

  const now = today ?? new Date();
  const nowAt = daysBetween(from, now) + (now.getTime() - startOfDay(now).getTime()) / DAY;

  // Open at today (and keep it in view when the scale changes): the now line a third of the way in.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || nowAt < 0 || nowAt > days) return;
    const track = el.clientWidth - px(el, '--mu-r-gantt-self-side', 200);
    el.scrollLeft = Math.max(0, nowAt * px(el, '--mu-gantt-day', 16) - track / 3);
  }, [scale]);

  const say = (text: string) => { if (status.current) status.current.textContent = text; };
  const replace = (list: readonly GanttTask[], t: GanttTask) => list.map((x) => (x.id === t.id ? t : x));

  const commit = React.useCallback((next: GanttTask[], previous: GanttTask[]) => {
    const changed = next.find((t) => { const p = previous.find((x) => x.id === t.id); return p && !sameDates(p, t); });
    const { onTasksCommit: save, onTasksChange: change } = latest.current;
    if (!changed || !save) return;
    const r = save(next, previous);
    if (!r || typeof (r as Promise<unknown>).then !== 'function') return;
    setBusy(true);
    (r as Promise<unknown>).then(
      () => setBusy(false),
      () => {
        setBusy(false);
        change(previous);
        const back = previous.find((t) => t.id === changed.id);
        if (back) say(w.failed(back, w.date));
      },
    );
  }, [w]);

  const flush = React.useCallback(() => {
    const b = burst.current;
    if (!b) return;
    window.clearTimeout(b.timer);
    burst.current = null;
    commit([...latest.current.tasks], b.previous);
  }, [commit]);
  React.useEffect(() => () => { if (burst.current) window.clearTimeout(burst.current.timer); }, []);

  /** The follow: what the hand has moved beyond the bar's rendered (snapped) place. */
  const follow = (d: Drag) => {
    const t = latest.current.tasks.find((x) => x.id === d.id);
    const moved = t && d.mode === 'move' ? daysBetween(d.base.start, t.start) : 0;
    const dx = d.mode === 'move' ? d.dx - moved * px(root.current!, '--mu-gantt-day', 16) : 0;
    d.el.style.setProperty('--mu-gantt-follow', `${dx}px`);
  };
  useIsoLayoutEffect(() => {
    if (drag.current?.lifted) follow(drag.current);
    const h = homing.current;
    if (!h) return;
    // Back at home's box: start the travel from the hand.
    homing.current = null;
    h.el.style.setProperty('--mu-gantt-follow', `${h.dx}px`);
    void h.el.offsetWidth;
    settle(h.el);
  }, [tasks]);

  const refused = (t: GanttTask, el: HTMLElement | null) => {
    refuse(el);
    haptic('refusal');
    say(w.locked(t));
  };

  const land = (d: Drag, home: boolean) => {
    drag.current = null;
    setHeld(null);
    const shown = latest.current.tasks.find((x) => x.id === d.id);
    if (home && shown && !sameDates(shown, d.base)) {
      homing.current = d;
      latest.current.onTasksChange(d.previous);
    } else settle(d.el);
    const t = (home ? d.previous : latest.current.tasks).find((x) => x.id === d.id);
    if (t) say(w.moved(t, w.date));
    if (!home) commit([...latest.current.tasks], d.previous);
  };

  React.useEffect(() => {
    if (!held) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && drag.current?.lifted) { e.preventDefault(); land(drag.current, true); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const press = (t: GanttTask, mode: Mode) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || disabled || drag.current) return;
    const el = (e.currentTarget.closest('.mu-gantt-bar') as HTMLElement | null) ?? e.currentTarget;
    if (busy) return;
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    drag.current = { id: t.id, mode, x: e.clientX, dx: 0, base: t, previous: [...latest.current.tasks], lifted: false, el };
  };

  const moveTo = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    if (!d.lifted) {
      if (Math.abs(d.dx) < px(root.current!, '--mu-r-sortable-self-threshold', 4)) return;
      if (d.base.locked) { drag.current = null; refused(d.base, d.el); return; }
      d.lifted = true;
      d.el.setAttribute('data-lifted', '');
      if (d.mode === 'move') d.el.setAttribute('data-following', '');
      setHeld({ id: d.id, mode: d.mode });
      haptic('alignment');
      d.el.focus({ preventScroll: true });
    }
    const n = Math.round(d.dx / px(root.current!, '--mu-gantt-day', 16));
    const next = shifted(d.base, d.mode, n);
    const shown = latest.current.tasks.find((x) => x.id === d.id);
    if (shown && !sameDates(shown, next)) {
      haptic('detent');
      latest.current.onTasksChange(replace(latest.current.tasks, next));
    }
    follow(d);
  };

  const release = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.el.hasPointerCapture(e.pointerId)) d.el.releasePointerCapture(e.pointerId);
    if (!d.lifted) { drag.current = null; return; }
    land(d, e.type === 'pointercancel');
  };

  const onKey = (t: GanttTask) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const bars = [...root.current!.querySelectorAll<HTMLElement>('.mu-gantt-bar')];
      bars[bars.indexOf(e.currentTarget) + (e.key === 'ArrowUp' ? -1 : 1)]?.focus();
      return;
    }
    if (e.key === 'Escape' && burst.current) {
      e.preventDefault();
      const previous = burst.current.previous;
      window.clearTimeout(burst.current.timer);
      burst.current = null;
      latest.current.onTasksChange(previous);
      const back = previous.find((x) => x.id === t.id);
      if (back) say(w.moved(back, w.date));
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if (disabled || latest.current.busy || drag.current) return;
    if (t.locked) { refused(t, e.currentTarget); return; }
    const mode: Mode = e.shiftKey ? (e.altKey ? 'start' : 'end') : 'move';
    const next = shifted(t, mode, e.key === 'ArrowRight' ? 1 : -1);
    if (sameDates(next, t)) return;
    if (!burst.current) burst.current = { previous: [...latest.current.tasks], timer: 0 };
    window.clearTimeout(burst.current.timer);
    burst.current.timer = window.setTimeout(flush, px(root.current!, '--mu-r-gantt-self-commit', 700));
    latest.current.onTasksChange(replace(latest.current.tasks, next));
    say(w.moved(next, w.date));
  };

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      aria-busy={busy || undefined}
      data-scale={scale}
      data-dragging={held ? '' : undefined}
      {...rest}
      style={{ ...style, ...vars({ 'mu-gantt-days': days }) }}
      className={join(ROOT, className)}
    >
      <div className={GRID}>
        <div className={HEAD} aria-hidden>
          <div className={CORNER}>{nameLabel}</div>
          <div className="mu-gantt-scale gantt-scale">
            {tiers.map((tier, i) => tier.map((u) => (
              <div key={`${i}-${u.at}`} data-tier={i ? 'lower' : 'upper'} className={join(UNIT, i ? 'text-ink3' : 'text-ink2')} style={vars({ at: u.at, span: u.span })}>
                <span>{u.label}</span>
              </div>
            )))}
          </div>
        </div>
        <div className={LINES} aria-hidden>
          {tiers[1].slice(1).map((u) => <i key={u.at} style={vars({ at: u.at })} />)}
          {nowAt >= 0 && nowAt <= days && (
            <div className={NOW} style={vars({ at: nowAt })}><span className={NOW_WORD}>{w.now}</span></div>
          )}
        </div>
        <div role="list" aria-label={label} className="contents">
          {tasks.map((t) => {
            const at = daysBetween(from, t.start);
            const len = t.milestone ? 1 : daysBetween(t.start, t.end) + 1;
            const v = vars({ at, span: len });
            return (
              <div key={t.id} role="listitem" data-row={t.id} className={ROW}>
                <div className={NAME} aria-hidden><span>{t.name}</span></div>
                <div className={TRACK}>
                  {held?.id === t.id && held.mode === 'move' && <div className={SLOT} data-milestone={t.milestone ? '' : undefined} style={v} aria-hidden />}
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-roledescription="task"
                    aria-label={w.bar(t, w.date)}
                    aria-describedby={instructionsId}
                    aria-disabled={t.locked || disabled || undefined}
                    data-milestone={t.milestone ? '' : undefined}
                    data-locked={t.locked ? '' : undefined}
                    className={BAR}
                    style={v}
                    onPointerDown={press(t, 'move')}
                    onPointerMove={moveTo}
                    onPointerUp={release}
                    onPointerCancel={release}
                    onLostPointerCapture={release}
                    onKeyDown={onKey(t)}
                    onBlur={flush}
                  >
                    <span className={PLATE} />
                    {t.progress != null && !t.milestone && (
                      <span className={WELL}><span className={FILL} style={vars({ 'mu-progress-value': Math.min(100, Math.max(0, t.progress)) })} /></span>
                    )}
                    {!t.milestone && <>
                      <span className={EDGE} data-edge="start" onPointerDown={press(t, 'start')} />
                      <span className={EDGE} data-edge="end" onPointerDown={press(t, 'end')} />
                    </>}
                    <span className={DATES} aria-hidden>{t.milestone ? w.date(t.start) : `${w.date(t.start)} – ${w.date(t.end)}`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <span id={instructionsId} hidden>{w.instructions}</span>
      <div ref={status} role="status" className="sr-only" aria-live="polite" aria-atomic />
    </div>
  );
}
