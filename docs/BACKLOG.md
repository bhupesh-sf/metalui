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

## Destructive confirm: hold to delete (Alert dialog, Button)

Owner, on the Alert dialog's "Delete regions" button: "this should have motion like hold to delete, and proper icon animation." (2026-09-30)

- [ ] **Hold to confirm** as a Button behaviour (`hold` on a destructive cap, e.g. `<Button cap="destructive" hold>`), used by `AlertDialog.Confirm` for irreversible acts:
  - press: the cap presses as now, and a darker red fill runs across it from the leading edge over the hold time (a token, about 800 ms, linear, so it reads as time and not as a spring);
  - let go early: the fill drains back on the release spring, and nothing happens; a short line under the actions says "Hold to delete" the first time;
  - complete: the fill reaches the end, the cap gives one small settle (object spring), and the act fires; then the dialog closes;
  - keyboard: holding Space or Enter fills it the same way; a single tap only shows the hint.
- [ ] **The trash glyph acts**: the cap leads with the trash icon; while held, its lid lifts a little in step with the fill; at complete, the lid drops shut (a short timeline in the icon set's motion format, from `icons.mjs`, not a CSS pose).
- [ ] **Accessibility**: say the hold in the button's name or description ("Delete regions, hold to confirm"); announce the progress sparingly; WCAG 2.5.7 needs a single-pointer path; for pointers that can't hold, offer a setting or `hold={false}`, and the alert dialog's question still guards the act.
- [ ] Reduce Motion: the fill still shows the time passing (it is information), with no settle bounce and no lid travel.
- [ ] SwiftUI in step (a long-press gesture with the same fill and timing).
- [ ] Decide where it applies: irreversible deletes only; a delete that goes to the past (undoable) stays a plain press.
