'use client';

import * as React from 'react';
import { useRowMotion } from '../../motion/rows';
import { useWait } from '../../motion/wait';
import { Led, type LedGesture, type LedKind } from '../led/led';
import { Spinner } from '../spinner/spinner';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * TIMELINE, a record of what happened and what is planned, read top to bottom
 *
 *   done      the off lamp, a dull lens (the default: the past is what a record is)
 *   live      the green lamp and the word "Live"; a lamp that turns live flickers once
 *   running   the lamp gives way to the Spinner's ring after the show delay (useWait), "Running";
 *             the tick when it ends
 *   waiting   the amber lamp, steady, "Waiting" (held on someone or something else)
 *   failed    the red lamp, "Failed"; blinks twice when it turns failed on screen, never on load
 *   planned   the off lamp, its words in ink3; said "planned"
 *   now       where events turn from not planned to planned: a tick crosses the rail and NOW runs
 *             into an engraved rule across the row. Placed from the states, in either order
 *   glyph     the host's glyph in the switch's sunk well; live, waiting and failed put their small
 *             lamp on its corner. One node column for every event, so the rail stays straight
 *   time      relative ("2 h ago") with the exact time in a tooltip and to readers, or a fixed
 *             date / time; end of the title's line, or (timeSide start) a column before the rail
 *   arrive    a new event lands one nest from above on the object spring, the rest glide on settle
 *             (useRowMotion), and a polite status says it once
 *   narrow    under 360 px the time moves under the title
 * Reduce Motion: events appear in place; the lamps hold steady.
 * Semantics: an ordered list named by the host; nothing is focusable unless the host adds a link.
 * ───────────────────────────────────────────────────────── */

export type TimelineState = 'done' | 'live' | 'running' | 'waiting' | 'failed' | 'planned';
export type TimelineFormat = 'relative' | 'date' | 'time' | 'datetime';

export interface TimelineEvent {
  /** Stable key: new ids land as they arrive. */
  id: string;
  title: string;
  /** A line under the title; may hold a link. */
  description?: React.ReactNode;
  /** When it happened (or is planned). */
  time?: Date | string | number;
  /** How long it took, in ms: "42 s", "1:12". */
  duration?: number;
  /** done (default), live, running, waiting, failed, planned. */
  state?: TimelineState;
  /** The host's glyph (an element: `<CommitIcon />`, a small Avatar) in a sunk well on the rail. */
  glyph?: React.ReactElement;
}

export interface TimelineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  events: TimelineEvent[];
  /** Names the record: "Order 4312". */
  'aria-label': string;
  /** relative (default; exact in a tooltip), or a fixed date, time or both. */
  format?: TimelineFormat;
  /** Relative times count from here (default: the render). Nothing ticks at rest; a host with a clock passes it. */
  now?: Date;
  /** end (default): the time at the end of the title's line. start: a column of times before the rail. */
  timeSide?: 'end' | 'start';
}

const ROOT = 'mu-timeline timeline';
const LIST = 'mu-timeline-list timeline-list';
const EVENT = 'mu-timeline-event timeline-event';
const NODE = 'mu-timeline-node timeline-node';
const WELL = 'mu-timeline-well timeline-well rounded-pill recipe-switch';
const MAIN = 'mu-timeline-main timeline-main';
const TITLE = 'mu-timeline-title type-ui';
const DESCRIPTION = 'mu-timeline-description type-meta';
const WHEN = 'mu-timeline-when timeline-when type-meta tabular-nums';
const NOW = 'mu-timeline-now timeline-now';
const NOW_WORD = 'type-readout uppercase text-ink2';

const lampOf: Record<TimelineState, LedKind> = { done: 'off', live: 'live', running: 'live', waiting: 'waiting', failed: 'failed', planned: 'off' };
const WORD: Partial<Record<TimelineState, string>> = { live: 'Live', running: 'Running', waiting: 'Waiting', failed: 'Failed' };
const CORNER: Partial<Record<TimelineState, true>> = { live: true, running: true, waiting: true, failed: true };

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

