import * as React from 'react';
import { useDialKit } from 'dialkit';
import { EventCalendar, ToastProvider, useToast, type CalendarEvent, type EventCalendarView } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/event-calendar/event-calendar.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalEventCalendar.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/event-calendar/event-calendar.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * EVENT CALENDAR PAGE
 *
 *   playground  a print studio's week (built around this week, so now is on it): drag an event to
 *               another hour or day, pull its lower edge, or focus it and use the arrows; the press
 *               run is locked. The Event calendar panel: the view, the snap, the day's hours, the
 *               week's start, weekends, the save's wait and failure, the springs, slow motion
 *   more        the month with bars and "+N more"; a save that fails and glides back with a toast;
 *               three days with a day off; right to left in Arabic
 * ───────────────────────────────────────────────────────── */

interface StudioEvent extends CalendarEvent { where?: string }

// The person's calendar colours (data, not states): studio, clients, out of office.
const STUDIO = '#8a7fb5';
const CLIENT = '#c08a64';
const AWAY = '#6f9e9a';

/** The studio's week, around the Monday of this week. */
function studioWeek(): StudioEvent[] {
  const t = new Date();
  const monday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7));
  const at = (day: number, h: number, m = 0) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day, h, m);
  const on = (day: number) => at(day, 0);
  return [
    { id: 'standup', title: 'Stand-up', start: at(0, 9, 30), end: at(0, 9, 45), color: STUDIO, where: 'The press room' },
    { id: 'install', title: 'Window install', start: at(0, 15), end: at(0, 17), color: CLIENT, where: 'Livraria Ler' },
    { id: 'review', title: 'Design review', start: at(1, 10), end: at(1, 11), color: STUDIO, where: 'Studio table' },
    { id: 'proofs', title: 'Print proofs', start: at(1, 10, 30), end: at(1, 12), color: CLIENT, where: 'Casa Azul' },
    { id: 'lunch', title: 'Lunch with Ana', start: at(2, 12, 30), end: at(2, 13, 30), where: 'Taberna da Rua' },
    { id: 'fair', title: 'Book fair', start: on(2), end: on(4), allDay: true, color: AWAY, where: 'Feira do Livro' },
    { id: 'press', title: 'Press run: catalogue', start: at(3, 13), end: at(3, 16), color: CLIENT, disabled: true, where: 'Heidelberg, locked while it runs' },
    { id: 'call', title: 'Call with Rita', start: at(3, 9), end: at(3, 9, 30), where: 'Phone' },
    { id: 'invoices', title: 'Invoices due', start: on(4), end: on(4), allDay: true, color: STUDIO },
    { id: 'pickup', title: 'Paper pickup', start: at(4, 8), end: at(4, 9), where: 'Antalis' },
    { id: 'train', title: 'Night train to Porto', start: at(5, 22), end: at(6, 7), color: AWAY },
  ];
}

