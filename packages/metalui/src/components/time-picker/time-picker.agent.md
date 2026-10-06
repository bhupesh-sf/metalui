# Time picker

A time of day you type, dial or choose from slots; the date picker's sibling. React: `TimePicker` from `@unlocalhosted/metalui` (the library's `Field`, `FormField.Readback`, `Popover`, and `RadioKeys` / `RadioKey` for the slots); `DatePicker` takes a time with `time`. SwiftUI: `MetalTimePicker`. The `time-picker` recipe holds the field's width and the slot grid; everything it draws comes from those parts.

## Use it for

- A time in a form: a meeting's start, a reminder, a delivery window, opening hours.
- A time offered in slots: every 15 or 30 minutes inside the hours you keep, some booked.
- A start and an end: two pickers and a dash, the end with `from`.
- A day and a time: `DatePicker` `time`.

## Don't use it for

- Someone else's free time across days: that is the Availability picker block (days, zones, Confirm).
- A length of time ("1 h 30"): that is a Number field with a unit.
- Converting between zones: the picker keeps wall time; the host converts.

## Anatomy

- The field's well, regular (32) or compact (28): the time in the reader's words ("14:30", "2:30 PM"), or the hint ("hh:mm"); a zone engraved as the suffix ("WEST"); the trail holds the clear key and the clock key. Minimum width 136 (160 with seconds).
- Under it, the form field's readback: the typed time with its part of the day ("2:30 in the afternoon").
- The plate: slot keys (the toggle's latching cap with its lamp), four to a row (two when they say their length), six and a half rows tall so the cut row says it scrolls; Now under them, a compact cap.

## States and motion

| State | Look | Motion |
|---|---|---|
| typing | the readback says what was understood, with its part of the day | the drum; the row opens like an error's |
| left | understood: written in the reader's words. Not, or outside min / max: the invalid ring, and the input's validity message | – |
| dial | ↑ ↓ step the part under the caret and select it | – |
| open | the slots, scrolled to the chosen one (or the one nearest now), focus on it | the popover's |
| chosen | its key latched, the lamp lit | the toggle's latch on the part spring |
| quiet | `isTimeUnavailable` slots in ink3, described "Unavailable"; still choosable | – |
| end of a pair | slots after `from`, each with its length in ink3 ("1 h 30") | – |
| disabled | the field's 40 %; the clock key is disabled | – |

Reduce Motion: the field's, the popover's and the keys' own (the latch snaps, the drum crossfades).

## API

| React | SwiftUI |
|---|---|
| `value`, `defaultValue`, `onValueChange`: an ISO 8601 time (`"14:30"`, `"14:30:05"`) or null | `MetalTimePicker(_:selection:)` with `String?` |
| `step` (minutes; default 15, 60 at hour granularity) | `step:` |
| `min`, `max` (`"09:00"`; min after max is a window across midnight) | `min:`, `max:` |
| `from` (the start of a pair) | `from:` |
| `isTimeUnavailable(time)` | `isUnavailable:` |
| `hourCycle` 12 or 24 (default: the locale's), `locale` | `hourCycle:`, the environment's locale |
| `granularity` hour, minute, second | `granularity:` |
| `timeZone` (IANA; its short name is the suffix) | `timeZone:` |
| `size` regular, compact; `placeholder`, `required`, `name`, `readOnly`, `disabled`, `invalid`, `readback`, `now`, `aria-label`, `id` | `size:` |
| `DatePicker` `time` (true, or `step`, `min`, `max`, `isTimeUnavailable`, `hourCycle`, `granularity`, `timeZone`, `placeholder`) | `MetalDatePicker(_:selection:time:)` |

`name` sends the value in a hidden input; a `DatePicker` with `time` sends `2026-10-07T14:30`.

## Reading what is typed

- "14:30", "14.30", "14h30", "1430", "930", "9", "2.30pm", "230p", "2:30 p.m.", and the locale's own words for AM and PM, before or after.
- An hour without AM or PM on a 12-hour clock: the one inside `min` / `max` if only one is; otherwise 7 to 11 are morning and 12 to 6 afternoon. The readback says which.
- Typing is free of the step: a typed 10:07 is kept. The slots and the minute dial follow it (10:07 ↑ is 10:15).
- Leaving writes an understood time in the reader's words; one that wasn't understood, or is outside the window, keeps what was typed and shows the invalid ring.

## Keyboard and accessibility

- Put it in a `FormField` (the readback is the form field's; outside one, pass `readback={false}`). The input is the control (the FormField labels it and shows its errors); its validity carries "Enter a time like 14:30" or "Choose a time from 09:00 to 17:30".
- ↑ ↓ on the hour, minute, second or AM/PM step it; Alt ↓ opens the slots.
- The clock key is "Choose a time". The slots are a radio group ("Start, times" or "Times"); arrows move the latch and the field follows, Enter or Space closes, a press chooses and closes; Esc closes without a change. Focus returns to the input.
- The zone suffix describes the input, so it is said with the time.
- In a `DatePicker` with `time`, the time field is named "Time" (or "<label>, time") and sits in its own field root, so the form field's label names the date.

## Rules

- The reader's clock: 12 or 24 hours and where AM/PM goes come from the locale; `hourCycle` only for a house style.
- Read a typed time back with its part of the day.
- Offer slots inside the hours you keep; quiet what is booked, keep it choosable, and refuse only outside the hours.
- One press on a slot is the choice; there is no Confirm.

## SwiftUI

`MetalTimePicker` draws the same field (the zone as its suffix, clear and clock keys), reads the same typed words, says the same readback and refusals, and opens the slots in a popover: the button cap with its lamp, four to a row (two with lengths), scrolled to the chosen one; Now under them. ↑ ↓ on a part is web only (a SwiftUI `TextField` has no caret position). `MetalDatePicker` takes `time: true` for a time field beside the date.
