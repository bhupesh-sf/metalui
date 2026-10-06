# Calendar, date picker and date selector

A month to choose a day from (or a range, several days, a month, quarter, half year or year), a field to type a date into or open one from, and a date condition (is, before, after, between) chosen and applied. React: `Calendar`, `DatePicker` and `DateSelector` from `@unlocalhosted/metalui` (a table grid following the ARIA date-grid pattern; the picker is the library's `Field` with its calendar in the `Popover`; the selector is a `Button` opening a `Popover` or `Dialog` with a `Switcher` of operators over the calendar). SwiftUI: `MetalCalendar`, `MetalDatePicker` and `MetalDateSelector`. Chosen units take the `switcher` thumb look and hovered ones its track; the title turns on the swap drum; the `calendar` recipe adds the grid, the stretched range, today's lamp, marks and the arrivals.

## Use it for

- Choosing a day where the weekday or nearby dates matter: a due date, a trip, a booking.
- A stay or a report period: `mode="range"`, often with `months={2}`.
- Shoot days, rota days: `mode="multiple"`.
- A reporting month, quarter, half or year: `period`.
- `DatePicker` in a form, where people may know the date and want to type it.
- `DateSelector` for a condition on a date outside a filter row: a report's "Created", a search form, a saved view ("Due before 6 Oct 2026").

## Don't use it for

- A time alone: `TimePicker`. A day and a time: `DatePicker` `time`.
- A date condition in a row of filters: `Filters`' date field (its token holds the operator).
- A value someone may type: `DatePicker` (`mode="range"` for between).

## Anatomy

- Head: previous and next keys (compact caps, the set's chevron), the title between. The title is a key with a small chevron when there is a level above (days → months → years).
- Grid: weekday initials (meta type, ink3), then six rows of 32 days, 2 apart, radius 10. Week numbers (ink3) lead each row with `weekNumbers`. Larger units fill the same footprint (3 × 4 months, 2 × 2 quarters, 2 halves, 3 × 4 years).
- Today: a 4 green lamp under the number. A mark: a 4 dot beside it (ink2, or the amber / red LED).
- Range: one raised thumb per week the range covers, radius 10 at its true ends, 3 where it runs on.
- Several months: pages 16 apart, the steps on the outer ends. In a container narrower than all of them (the nearest `@container`; 504 for two, 572 with week numbers) one page shows, with both steps on it.
- Selector: the key is the button's cap (regular 32 or compact 28) with the calendar glyph and the condition as a sentence ("Due before 7 Oct 2026", or "Due: any date"). The panel (a popover plate, or a dialog titled by the label) is 504 wide or what the popover's room or the dialog leaves, and is the calendar's container: the operator switcher, the months (two by default), the draft in words (meta, ink2, centred), then Clear (once there is a value), Cancel and Apply (primary), compact, at the end.
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
| narrow | months side by side show one, both steps on it; the keys turn the page rather than walk into a hidden month | – |
| right to left | weeks run from the right; the chevrons point outward; ← is the next day; a later month comes from the left | the arrival mirrored |
| selector open | the draft starts from the value; focus on the chosen day (or today) | the popover's or the dialog's |
| selector operator | the switcher's thumb; the day carries across (is 7 Oct → between 7 Oct; between → its start) | the switcher's glide |
| selector draft | only the words at the foot change; Apply off until the draft is whole and differs from the value | – |
| selector applied | closes; the key says the new condition; focus returns to the key | the popover's or the dialog's |
| selector thrown away | Cancel, Esc or a click outside: closes, the value stays | the same |

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
| `DateSelector` `value`, `defaultValue`, `onValueChange`: `{ op: 'is' \| 'before' \| 'after', value: Date }`, `{ op: 'between', value: { start, end } }` or `null` (cleared); hears only Apply and Clear | `MetalDateSelector(_:selection:)` with `MetalDateCondition?` |
| `operators` (default all four, in order; one hides the switcher), `label`, `placeholder` ("Any date"), `presentation` (`popover`, `dialog`), `months` (2), `size`, `name` (sends `before:2026-10-06` or `between:2026-10-01/2026-10-07`), `disabled`, and the calendar's `period`, `min`, `max`, `isDateUnavailable`, `marks`, `locale`, `weekStartsOn` | `operators:`, `presentation:` (`.popover`, `.sheet`), `period:`, `in:` |
| `matchesDate(condition, date, period?)`: whole days in local time; before a unit is before its first day, after it after its last | `MetalDateCondition.matches(_:period:)` |
| `DatePicker` the options above plus `mode` (single, range), `presets`, `today`, `time` (single: a time field beside the date, `true` or the time picker's options), `placeholder`, `format`, `size`, `required`, `name`, `readOnly`, `disabled`, `invalid`, `readback`, `aria-label` | `MetalDatePicker(_:selection:)` |

`DatePicker`'s `onValueChange` hears `null` when the field is cleared. `name` sends ISO 8601 in a hidden input (`2026-10-07`, `2026-10-01/2026-10-07`, or `2026-10-07T14:30` with `time`).

With `time`, the value's hours and minutes are the time field's: a picked or typed day keeps them, a time typed before there is a day waits for it, and a cleared time is the day's start. The time field is named "Time" (in its own field root, so a FormField's label names the date). SwiftUI: `MetalDatePicker(_:selection:time:timeStep:)`.

## Keyboard and accessibility

- A `grid` named by its page ("September 2026", "2026", "2020 – 2029"). One unit is in the tab order; arrows move by unit and row, Page Up / Down by page (with Shift, by year), Home / End to the row's ends, Enter or Space chooses. Days are named in full ("Wednesday, 30 September 2026"), quarters with their months ("Q3 2026, July to September"); today says `aria-current="date"`; chosen units (and every day of a whole range) are `aria-selected`; range and several grids are `aria-multiselectable`.
- The title key says what it opens ("September 2026, choose a month"); Esc in a level above goes back down without leaving a popover.
- Marks and "Unavailable" are the unit's description. Week numbers are row headers ("Week 40").
- The selector's key is a button that says the condition; its panel is a dialog named by the label (or "Date"). The switcher is a radio group named "Operator"; the calendar is named by the label and operator ("Due before"); the draft's words are a polite live region. Apply, Cancel and Clear are plain buttons; closing returns focus to the key.
- Right to left (`dir="rtl"` anywhere above): ← → follow the reading direction. Numbers (days, week numbers) are in the locale's digits.
- The picker's input is the control (a FormField labels it and shows its errors); the calendar key is "Choose a day" ("Choose dates" for a range); Alt ↓ opens it from the input; closing returns focus to the input.

## Rules

- A condition waits for Apply: what it filters doesn't move while the draft is half a range.
- Months side by side answer to their container, not the viewport: give the calendar's holder `container-type: inline-size` (a block, a panel) and two months fall back to one where they don't fit.
- Dates are said by `Intl` in `locale`; "Q3", "H1" and the library's own words are English.

- The week starts where the reader's locale starts it, unless the host has a reason (`weekStartsOn`).
- Say the range: disable what can't be chosen rather than refusing it after; a typed day outside is refused with the range in words.
- Only what is chosen stands raised; a preview sinks.
- Every level keeps the footprint: six rows of days, and the same box for months and years.