/** A busier month for the month view: more on one day than fits. */
function studioMonth(): StudioEvent[] {
  const week = studioWeek();
  const t = new Date();
  const d = (day: number, h: number, m = 0) => new Date(t.getFullYear(), t.getMonth(), day, h, m);
  return [
    ...week,
    { id: 'm-1', title: 'Quote: wine labels', start: d(12, 9), end: d(12, 10), color: CLIENT },
    { id: 'm-2', title: 'Ink order', start: d(12, 11), end: d(12, 11, 30) },
    { id: 'm-3', title: 'Riso workshop', start: d(12, 14), end: d(12, 17), color: STUDIO },
    { id: 'm-4', title: 'Drinks', start: d(12, 19), end: d(12, 21), color: AWAY },
    { id: 'm-5', title: 'Holiday', start: d(24, 0), end: d(28, 0), allDay: true, color: AWAY },
  ];
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface StudioProps {
  id: string;
  view?: EventCalendarView;
  start?: () => StudioEvent[];
  save?: { ms: number; fails: () => boolean };
  className?: string;
  props?: Partial<React.ComponentProps<typeof EventCalendar<StudioEvent>>>;
}

/** A calendar of the studio's events, with its save and its toasts. */
function Studio({ id, view = 'week', start = studioWeek, save, className = 'h-[560px]', props }: StudioProps) {
  const [events, setEvents] = React.useState(start);
  const toast = useToast();
  const commit = React.useCallback(async (next: StudioEvent[], previous: StudioEvent[]) => {
    if (!save) return;
    await wait(save.ms);
    const moved = next.find((e, i) => e.start.getTime() !== previous[i]?.start.getTime() || e.end.getTime() !== previous[i]?.end.getTime());
    if (save.fails()) {
      toast.show({ title: `Couldn’t move ${moved?.title ?? 'it'}`, sub: 'it’s back where it was', tone: 'error', timeout: 4000 });
      throw new Error('The save did not reach the server.');
    }
    if (moved) toast.show({ title: `${moved.title} moved`, undo: () => setEvents(previous) });
  }, [save, toast]);
  return (
    <div data-testid={id} className="flex w-full justify-center">
      <EventCalendar<StudioEvent>
        aria-label="Studio calendar"
        locale="en-GB"
        defaultView={view}
        events={events}
        onEventsChange={setEvents}
        onEventsCommit={commit}
        renderDetails={(e) => e.where && <p className="m-0 type-body text-ink2">{e.where}</p>}
        className={`w-full ${className}`}
        {...props}
      />
    </div>
  );
}

const WEEK_STARTS = { locale: undefined, monday: 1, sunday: 0 } as const;

function Playground() {
  const d = useDialKit('Event calendar', {
    view: { type: 'select', options: ['week', 'day', 'days', 'month'], default: 'week' },
    snap: { type: 'select', options: ['5', '10', '15', '30', '60'], default: '15' },
    dayStart: [7, 0, 12],
    dayEnd: [21, 13, 24],
    weekStart: { type: 'select', options: ['locale', 'monday', 'sunday'], default: 'locale' },
    weekends: true,
    wait: [0, 0, 3000],
    fails: false,
    lift: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    glide: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const save = React.useMemo(() => (d.wait || d.fails ? { ms: d.wait, fails: () => d.fails } : undefined), [d.wait, d.fails]);
  const vars = { ...springVars('surface', d.lift as SpringName, d.slow), ...springVars('settle', d.glide as SpringName, d.slow), ...springVars('object', 'object', d.slow) } as React.CSSProperties;
  return (
    <div className="w-full" style={vars}>
      <Studio
        key={`${d.view}`}
        id="event-calendar-play"
        view={d.view as EventCalendarView}
        save={save}
        props={{
          snap: Number(d.snap),
          dayStart: Math.round(d.dayStart),
          dayEnd: Math.max(Math.round(d.dayStart) + 1, Math.round(d.dayEnd)),
          weekStartsOn: WEEK_STARTS[d.weekStart as keyof typeof WEEK_STARTS],
          weekends: d.weekends,
          views: ['month', 'week', 'days', 'day'],
        }}
      />
    </div>
  );
}

/** The first save fails: a toast says so and the event glides back. */
function FailsOnce() {
  const tries = React.useRef(0);
  const save = React.useMemo(() => ({ ms: 700, fails: () => ++tries.current === 1 }), []);
  return <Studio id="event-calendar-fails" save={save} className="h-[480px]" />;
}

/** Three days from today, with the middle one off. */
function FewDays() {
  const t = new Date();
  const off = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  return (
    <Studio
      id="event-calendar-days"
      view="days"
      className="h-[440px]"
      props={{ days: 3, views: ['days'], offDays: (x) => x.getTime() === off.getTime(), dayStart: 8, dayEnd: 18, snap: 30 }}
    />
  );
}

export default function EventCalendarPage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Event calendar"
        lede="The person's time: their events on a month, a week or a day. Pick an event up and it lifts and steps through the hours by the snap, a detent each step; pull its lower edge to change its end. Keys do the same, out loud, and a failed save puts everything back."
        play={{
          wide: true,
          lede: 'Drag an event to another hour or day, or pull its lower edge. Or Tab to one and use the arrows (Shift with up and down changes its end); Enter keeps it, Escape puts it back. Press one to read it. The press run is locked. The Event calendar panel sets the view, the snap, the day’s hours, the week’s start and weekends, makes the save slow or fail, and swaps the springs.',
          caption: 'lift on surface · step by the snap with a detent · the others share the day and glide on settle · now in green · keys, said politely',
          node: <Playground />,
        }}
        more={[
          { id: 'month', title: 'A month', lede: 'Events over several days run as bars across the days, square where they run on into the next week. A day with more than fits says “+2 more”; that, or the date, opens the day.', node: <Studio id="event-calendar-month" view="month" start={studioMonth} className="h-auto" props={{ views: ['month', 'week', 'day'] }} /> },
          { id: 'rollback', title: 'When the save fails', lede: 'The first move here fails: the calendar waits while the save is out, then the event glides back and the toast says so. Move it again and it holds.', node: <FailsOnce /> },
          { id: 'days', title: 'A few days, one off', lede: 'Three days from today, eight to six, snapping to half hours. Tomorrow is off: quiet, and still takes events.', node: <FewDays /> },
          { id: 'rtl', title: 'Right to left', lede: 'In Arabic the days run right to left, the steps point outward and Left moves an event to the next day; names, times and digits are the locale’s.', node: <div dir="rtl" className="w-full"><Studio id="event-calendar-rtl" className="h-[480px]" props={{ locale: 'ar-EG', words: { allDay: 'طوال اليوم', today: 'اليوم', views: { month: 'شهر', week: 'أسبوع', day: 'يوم', days: 'أيام' } } }} /></div> },
        ]}
        usage={`const [events, setEvents] = React.useState<CalendarEvent[]>(initial);

<EventCalendar
  aria-label="Studio calendar"
  events={events}
  onEventsChange={setEvents}
  onEventsCommit={async (next, previous) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // rolls back
  }}
  defaultView="week"
  dayStart={8}
  dayEnd={19}
  snap={15}
  renderDetails={(event) => <EventEditor event={event} />}
/>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'EC1', title: 'It lands where it shows', body: 'While you move an event it stands at the snapped time it will keep, so letting go never surprises.', origin: 'Ours' },
          { id: 'EC2', title: 'Every snap is a detent', body: 'Each step of the snap ticks where the platform has a haptic; the hand feels the grid.', origin: 'Ours' },
          { id: 'EC3', title: 'Every drag has keys', body: 'Arrows move an event by the snap and a day, Shift changes its end, each step is said, and a few steps are one save.', origin: 'WCAG 2.1.1' },
          { id: 'EC4', title: 'Colour is the person’s', body: 'An event’s colour is the calendar it belongs to, never a state: green, amber and red keep their LED meanings.', origin: 'Ours' },
          { id: 'EC5', title: 'A failed save goes back', body: 'onEventsCommit gets the events before the move; a rejection glides everything back and the host says so in a toast.', origin: 'FullCalendar' },
        ]}
      />
    </ToastProvider>
  );
}
