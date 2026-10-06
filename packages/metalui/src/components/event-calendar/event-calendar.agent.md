# Event calendar

The person's time: their events on a month, a week, a day or a few days by hours, moved and resized by hand or by keys. React: `EventCalendar` from `@unlocalhosted/metalui`. SwiftUI: `MetalEventCalendar`. It is a **place**: it has area and holds the person's things. Events are the person's objects, drawn as small raised plates; the drag is the calendar's own instrument with Sortable's lift. The `event-calendar` recipe holds its numbers. Sheet: `docs/sheets/event-calendar.md`.

## Use it for

- Anything that happens at a time: bookings, a studio's or a team's week, shifts, classes, a content calendar.
- Moving and stretching those things on the grid: the place is where the person reschedules.

## Don't use it for

- Choosing a day or a range: `Calendar`, `DatePicker` (a component; `marks` puts a dot on days with something on them).
- A condition on a date ("due before 6 Oct"): `DateSelector`.
- What happened, in order: `Timeline`. Stages of work: `Kanban`.
- Work bars over weeks and months with dependencies: Gantt.
- People or rooms as columns (a resource grid), an agenda list, time zones: Later.

## Anatomy

- The head: the step keys (‹ ›, Calendar's), **Today**, the title on the drum (`SwapText`; "October 2026", "5 – 11 Oct 2026", "Tuesday, 6 October 2026" from `Intl`), and the view `Switcher` at the end (only with more than one of `views`).
- The tray: a sunk well (the well's field, radius 14).
- Days by hours (`week`, `day`, `days`): a row of day heads (weekday in meta ink3, the date in ui ink; today's with Calendar's green lamp; pressing one opens that day), the all-day lane (bars 22 tall, 2 apart, "All day" in a 52 gutter), then the hours from `dayStart` to `dayEnd`, 48 each, in a grid that scrolls on its own: hour labels in the gutter, the rule's hairline every hour and half as strong at the half, a hairline between days. An off day (`offDays`) lies under the well's track at half strength.
- An event: a button on the surface's `raise-sm` plate (radius 6), inset 2 from its neighbours, 4 inside: its time (meta ink2) over its title (ui ink); under 45 minutes, one line. The person's colour (`color`) is a 3-wide stripe on its leading edge. Events that overlap share their day side by side. A 6-tall grip along a timed event's lower edge changes its end.
- Bars: all-day events and anything that crosses midnight, across the days in the lane (the month's weeks too); nearly square (2) where they run on past what is shown.
- The now line: 2 of the green LED across today at this minute, an 8 lamp at its start (now is live).
- The month: weekday initials, six weeks; each week the dates (ink3 outside the month, a lamp before today's; pressing one opens the day), then up to `maxEvents` rows of bars and one-line chips ("10:00 Design review"), then "+N more" (meta ink2), which opens the day.
- Details: pressing an event opens a `Popover` from it: the title (with the colour's dot), the day and time in words, and `renderDetails(event)`.

## States and motion

| Moment | What happens | Spring |
|---|---|---|
| rest | the events at their times; the grab cursor over them | – |
| lift (move 4) | the event grows to Sortable's 1.025 and its raised plate fades in | surface |
| move | it stands at the snapped time it would keep, a step at a time, to another hour or day (bars and month chips: whole days); each step a detent (haptic); the others re-share their day and glide; near the grid's top or bottom it scrolls | settle |
| resize (the lower grip) | its end steps by the snap; never shorter than one snap or past `dayEnd` | settle |
| drop | the plate fades; `onEventsChange(next)`, then `onEventsCommit(next, previous)`; said politely | release |
| cancel (Escape) | it goes back; said | – |
| saving (a promise) | `aria-busy`; nothing lifts | – |
| failed (rejected) | `onEventsChange(previous)`; every event glides back; said; the host's toast says why | settle |
| keys (focus an event) | ↑ ↓ by the snap (a week in the month or lane), ← → by a day (mirrored right to left), Shift ↑ ↓ its end; it shows lifted while you move it; each step said; Enter or leaving keeps it (one commit), Escape puts it back | settle |
| disabled or `readOnly` | it doesn't lift: one shake, "… can’t be moved." | refusal |
| details (press, or Enter on an unmoved event) | the popover rises from the event; focus returns to it on close | the popover's |
| new days (‹ ›, Today, a view) | the title turns on the drum; on days with today the grid scrolls so now is a third down | the drum |

Reduce Motion: no lift scale, no glides, the title crossfades; the hand is still followed. The clock that moves the now line runs once a minute and only while the calendar is on screen and the tab visible (`useAwake`).

## API

| React `EventCalendar` | SwiftUI `MetalEventCalendar` |
|---|---|
| `events: CalendarEvent[]` (`id`, `title`, `start`, `end`, `allDay`, `color`, `disabled`; generic over your own fields) | `events: Binding<[MetalCalendarEvent]>` |
| `onEventsChange(next)`: once when a move lands, and `previous` on a rollback | the binding |
| `onEventsCommit(next, previous)`: return a promise; reject to roll back | `onCommit: ([Event], [Event]) async throws -> Void` |
| `view` / `defaultView` / `onViewChange`, `views` (`'month' \| 'week' \| 'day' \| 'days'`) | `view: Binding<MetalEventCalendarView>` (month, week, day) |
| `date` / `defaultDate` / `onDateChange`: a day in what is shown | `date: Binding<Date>` |
| `days` (3): how many `view="days"` shows | – |
| `weekends` (true), `offDays(date)` | – |
| `dayStart` (7), `dayEnd` (21), `snap` (15 minutes) | `dayStart:`, `dayEnd:`, `snap:` |
| `weekStartsOn`, `locale` | the environment's `Calendar` and `Locale` |
| `now`: fixes the now line and Today | `now:` |
| `maxEvents` (3): rows a month day shows | `maxEvents:` |
| `readOnly` | `readOnly:` |
| `renderEvent(event, { start, end, compact })`: what is inside the chip | – |
| `renderDetails(event)`: under the details' title and time | `onOpen(event)`: the host shows its own sheet |
| `words`: every word it says or shows (English by default) | – |

An all-day event's `start` and `end` are its first and last days, both included; a timed event's `end` is when it ends.

```tsx
const toast = useToast(); // under a ToastProvider
const [events, setEvents] = React.useState<CalendarEvent[]>(initial);
<EventCalendar
  aria-label="Studio calendar"
  events={events}
  onEventsChange={setEvents}
  onEventsCommit={async (next) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // throwing rolls back
  }}
  dayStart={8}
  dayEnd={19}
  renderDetails={(event) => <EventEditor event={event} />}
/>
```

## Accessibility

- The calendar is a `group` named by `aria-label` (or its title). Each event is a `button` named with its title, day and time ("Design review, Tuesday 6 October, 10:00–11:00"), `aria-haspopup="dialog"` for its details, and `aria-keyshortcuts` for the moves.
- Moves and failures are said in a polite live region: the steps are frequent and nothing is lost by waiting.
- Colour is never the only thing: the stripe is the person's calendar, the title and time are always words. Today and now use the green LED (live) with the date as a word.
- Day heads, month dates and "+N more" are buttons that open the day.

## Rules

- Hold the events in state and pass `onEventsChange`; without it the calendar can't move anything you can see.
- Throw from `onEventsCommit` to roll back; say why in your toast. A save happens once per move, not per snap step.
- `color` is the person's (a calendar's colour): never green, amber, red or blue to mean live, waiting, failed or a link.
- Give the calendar a height (`className="h-[560px]"`) in week and day views so the hours scroll inside it.
- Touch: an event takes the touch (`touch-action: none`), so a swipe that starts on one moves it; swipe the empty grid to scroll.

## SwiftUI

`MetalEventCalendar(events: $events, view: $view, date: $date, dayStart:, dayEnd:, snap:, now:, maxEvents:, readOnly:, onOpen:, onCommit:)`: the same head (steps, Today, the title, a segmented view picker), the month with bars and "+N more", and the days by hours with the all-day lane, the now line on a `TimelineView` paused off screen, events that share their day, drag to move (hours and days) and the lower edge to resize, both by the snap with the alignment haptic on macOS; keys on macOS (arrows by the snap and a day, Shift for the end, Return keeps, Escape puts back); VoiceOver actions "Later", "Earlier", "Next day", "Previous day", "Longer", "Shorter". Gaps: no details popover (`onOpen` hands the event to the host), month chips and bars don't drag, `views` other than month, week and day, no off days or weekends switch, and right to left is SwiftUI's own mirroring, unchecked.
