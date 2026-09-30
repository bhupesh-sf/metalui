# Backlog

Feedback, bugs and performance notes to work on later. The owner's word is in the first line of each entry; the rest is what a good library ships for it. Take entries one at a time, component by component.

## Calendar and Date picker

Owner: "no select date range; add option for min legit date, option for max legit date, and like everything which should be there for date." (2026-09-30)

- [ ] **Range selection**: `mode="range"`, `{ start, end }` value; the thumb stretches across the range, with ends and a hover preview of the range before the second click; `minDays` / `maxDays`.
- [ ] **Min and max on the page**: `Calendar` already takes `min` / `max` (out-of-range days disabled, month steps stop), but the docs page doesn't show them and `DatePicker` does not pass them through. Wire them through, demo them, and let the DialKit set them.
- [ ] **Unavailable days**: `isDateUnavailable(date)` (weekends, booked days), distinct from out of range, and said to assistive tech.
- [ ] **Multiple days**: `mode="multiple"`.
- [ ] **Week start** (`weekStartsOn`) beyond the locale default; **week numbers**.
- [ ] **More than one month** side by side (`months={2}`, for ranges).
- [ ] **Jump to a month or year**: the title opens a month/year picker (birthdays, far dates).
- [ ] **Controlled month**: `month` / `onMonthChange`.
- [ ] **Marked days**: a dot or LED for days with something on them (events).
- [ ] **Date picker**: typed entry (segments, locale aware), a clear button, Today, presets for ranges ("Last 7 days"), `required`, `name` (a hidden input for forms), `readOnly`, and it works inside `FormField`.
- [ ] **Time** (later): date and time together, and time zones.
- [ ] Check on the Calendar page: a pill-shaped plate cut off at the left edge of the viewport, level with the playground (seen in the owner's screenshot); find what it is.
