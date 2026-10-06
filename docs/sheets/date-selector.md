# Date selector

A date condition you choose and then apply: **Due before 6 Oct 2026**, **Created between 1 – 14 Oct**, **Closed in Q3 2026**. From § 3 of `docs/BACKLOG.md`, "Calendar and DatePicker → date selector" (period types were done first; this sheet is the rest: operators, a dialog as well as a popover with Apply and Cancel, two months side by side, localised). Made the way the variation sheets are: ReUI's date selector, Linear's and Notion's date filters, Airtable's date conditions, Google Analytics' and Stripe's report ranges, Apple's HIG date pickers and React Aria's `DateRangePicker` were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## Where it sits

A **Component** (`docs/COMPOSITION.md`): you operate it to set a condition that changes something else (the rows a report counts), the same in any app. It lives in the calendar folder beside `DatePicker`, shares its `meta.json`, agent guide and page, and is composed of what is there: its key is a `Button`, its panel a `Popover` or a `Dialog`, the operator a `Switcher` (one of a few, always visible), the dates a `Calendar`, the foot compact `Button`s. Its own recipe holds only the panel's width.

**Not Filters' date field.** Filters already folds the operators into its date token (the operator is the token's own key, a `Menu`), with Cancel and Apply. The vocabulary is the same: *is*, *before*, *after*, *between*. DateSelector is the condition standing on its own, for a report header, a search form or a saved view, where there is no token row to hold the operator. Filters could later render its date editor with this panel; that is Filters' change, not this one.

**Not DatePicker.** DatePicker is a value (a day or a range) you can type; DateSelector is a condition (a relation to a day) you choose and apply. A host that only needs "between" with typing keeps `DatePicker mode="range"`.

## Jobs

| Job (where it comes from) | Our form | Tier |
|---|---|---|
| A condition on a date (ReUI, Linear, Airtable) | `DateSelector` with `value` `{ op, value }`: *is* a day, *before* a day, *after* a day, *between* two (both ends counted). The same words Filters uses | Must |
| Change the relation without losing the day (Notion) | the operator is a `Switcher` at the panel's top; the chosen day carries across (*is 6 Oct* → *between 6 Oct – 6 Oct*; *between* → *before* its start) | Must |
| Fewer operators for a job (Stripe: "between" only) | `operators` lists the ones offered, in order; one operator hides the switcher | Must |
| Larger units (the period types, done) | `period` passes to the calendar: *is Q3 2026*, *before 2026*, *between Jan – Mar*; *before* a unit means before its first day, *after* after its last | Must |
| Read the condition at a glance (everyone) | the key reads it as a sentence: "Due before 6 Oct 2026" (`label` leads), or the placeholder ("Any date"); the panel's foot repeats the draft in words while you choose | Must |
| Nothing happens until you say so (ReUI, GA) | the panel holds a draft; **Apply** commits and closes, **Cancel**, Esc or a click outside throws the draft away. Apply is off until the draft is whole (a range needs both ends) and differs from the value: the dialog rule for a confirm | Must |
| Go back to no condition (Linear "Clear") | a **Clear** key leads the foot once there is a value; it commits `null` and closes | Must |
| In a popover (ReUI) | `presentation="popover"` (the default): the plate under the key | Must |
| In a dialog (ReUI, HIG on compact widths) | `presentation="dialog"`: the same panel in `Dialog`, titled by `label` ("Due date"), Cancel and Apply in `Dialog.Actions`; for a narrow window, a touch-first host, or a condition that deserves the page's attention | Must |
| Two months side by side (GA, Stripe, React Aria) | the panel shows two months (`months`, default 2), so the width never jumps when the operator changes and a range across a month's end is one look | Must |
| Two months where there is room for one (*ours*) | the **Calendar** answers to its container: a `months={2}` calendar narrower than two months shows one, with both steps on it (`@container`, no script at rest). The panel is a container as wide as two months or what the popover's available width or the dialog leaves | Must |
| The reader's week (everyone) | `weekStartsOn` over the locale's; `locale` for the names | covered (Calendar) |
| Month and day names and formats (everyone) | every word that is a date comes from `Intl` in `locale`: titles, weekdays, the key's sentence, day numbers in the locale's digits (١٢ in `ar-EG`) | Must |
| Right to left (Arabic, Hebrew) | under `dir="rtl"` the calendar mirrors: the weeks run right to left (the table), the step chevrons point outward, ← moves to the next day, a later month comes in from the left; the range thumb already uses logical insets | Must |
| Send it with a form | `name` sends `before:2026-10-06` / `between:2026-10-01/2026-10-07` in a hidden input | Should |
| Test a row against it (Filters' `filterRows`) | `matchesDate(condition, date, period?)` | Should |
| Relative conditions ("in the last 7 days", "this month") | presets, as DatePicker's, in a column beside the calendar | Later |
| *is not*, *on or before*, *is empty* | dropped for now: *not* and *empty* are Filters' (a token row holds them); "on or before" is *before* the next day, and a fifth key on the switcher costs every reader a word to save a few a click | dropped |
| Quarter and half names in other languages | "Q3" and "H1" are English: `Intl` has no quarter. A host label map would be the fix | Later |
| UI words in other languages ("Apply", "Previous month") | the library's words are English everywhere today; a messages provider is a library job, not this component's | Later |
| Typing a condition ("before 6/10") | dropped: DatePicker types a value; a typed language of relations is a search field's | dropped |

## Must

- [x] `DateSelector`: `value` / `defaultValue` / `onValueChange` (`DateCondition | null`), `operators`, `period`, `label`, `placeholder`, `presentation`, `months`, `size`, `min`, `max`, `isDateUnavailable`, `marks`, `locale`, `weekStartsOn`, `disabled`.
- [x] Operator switcher; the day carries across operators.
- [x] Draft, Apply (off until whole and changed), Cancel, Esc and outside click discard; Clear.
- [x] Popover and dialog.
- [x] Calendar: two months collapse to one in a narrow container; the panel is that container.
- [x] Calendar localised: day and week numbers in the locale's digits; RTL keys, chevrons and arrivals.
- [x] SwiftUI: `MetalDateSelector` (popover or sheet, the same operators, Apply and Cancel); `MetalCalendar` mirrors in RTL, its digits are the locale's, and two months fall back to one where they don't fit (`ViewThatFits`).

## Should

- [x] `name` for forms; `matchesDate`.

## Later

- [ ] Relative presets.
- [ ] Quarter and half names per locale; UI words per locale.
- [ ] Filters' date editor on this panel (the operator would stay the token's key there).

## Decide

- A new component or a mode of DatePicker? **New, beside it.** A condition is not a value: DatePicker's field types a day, and a relation has no good typed form. Same folder, guide and page, since it is the calendar's family.
- Operator as a Switcher or a Menu? **Switcher.** In the panel there is room, and seeing the four relations at once is the point; Filters' token uses a Menu because a token has no room.
- Apply off when nothing changed? **Yes**, the dialog's rule for a confirm; Cancel is always on.
- Two months or one by default? **Two** for every operator, so the panel's width holds when the operator changes; the container collapses it where it doesn't fit.
- Collapse by script or container? **Container query** on the nearest container, unnamed on purpose: the Calendar has no width of its own and answers to whatever holds it (the panel, a block, a card). The keyboard asks the page which months are drawn when it moves, so focus never lands on a hidden month.
- RTL from Base UI's `DirectionProvider` or the page? **The page**: the calendar reads its own computed `direction`, so `dir="rtl"` anywhere above it is enough.
