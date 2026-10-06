# Time picker

A time of day you type, step or choose from slots: a meeting's start, opening hours, a reminder, a booking. From "Components other libraries ship that we don't" § 2 and the "Time" note in the Calendar entry of `docs/BACKLOG.md`. Made the way the variation sheets there are: ReUI's time picker, shadcn's time input, React Aria's `TimeField`, Base UI, Apple's HIG date pickers, Google Calendar's start and end lists, Calendly's slots and Things' reminders were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## Where it sits

A **Component** (`docs/COMPOSITION.md`): you operate it to set a value, and it is the same in any app. It is the time sibling of `DatePicker` and lives beside it in the calendar folder's family, in its own folder (`time-picker`).

It is composed, like DatePicker: the well is `Field` (the clear key, a clock key, a suffix for the zone), the reading is `FormField.Readback` on the drum, the plate is `Popover`, the slots are `RadioKeys` / `RadioKey` (the Toggle's latch and lamp, as the Availability picker's times are), and Now is a compact `Button`. Its own recipe holds only sizes: the field's minimum width, the slot grid's columns and height.

## Jobs

| Job (where it comes from) | Our form | Tier |
|---|---|---|
| Type a time (React Aria `TimeField`, shadcn `type="time"`) | a typed `Field`, as DatePicker is: "14:30", "1430", "930", "9", "2.30pm", "230p", "14h30" are all read; leaving writes it in the reader's words ("14:30", "2:30 PM") | Must |
| Know what was understood (*ours*, DatePicker's readback) | `FormField.Readback` under the field says the time with its part of the day, "2:30 in the afternoon", "2:30 at night": typing "230" in a 24-hour field you see at once whether you got 02:30 or 14:30 | Must |
| Step a part (React Aria segments, HIG stepper) | ↑ ↓ step the part under the caret and select it, DatePicker's dial: the hour by one, the minute to the next or last `step` (10:07 ↑ is 10:15), the second by one, AM/PM flips | Must |
| Choose from a list (ReUI popover, Google Calendar, Calendly) | the clock key (or Alt ↓) opens a plate of slot keys, `RadioKeys`, one latched with its lamp lit; four to a row, so at 15 minutes each row is an hour; it opens scrolled to the chosen time (or now) with focus on it. A press chooses and closes; arrows move the latch (the field follows), Enter or Space closes | Must |
| A wheel of hours and minutes (HIG wheels, iOS) | dropped: a wheel needs a flick to feel right and is slow with a mouse; the slots and the dial do both of its jobs | dropped |
| 12 or 24 hour (everyone) | the reader's locale decides; `hourCycle` 12 or 24 overrides it for a product that has a house style | Must |
| AM/PM before or after (ReUI) | the locale's order (Korean and Chinese put it first) | covered by the locale; no prop |
| Hour, minute or second (React Aria `granularity`) | `granularity` hour / minute (the default) / second; the value keeps the same precision | Must |
| Every 15 minutes (ReUI, Google Calendar) | `step` in minutes (default 15; 60 for hours): the slots and the minute dial follow it; a typed 10:07 is still kept (real times aren't on a grid) | Must |
| Opening hours (ReUI `min` / `max`) | `min` / `max` ("09:00", "17:30"): the slots run only between them; a typed time outside is refused in words ("Choose a time from 09:00 to 17:30"), the dial stops at the ends | Must |
| Hours past midnight (*ours*: a night shift, a bar) | `min` after `max` ("22:00" to "02:00") is one window across midnight: the slots run 22:00 … 23:45, 00:00 … 02:00 | Should |
| Unavailable slots (ReUI, Calendar's `isDateUnavailable`) | `isTimeUnavailable(time)`: the slot in ink3, described "Unavailable", still choosable, exactly Calendar's rule; what can't be chosen at all is outside `min` / `max` | Must |
| A start and an end (Google Calendar, ReUI range) | two pickers joined by a dash; the end's `from` (the start) makes its slots begin at the start and say how long each would be ("30 min", "1 h 30"); moving the start keeps the length (the host's job, documented, on the page) | Should |
| A time zone (ReUI label) | `timeZone`: the zone's short name ("WEST", "GMT-4") engraved as the field's suffix and said with the input; the value stays wall time in that zone. Converting between zones is the host's (the Availability picker does it) | Must |
| Now | a Now key under the slots, as Today is under the calendar; disabled outside `min` / `max` | Must |
| Clear | the field's clear key | Must |
| Confirm before applying (ReUI) | dropped: one press on a slot is the choice and the plate closes; there is no half-set wheel to commit. Esc closes without changing anything | dropped |
| Localised labels | the times are the locale's (Intl); the words "Now", "Choose a time" follow the library's English, as Calendar's do | covered |
| In a form (everyone) | `name` sends the time as ISO 8601 (`14:30`, `14:30:05`, the same as `<input type="time">`) in a hidden input; `required`, `readOnly`, `disabled`, `invalid`; the input's own validity carries the message, so `FormField.Error` says it and a form won't submit | Must |
| A date and a time together (Calendar's "Time" note) | `DatePicker` takes `time` (`true` or the time options): a time field beside the date field, one `Date` value; a typed date or a picked day keeps the time; `name` sends `2026-10-07T14:30` | Must |
| Sizes | regular 32 and compact 28, the date picker's (the form sizes of the field ladder) | Must |
| Scrub a part with the pointer (*ours*, Number field's label scrub, the "4pm scrubs" cue) | drag up or down on the clock key to turn the minute by steps | Later (the inline time cue does it first) |

Not doing: a wheel or a clock face (above); a Confirm key (above); AM/PM placement as a prop (the locale knows); a separate `TimeRangePicker` (two pickers and `from` do it, and a range field would need its own parsing for what two fields already give).

## Must

- [x] `TimePicker` with `value` / `defaultValue` / `onValueChange` (an ISO time string or null), `step`, `min`, `max`, `isTimeUnavailable`, `hourCycle`, `granularity`, `timeZone`, `locale`, `size`, `placeholder`, `required`, `name`, `readOnly`, `disabled`, `invalid`, `readback`, `now`, `aria-label`, `id`.
- [x] Typed entry with the readback; ↑ ↓ per part; leaving writes the reader's words; refused words and times outside the window as the input's validity.
- [x] The slot plate on `RadioKeys`, scrolled to and focused on the chosen time, Now under it.
- [x] The zone as the suffix.
- [x] `DatePicker` `time`.
- [x] SwiftUI `MetalTimePicker` (typed, read back, the slot plate with Now, `step`, bounds, unavailable, zone), and `MetalDatePicker` with `time`.
- [x] The `time-picker` recipe, agent guide, `meta.json`, a page with a DialKit panel, an e2e slice.

## Should

- [x] A window across midnight.
- [x] A start and an end: `from`, and slots that say their length.
- Done (2026-10-06): Must and Should. The slots sit in their own Base UI field root (inside a FormField they took its label and validity); they still carry the form field's description. Like DatePicker, the readback needs a FormField around it (or `readback={false}`). With DatePicker `time`, a cleared time is the day's start (the value is a `Date`). SwiftUI: the slots are button caps held down in the pressed look with the lamp (no latch travel); no ↑ ↓ on a part.

## Later

- [ ] Scrub a part with the pointer (after the inline time cue).
- [ ] SwiftUI: the arrows on a part (no caret position in a SwiftUI `TextField`).
- [ ] Converting a time between zones in the picker.

## Decide

- What is the value: a `Date`, an object, or a string? **An ISO 8601 time string** ("14:30", "14:30:05"). A time of day has no date or zone; a `Date` would carry both and shift across DST and zones. The string is what `<input type="time">` and a form send, compares in order as text, and is what a host writes in JSON. DatePicker's `time` keeps its `Date`, which has a day.
- Slots: a `RadioKeys` grid or a listbox? **RadioKeys**: the look is already the library's for times (the Availability picker), the latch says which one is chosen, and the lamp says it without colour alone. Arrows move the latch (radio semantics), so the plate closes on a press, Enter or Space, not on an arrow.
- Unavailable: refused or quiet? **Quiet and choosable**, Calendar's rule, so the two pickers agree; `min` / `max` are the times that can't be chosen. A host that must refuse a booked slot validates it (the readback and `invalid` say why).
- Does the minute dial snap to `step`? **Yes**: an arrow lands on a slot (10:07 ↑ is 10:15), because the slots are what the product offers. Typing is free.
- An hour typed without AM/PM in a 12-hour field? **The working day**: 7 to 11 are morning, 12 to 6 afternoon; if only one of the two lies inside `min` / `max`, that one. The readback says which, so a wrong guess is seen before it is kept.
- Date and time: one field or two? **Two wells side by side** in one value. Each parses what it knows (a combined parser would fight dates written with dots, "7.10.2026 14.30"), Tab goes from one to the other, and each keeps its own plate. A time typed before the day waits for the day.
- Where does the zone go? **The suffix**, engraved in ink3 like a unit: it says how to read the value, it isn't part of it.
