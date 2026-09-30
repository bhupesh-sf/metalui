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

## Button group and Split button: redesign

Owner: "these groups look ugly, we need to find a good UX; rounded corners inside a button group don't make sense; it doesn't have the feeling of metal." (2026-09-30)

What's wrong now: each segment is its own rounded cap (inner radius `button-group-key-radius`) sitting in a sunk switch tray, so the group reads as loose pills in a trough, not one part. The 100 % readout is dressed as a key though it can't be pressed. The split button's dark cap and light chevron are two different objects pushed together.

Direction (research and sketch before building; interface-craft storyboard first):

- [ ] **One machined bar.** The group is a single raised cap with the outer pill radius only; segments are divided by an engraved seam (a hairline groove: a dark line with a light edge beside it), with square inner edges. Reference: segments cut from one block (hardware rockers, console transport keys, Braun and Teenage Engineering panels).
- [ ] **Pressing a segment** sinks only that segment inside the bar (its own shading goes to the pressed look, travels its 1 px); the seams and the rest of the bar stay put, so it feels like one part with several keys.
- [ ] **Readouts are windows, not keys**: a value between steppers (the zoom's 100 %) is a sunk, engraved display window in the bar, with tabular figures and the drum when it changes.
- [ ] **Pairs as a rocker (explore)**: Undo / Redo, − / + as one rocker cap that tips toward the pressed end (a small rotation about the centre on the part spring), with a single seam in the middle.
- [ ] **Split button**: one bar in one material (the primary's dark for both parts), the chevron segment behind a seam; opening the menu keeps the chevron segment pressed while it's open.
- [ ] **Latched groups** (a toggle group) share the look: the latched segment stays sunk with its lamp.
- [ ] Every state per segment: rest, hover (lift the segment's light, not the bar), pressed, focus (ring on the segment, inside the bar's shape), disabled (per segment and whole), and the bar in both colorways and at compact size.
- [ ] Swift in step; update the Button group docs page, the agent guide and the captures.

## Icons on actions, and morphs on changes (library-wide)

Owner: "for each button which causes some action, couple it with a semantic icon; we have morphing icons which we aren't using anywhere. Find all the relevant actions and semantic changes where we can apply these icons." (2026-09-30)

Audit (2026-09-30): the icon set has 47 product glyphs. Each plays its act when its trigger (`.mu-icon-trigger`, which every Button carries) is hovered or pressed, so an icon in a button already moves. `MorphIcon` morphs any glyph into any other, but no component uses it; only the docs' Icons, Transitions and MorphGlyphs pages do. 16 components draw their own inline SVG or text glyph instead of using the set.

Rules to adopt first (one layer, in the Button foundation and agent guides):

- [ ] **An action names itself with a glyph and a verb**: a button that does something (save, share, export, delete, send, attach, copy, new) leads with its glyph. A plain choice (Cancel, Done, Close as a word) stays words only. `Button` gets a documented `icon` slot (leading, sized by the cap), not ad hoc children.
- [ ] **A state change morphs, never swaps**: when the same control's meaning changes (copy → copied, pin → unpin, collapse → expand), its glyph morphs with `MorphIcon` on the settle spring, and its label turns on the drum (`SwapText`) together.
- [ ] **No hand-drawn glyphs in components**: chevrons, arrows, ticks, plus and minus come from the set (one source).

### A. Action buttons that should carry a glyph (existing glyph in brackets)

- Delete / Delete regions / Send away (`trash`, `send-away`): Alert dialog, Dialog, Card menu
- Share (`share`), Export / Export PDF / Download (`document` → a `download` glyph, see D), Copy (`paste` → `check`), Paste (`paste`)
- New note / New canvas / Comment / Attach files / Attach a file (`note`, `board`, `plus`, `document`)
- Rename / Rename… / Rename canvas… (`pen`), Duplicate (`duplicate`), Pin (`pin`), Tag (`tag`), Group / Ungroup (`group`, `ungroup`)
- Undo / Redo (`undo`, `redo`), Zoom in / out / fit (`zoom-in`, `zoom-out`, `fit`), Search (`search`)
- Save / Save region (a `save` glyph, see D), Try again (`sync-error` → `synced`), Back to now (`clock`), Restore… (`undo`)
- Summarise, Gather, Tidy, Lift subject, Keep (`tidy`, `layout`, `capture`, `pin`)
- Close in dialogs, sheets, popovers, toasts and the attachment's remove (`close`)

### B. State changes that should morph (A → B)

- **Copy → Copied** (`paste` → `check`, back after the pause): the docs' Copy page and code blocks, and a documented copy-button pattern.
- **Sync state** (`synced` ↔ `offline` ↔ `sync-error`): Status, Toast, and the Attachment's upload (uploading → done `check`, failed `sync-error`, retry → `synced`).
- **Save** (idle → saving (Spinner) → saved `check`): the Button's "saving" demo.
- **Pin ↔ Unpin**, **Group ↔ Ungroup**, **Zoom in ↔ Zoom out** at a limit: menus and toolbars where one key flips.
- **Sidebar Toggle** (collapse ↔ expand) and **Split pane** collapse: a `layout` glyph whose panel part slides; today the caller passes a static icon.
- **Accordion, Select, Combobox, Navigation menu, Menubar** open ↔ closed: the chevron (see D) turns as a morph of one glyph, not a CSS rotation of a drawn one.
- **Checkbox / Menu check item**: the tick draws (see the Checkbox entry); mixed → ticked morphs dash → tick.
- **Drop zone**: the well's glyph morphs `document` → `check` when files land, and to `close` while refusing.
- **Toast** kinds (info → success → error) when one toast updates in place (a promise toast).
- **Theme switch** (Bone ↔ Graphite) and the **Motion** switch in the docs header, if they get glyphs (see D).
- **Table sort**: `arrow` up ↔ down as a morph instead of the rotated hand-drawn arrow.

### C. Hand-drawn glyphs to replace with the set

pagination, calendar (3), navigation-menu, accordion, attachment, combobox, select, table, breadcrumbs, button-group (split chevron), folder, number-field (− and + as text), fan (‹ as text), link (↗ as text). Leave the drawings that aren't glyphs: sparkline, connector, snap-guides, line-handles, brush-cursor, dot-display, perfect-preview.

### D. Glyphs the set lacks (design each in `icons.mjs`, with its act and morph partners)

- `chevron` (one glyph, turned by morph for down / up / left / right), `minus`
- `save`, `download`, `upload`, `send`, `copy` (distinct from paste), `external` (the link's arrow)
- `settings`, `filter`, `sort`, `eye` / `eye-off` (a password field), `lock`
- `info`, `warning` (toast and alert kinds), `sun` / `moon` (colorway), `sidebar` (the rail toggle)

Order of work: the rules and `Button`'s icon slot → D's `chevron` and `minus` → C (component by component) → B's morphs (copy first, it's everywhere) → A in the docs pages.
