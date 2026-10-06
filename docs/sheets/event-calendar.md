# Variation sheet: Event calendar

From "Components other libraries ship that we don't" § 5: "Event calendar: month, week, day, N days, agenda, and a resource time grid; all-day bars across days; custom event chips; drag to move, resize and create; tooltips; weekends, week numbers, now line, off days; day start and end hours, grid interval, snap; week start; time zones; right-to-left. See 'Marked days' in the Calendar entry."

Now: `Calendar` chooses days and marks them (`marks`: a dot or LED for a day with something on it), with the date arithmetic, `weekStartOf(locale)`, localised digits and right to left. `Timeline` lists what happened in order. `Kanban` moves the person's things between places with a commit that rolls back. Nothing lays the person's time out on a grid you can move things in.

How this was made: FullCalendar (views, all-day lane, `slotDuration` / `snapDuration`, `eventDrop` with `revert()`), Schedule-X, react-big-calendar, Google Calendar, Apple Calendar and Outlook were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Where it sits (docs/COMPOSITION.md)

- **The calendar is a Place.** It has area (days by hours), it holds the person's things (events) and you go into it to work; it isn't a control that changes something else (Component fails: `Calendar`, which chooses a day, is the component), and it stays when you let go (Instrument fails). Its siblings are Kanban and Region.
- **An event is an Object**, drawn by the place as a chip: a small raised plate (`raise-sm`) with its time and title, and the person's own colour on its leading edge when the host gives one (a swatch, data, never an LED meaning). `renderEvent` replaces what is inside the chip, so a host's own content needs no fork.
- **The drag is the place's own instrument.** Sortable orders lists; a time grid is two-dimensional and continuous with a snap, so it doesn't fit `useSortable`. It takes Sortable's lift look (its `lift.scale`, the raised plate fading in), the rows' glide (`useRowMotion`) for everything that moves, `haptic('detent')` on each snap step and `refuse` for an event that can't move.
- **Details are a Popover** anchored to the chip; the host's editor goes inside it.

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **See a month** (everyone) | Six weeks of days, always six (the height never jumps, as Calendar). Each day lists its events as one-line chips ("10:00 Design review"); events over several days and all-day events run as bars across the days, round at their true ends and nearly square where they run on to the next week (Calendar's range band). | Must |
| **A busy day in a month** (Google "+2 more") | At most `maxEvents` (3) rows a day; the rest is "+2 more", which opens that day in the day view. The day's number does the same. | Must |
| **See a week, hour by hour** (everyone) | Seven day columns under a head (weekday and date, today with Calendar's green lamp), an all-day lane, and hours down the side in a grid that scrolls on its own. Timed events stand at their time and length; events that overlap share the column side by side. | Must |
| **See one day** (everyone) | The same grid with one column. | Must |
| **A few days** (FullCalendar `timeGridFourDay`, Google "4 days") | `view="days"` with `days={3}`: the same grid from the shown date. Free once the grid takes any run of days. | Should |
| **Leave out the weekend** (Outlook "Work week") | `weekends={false}` drops Saturday and Sunday from the week and the month. | Should |
| **Days off** (FullCalendar `businessHours`, holidays) | `offDays(date)`: the day is quiet (the well's track instead of its field) and still takes events, so the host can say why. | Should |
| **Where am I in the day** (everyone's now line) | A hairline across today at the current minute with a small lamp at its start, green because now is live (the LED's meaning). It moves once a minute, only while the calendar is on screen and the tab visible (`useAwake`); `now` fixes it. On mount the grid scrolls so now is a third down. | Must |
| **The working day** (FullCalendar `slotMinTime` / `slotMaxTime`) | `dayStart` and `dayEnd` hours (7 and 21 by default); the rest of the day isn't drawn. | Must |
| **The grid's step and the snap** (FullCalendar `slotDuration`, `snapDuration`) | Lines every hour, fainter every half hour; `snap` minutes (15) for every move and resize, by hand or by keys. Each snap step is a detent: the haptic where the platform has one. | Must |
| **Week start** (locales) | `weekStartsOn`, over the locale's first day (`weekStartOf`, Calendar's). | Must |
| **Move an event** (everyone) | Press and move (4 px): the chip rises (Sortable's lift) and follows the hand in snap steps, to another hour or another day; the others in its day make room side by side and glide. Release: it lands where it shows. All-day and multi-day bars move by whole days in their lane, month chips from day to day; the time of day stays. | Must |
| **Change how long** (everyone) | A grip on the chip's lower edge (the ends' cursor); drag it in snap steps, never shorter than one snap, never past the day's end. | Must |
| **Save, and undo a failed save** (Kanban, FullCalendar `revert`) | `onEventsChange(next)` on a drop that changed anything, then `onEventsCommit(next, previous)`: return a promise and the calendar is `aria-busy` while it is out (nothing lifts); a rejection gives `previous` back and every chip glides home, said aloud. The host's toast says why. | Must |
| **Change your mind** | Escape during a drag puts it back. | Must |
| **Without a pointer** (WCAG 2.1.1) | Each event is a button named with its title, day and time. Up and Down move it by the snap, Left and Right by a day (mirrored right to left), Shift with Up and Down changes its end; each step is said politely ("Design review, Tuesday 6 October, 10:15 to 11:15"). Enter keeps it (one commit), Escape puts it back, leaving the event keeps it too. Enter on an event you haven't moved opens its details. | Must |
| **Read an event's details** (Google's card, tooltips) | Press an event: a Popover from the chip with its title, its day and time in words, and `renderDetails(event)` (the host's editor, actions). Covers the tooltip: the full title and time are in the chip's name and in the popover. | Must |
| **The person's own colours** (Google calendars, Apple calendar colours) | `color` on an event: a stripe on the chip's leading edge and the dot in its details. Data, not state: it never stands for live, waiting or failed. | Must |
| **Custom chips** (react-big-calendar `components.event`) | `renderEvent(event, { start, end, compact })` for what is inside the chip; the plate, drag and name stay ours. | Must |
| **An event that can't move** (a shared or past event) | `disabled` on an event, or `readOnly` on the calendar: it doesn't lift; trying shakes it once (refusal) and says why. | Must |
| **Move through time** (everyone) | ‹ › step a month, a week or a day; Today; the title (Intl, the locale's words and digits) turns on the drum. `date` / `onDateChange` and `view` / `onViewChange`, or uncontrolled. The view is a Switcher (Month, Week, Day). | Must |
| **Other languages, right to left** (Calendar) | Names, times and digits from `Intl` in `locale` (12 or 24 hours as the locale says); under `dir="rtl"` the days run right to left, the steps' chevrons point outward and Left is the next day. | Must |
| **Reduce Motion** | Following the hand stays (direct manipulation); no lift scale, no glides, the title crossfades. | Must |
| **Create by dragging an empty stretch** (Google, FullCalendar `select`) | Press an empty stretch and drag: a recess (the well's track) shows the new event's time; release calls `onCreate({ start, end })` and the host adds it. | Should |
| **Resize the start, or across days** (Google) | A second grip on the top edge; a timed event across midnight. | Later |
| **Between all-day and timed** (Google) | Dragging a bar into the grid makes it timed. Changes the event's kind mid-drag; worth it once creating lands. | Later |
| **Week numbers** (Outlook) | ISO numbers before each month week and in the week's title. | Later |
| **Agenda** (Google "Schedule") | A list of days and their events. `Timeline` with day groups does this job once it has them (its Later). | Later |
| **A resource time grid** (FullCalendar Scheduler: rooms, people as columns) | Columns are people, not days. A second axis; build it when a host needs it. | Later |
| **Time zones** (Google's second zone) | Events are the host's `Date`s in the reader's zone; a second gutter for another zone. | Later |
| **Recurring events** | The host expands a rule into events; editing "this or all" is the host's question. | Dropped |
| **An event editor** (title, guests, rooms) | The host's, inside `renderDetails`. | Dropped |
| **Tooltips** | Covered by the details popover and the chip's name: a tooltip would repeat the same words on hover. | Dropped |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| lift | the chip grows to Sortable's `lift.scale` and its raised plate fades in | surface |
| move, resize | the chip steps by the snap (a detent each step); the others in its day re-share the width and glide | settle |
| drop | the plate fades; the chip is where it shows | release |
| cancel, rollback | every chip glides from where it is back to where it was | settle |
| refuse | the chip shakes once | refusal |
| title | the words turn on the drum | the drum |
| details | the popover rises from the chip | the popover's |

## Decide

- **Layer?** A Place: area, holds the person's things; events are Objects; the drag is its own instrument with Sortable's look.
- **Sortable's drag, or its own?** Its own. Sortable's model is an order of keys; a time grid has a position in two continuous axes with a snap. What it shares is the look (lift scale and plate from the sortable recipe), the rows' glide and the haptics.
- **Live changes or a draft?** A draft. While a hand or keys move an event, the calendar holds the change itself; the host hears `onEventsChange` and `onEventsCommit` once, when it lands. A calendar backed by a server wants one save per move, not one per snap.
- **When do keys commit?** On Enter, or when focus leaves the event: a few arrows are one move. Escape puts it back. Said politely: the steps are frequent and nothing is lost by waiting.
- **What goes in the all-day lane?** All-day events and anything that crosses midnight. A timed event over two days drawn in two columns needs a resize across days (Later); as a bar it reads, and moves, correctly.
- **A colour per event?** Yes, as data: the person's colour on the leading edge, like a swatch. Never green, amber, red or blue meaning a state: the host chooses the colours and the docs use the swatch palette.
- **Month overflow?** "+N more" opens that day's view rather than a popover of more chips: the day view already is the full list, at full size, and it's one fewer surface.
- **Swift?** `MetalEventCalendar` with a binding of `MetalCalendarEvent`s, the three views, the now line, the snap, drag to move and resize in the grid, the keys on macOS and `onCommit(next, previous)` with rollback. Gaps: no details popover (the host gets `onOpen` and shows its own), month chips don't drag, no right-to-left check (SwiftUI mirrors on its own, unverified).

## Tiers

**Must**: month, week and day views; all-day and multi-day bars; chips with time, title, colour and `renderEvent`; "+N more"; drag to move (grid, lane, month) and resize (grid) with the snap and a detent per step; Escape; keys that move and resize, said politely, committed on Enter or leaving; `onEventsChange` / `onEventsCommit(next, previous)` with rollback and busy; details Popover with `renderDetails`; disabled and read-only; now line on an awake clock; `dayStart`/`dayEnd`, `snap`, `weekStartsOn`, `locale`, right to left; navigation and the view Switcher; Reduce Motion; SwiftUI `MetalEventCalendar`.

**Should**: N days, no weekends, off days (built with Must: the grid takes any run of days); drag to create.

**Later**: resize the start and across days; all-day ⇄ timed; week numbers; agenda (via Timeline); resource grid; time zones; a roving tab stop across events; SwiftUI month drag and details.