// ponytail: the same relative and short date words as Table's date cell, kept here so one import ships one
// component; move both to a shared format module when a third reader appears.
const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
let relativeFormat: Intl.RelativeTimeFormat | undefined;
function relative(date: Date, now: Date) {
  const ms = date.getTime() - now.getTime();
  const a = Math.abs(ms);
  relativeFormat ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
  if (a < 45 * SECOND) return relativeFormat.format(0, 'second');
  if (a < 45 * MINUTE) return relativeFormat.format(Math.round(ms / MINUTE), 'minute');
  if (a < 22 * HOUR) return relativeFormat.format(Math.round(ms / HOUR), 'hour');
  if (a < 7 * DAY) return relativeFormat.format(Math.round(ms / DAY), 'day');
  return shortDate(date, now, 'date');
}
function shortDate(date: Date, now: Date, format: 'date' | 'time' | 'datetime') {
  const year = date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined;
  const day: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year };
  const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return date.toLocaleString(undefined, format === 'date' ? day : format === 'time' ? time : { ...day, ...time });
}
const exact = (date: Date) => date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** "42 s" under a minute, then "1:12", then "1:02:05". */
function took(ms: number) {
  const s = Math.round(ms / SECOND);
  if (s < 60) return `${s} s`;
  const two = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

function When({ event, state, format, now }: { event: TimelineEvent; state: TimelineState; format: TimelineFormat; now?: Date }) {
  const word = WORD[state];
  const d = event.time == null ? null : event.time instanceof Date ? event.time : new Date(event.time);
  const date = d && !Number.isNaN(d.getTime()) ? d : null;
  const parts: React.ReactNode[] = [];
  if (word) parts.push(<span key="w">{word}</span>);
  if (event.duration != null) parts.push(<span key="d">{took(event.duration)}</span>);
  if (date) {
    const at = now ?? new Date();
    parts.push(format === 'relative'
      ? (
        <React.Fragment key="t">
          <Tooltip label={exact(date)}>
            <time aria-hidden dateTime={date.toISOString()}>{relative(date, at)}</time>
          </Tooltip>
          <span className="sr-only">{exact(date)}</span>
        </React.Fragment>
      )
      : <time key="t" dateTime={date.toISOString()}>{shortDate(date, at, format)}</time>);
  }
  if (!parts.length) return null;
  return (
    <span className={join(WHEN, state === 'planned' ? 'text-ink3' : 'text-ink2')}>
      {parts.flatMap((p, i) => (i ? [<span key={`s${i}`} aria-hidden>·</span>, p] : [p]))}
    </span>
  );
}

/** The gesture a lamp plays when its state changes on screen: never on load. */
function useGesture(state: TimelineState): LedGesture {
  const [seen, setSeen] = React.useState(state);
  const [gesture, setGesture] = React.useState<LedGesture>('steady');
  if (seen !== state) {
    setSeen(state);
    setGesture(state === 'failed' ? 'blink2' : state === 'live' ? 'flicker' : 'steady');
  }
  return gesture;
}

function Event({ event, nowMark, format, now }: { event: TimelineEvent; nowMark: boolean; format: TimelineFormat; now?: Date }) {
  const state = event.state ?? 'done';
  const wait = useWait(state === 'running' ? 'working' : state === 'done' ? 'done' : 'idle');
  const gesture = useGesture(state);
  const planned = state === 'planned';
  const lamp = <Led kind={lampOf[state]} gesture={gesture} size={event.glyph ? 'small' : 'default'} />;
  const ring = <Spinner size="small" phase={wait.phase} label={`${event.title}, running`} result={`${event.title}, done`} />;
  return (
    <li data-row={event.id} data-state={state} data-now={nowMark ? '' : undefined} aria-busy={wait.busy || undefined} className={EVENT}>
      {nowMark && (
        <div aria-hidden className={NOW}>
          <span className="mu-timeline-run">
            <span className="timeline-tick" />
            <span className={NOW_WORD}>Now</span>
            <span className="timeline-line" />
          </span>
        </div>
      )}
      <span aria-hidden className={NODE}>
        {event.glyph
          ? (
            <span className={WELL}>
              {wait.showing ? ring : event.glyph}
              {CORNER[state] && !wait.showing && lamp}
            </span>
          )
          : wait.showing ? ring : lamp}
      </span>
      <span className={MAIN}>
        <span className={join(TITLE, planned ? 'text-ink3' : 'text-ink')}>{event.title}{planned && <span className="sr-only">, planned</span>}</span>
        {event.description != null && <span className={join(DESCRIPTION, planned ? 'text-ink3' : 'text-ink2')}>{event.description}</span>}
      </span>
      <When event={event} state={state} format={format} now={now} />
      {(state === 'running' || wait.phase !== 'idle') && <Spinner.Status phase={wait.phase} label={`${event.title}, running`} result={`${event.title}, done`} />}
    </li>
  );
}

/** Where the now marker goes: on top of the first event whose planned-ness differs from the one before it. */
function nowIndex(events: TimelineEvent[]) {
  for (let i = 1; i < events.length; i++) {
    if ((events[i].state === 'planned') !== (events[i - 1].state === 'planned')) return i;
  }
  return -1;
}

/** A record of events in order, on an engraved rail, with where things stand now. */
export function Timeline({ events, format = 'relative', now, timeSide = 'end', className, 'aria-label': label, ...props }: TimelineProps) {
  const list = React.useRef<HTMLOListElement>(null);
  const order = events.map((e) => e.id).join('\u0000');
  useRowMotion(list, order, true);

  // Events that arrive after the first render are said once, politely.
  const known = React.useRef<Set<string> | null>(null);
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    const seen = known.current;
    known.current = new Set(events.map((e) => e.id));
    if (!seen) return;
    const fresh = events.filter((e) => !seen.has(e.id));
    if (fresh.length) setSaid(fresh.map((e) => [e.title, WORD[e.state ?? 'done']].filter(Boolean).join(', ')).join('. '));
  }, [order]);

  const at = nowIndex(events);
  return (
    <div data-time-side={timeSide} data-glyphs={events.some((e) => e.glyph) ? '' : undefined} className={join(ROOT, className)} {...props}>
      <ol ref={list} aria-label={label} className={LIST}>
        {events.map((e, i) => <Event key={e.id} event={e} nowMark={i === at} format={format} now={now} />)}
      </ol>
      <span role="status" className="sr-only">{said}</span>
    </div>
  );
}
