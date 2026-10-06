# Calendar and date picker

A month to choose a day from (or a range, several days, a month, quarter, half year or year), and a field to type a date into or open one from. React: `Calendar` and `DatePicker` from `@unlocalhosted/metalui` (a table grid following the ARIA date-grid pattern; the picker is the library's `Field` with its calendar in the `Popover`). SwiftUI: `MetalCalendar` and `MetalDatePicker`. Chosen units take the `switcher` thumb look and hovered ones its track; the title turns on the swap drum; the `calendar` recipe adds the grid, the stretched range, today's lamp, marks and the arrivals.

## Use it for

- Choosing a day where the weekday or nearby dates matter: a due date, a trip, a booking.
- A stay or a report period: `mode="range"`, often with `months={2}`.
- Shoot days, rota days: `mode="multiple"`.
- A reporting month, quarter, half or year: `period`.
- `DatePicker` in a form, where people may know the date and want to type it.

## Don't use it for

- A time alone: `TimePicker`. A day and a time: `DatePicker` `time`.
- An operator filter ("before", "between"): that is a separate date selector built on this.

## Anatomy

- Head: previous and next keys (compact caps, the set's chevron), the title between. The title is a key with a small chevron when there is a level above (days → months → years).
- Grid: weekday initials (meta type, ink3), then six rows of 32 days, 2 apart, radius 10. Week numbers (ink3) lead each row with `weekNumbers`. Larger units fill the same footprint (3 × 4 months, 2 × 2 quarters, 2 halves, 3 × 4 years).
- Today: a 4 green lamp under the number. A mark: a 4 dot beside it (ink2, or the amber / red LED).
- Range: one raised thumb per week the range covers, radius 10 at its true ends, 3 where it runs on.
- Picker: the field's regular (32) or compact (28) well; the trail holds the clear key and the calendar key. Under it, the form field's readback. The plate: presets (menu rows) beside the calendar; Today under it.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | the unit sinks a touch (the switcher's track) | – |
| chosen | the switcher's raised thumb look | lands into it on the part spring (from 0.9) |
| range, first end | that unit raised; the stretch to the pointer (or the keys) sunken | the first end lands; the preview follows the pointer at once |
| range, whole | one raised thumb across each week, flat-ish where it runs on | settles in on the part spring (fading from 0.6, from 0.85 tall) |
| out of reach | while choosing the second end, units outside `minDays` / `maxDays` at 40 %, disabled | – |
| several | each chosen unit its own thumb; pressing again lets it go | lands |
| later page | title turns up; the grid comes from the right | drum and settle spring, fading in |
| earlier page | title turns down; the grid comes from the left | the same, mirrored |
| level up (title) | the months of the year, or the years; where you were stands raised | comes in from 1.06 on the settle spring, fading in |
| level down | back to the unit chosen (or where you were, with Esc) | comes in from 0.94 |
| focus | the green ring on the unit | – |
| marked | a dot beside the number, said as the unit's description | – |
| unavailable | `isDateUnavailable` days in ink3, described "Unavailable"; still focusable and choosable | – |
| out of range | before `min` or after `max` at 40 %, disabled; the steps stop | – |
| picker typing | the readback says what was understood ("Wed, 7 Oct 2026") | the drum; the row opens like an error's |
| picker left | understood: written in the reader's words. Not: the invalid ring, and the input's validity message | – |
| picker dial | ↑ ↓ step the part under the caret and select it | the field's |
| picker chosen | the popover closes; focus returns to the field | the popover's |

Reduce Motion: the grid arrives, the choice and the range land at once; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `Calendar` `value`, `defaultValue`, `onValueChange`: a `Date` (single), `{ start, end }` (`mode="range"`; `end` null until the second press), `Date[]` (`mode="multiple"`) | `MetalCalendar(_:selection:)` with `Date?`, `MetalDateRange?` or `Set<Date>` |
| `period`: `day`, `month`, `quarter`, `half`, `year` (values are the unit's first day; a range's end its last day) | `period:` |
| `minDays`, `maxDays` (range, in the period's units, both ends counted) | `minDays:`, `maxDays:` |
| `month`, `onMonthChange` (controlled), `defaultMonth` | `month:` binding |
| `months` (pages side by side) | `months:` |
| `min`, `max` | `in:` |
| `isDateUnavailable(date)` | `isUnavailable:` |
| `marks(date)` → `{ label, tone?: 'amber' \| 'red' }` | `marks:` → `MetalDayMark?` |
| `weekStartsOn`, `weekNumbers`, `locale` | `weekStartsOn:`, `weekNumbers:`, the environment's locale |
| `DatePicker` the options above plus `mode` (single, range), `presets`, `today`, `time` (single: a time field beside the date, `true` or the time picker's options), `placeholder`, `format`, `size`, `required`, `name`, `readOnly`, `disabled`, `invalid`, `readback`, `aria-label` | `MetalDatePicker(_:selection:)` |

`DatePicker`'s `onValueChange` hears `null` when the field is cleared. `name` sends ISO 8601 in a hidden input (`2026-10-07`, `2026-10-01/2026-10-07`, or `2026-10-07T14:30` with `time`).

With `time`, the value's hours and minutes are the time field's: a picked or typed day keeps them, a time typed before there is a day waits for it, and a cleared time is the day's start. The time field is named "Time" (in its own field root, so a FormField's label names the date). SwiftUI: `MetalDatePicker(_:selection:time:timeStep:)`.

## Keyboard and accessibility

- A `grid` named by its page ("September 2026", "2026", "2020 – 2029"). One unit is in the tab order; arrows move by unit and row, Page Up / Down by page (with Shift, by year), Home / End to the row's ends, Enter or Space chooses. Days are named in full ("Wednesday, 30 September 2026"), quarters with their months ("Q3 2026, July to September"); today says `aria-current="date"`; chosen units (and every day of a whole range) are `aria-selected`; range and several grids are `aria-multiselectable`.
- The title key says what it opens ("September 2026, choose a month"); Esc in a level above goes back down without leaving a popover.
- Marks and "Unavailable" are the unit's description. Week numbers are row headers ("Week 40").
- The picker's input is the control (a FormField labels it and shows its errors); the calendar key is "Choose a day" ("Choose dates" for a range); Alt ↓ opens it from the input; closing returns focus to the input.

## Rules

- The week starts where the reader's locale starts it, unless the host has a reason (`weekStartsOn`).
- Say the range: disable what can't be chosen rather than refusing it after; a typed day outside is refused with the range in words.
- Only what is chosen stands raised; a preview sinks.
- Every level keeps the footprint: six rows of days, and the same box for months and years.
