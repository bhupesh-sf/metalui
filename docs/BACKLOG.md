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

## Checkbox (and Checkbox group)

Owner: "the tick animation is boring, it just makes it appear; it should make the glyph run the tick action." (2026-09-30)

- [ ] **Draw the tick as a stroke.** Now the tick is a rotated CSS border box revealed by a `clip-path` wipe (`checkbox-tick`, keyframes `mu-checkbox-tick`), so it fades or wipes in as a whole shape. Make it an SVG path drawn by `stroke-dashoffset` along the pen's route: the short stroke down into the corner, a beat of pace change at the corner, then the long stroke up and out, with a slight overshoot at the tail on the part spring. Use the icon set's check geometry (`icons.mjs`, one source) and its motion format (timelines as data, one act per trigger), not a held CSS pose.
- [ ] **Unticking runs it backwards**: the tick withdraws from the tail toward the corner before the key goes light, rather than vanishing.
- [ ] **Mixed (the parent's half)**: the dash draws from left to right the same way; mixed to ticked morphs the dash into the tick instead of swapping.
- [ ] **The group cascade** keeps its stagger, with each child's tick drawing in turn.
- [ ] Reduce Motion: the tick appears whole and at once. Keep SwiftUI in step (`trim(from:to:)` on the same path).
- [ ] Anything else that draws a tick uses the same drawing: the menu's checkbox item, the select's chosen row, and the table's select column (it uses Checkbox already).
