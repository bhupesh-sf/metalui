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

## Fan (the canvas tool bar)

Owner, on the Fan page: "why are the tray things labels, fix them, make relevant icons"; "instead of showing this tall thing maybe show a grid of 3 × 3"; "what is this ink thing". (2026-09-30)

- [ ] **Tray actions are glyph keys, not worded buttons.** The text and image trays hold compact `Button`s with words (Tasks, Summarise, Gather, Region, Export, Send away; Lift subject, Copy). Add `Fan.Action` (a graphite key with the action's glyph; its name in a tooltip and as its accessible name; the glyph plays its act on hover and press) and use it on the page. Glyphs: Tasks `task`, Summarise `document`, Gather `group`, Region `region`, Export `share` (or a new `download`), Send away `send-away`, Lift subject `capture`, Copy `duplicate` (or a new `copy`).
- [ ] **The fold key is a text "‹"**: use a glyph from the set (a `chevron`, see the icons entry), or morph the tray's own cap glyph into `close` while open. Swift's `MetalFanTray` has the same "‹".
- [ ] **The tool picker is a tower**: 11 tools fan straight up into a column taller than the page. Lay the choices out as a grid (3 × 3, or 4 × 3) that unfolds from the cap: each key travels from behind the cap to its cell on the part spring, staggered by distance from the cap; arrows move in two dimensions; group related tools (select / text / region; pen, marker, pencil; line, arrow, rectangle, ellipse; eraser). Keep "nothing hides in a menu".
- [ ] **The Ink tray doesn't explain itself**: "Ink" as a worded label cap, a bead that only shows the current ink, five colour beads and three width dots with no names, and a "‹". Rework it: the label cap says what the bar is about with a glyph (not a word in a cap), the colours and widths are two named groups (tooltips and accessible names: "Ink: red", "Width: fine"), the chosen ink and width read as latched, and the widths show as strokes of that width in the chosen ink rather than bare dots.
- [ ] The "Pretend selection" switcher sits right on top of the fanned picker; give the demo room, or move the switcher beside the bar.
- [ ] Update the Fan agent guide, Swift and the captures with each change.

## Link: more states

Owner, on the Link page: "add different states to links." (2026-09-30)

Now: rest (engraved hairline underline), hover (underline darkens), pressed (dims), focus (green ring), external (a text "↗" that nudges). The hover is too quiet to notice, and the page shows no state but rest.

- [ ] **Hover you can see**: the underline draws thicker from the side the pointer entered, or rises to meet the baseline (settle spring), with a faint tint behind the words; not only a colour change.
- [ ] **Pressed**: the words sink one step (press travel) as well as dimming, the same press language as a button.
- [ ] **Visited**: a quieter underline (ink3) for `:visited`, opt-in (`visited` on the Link, off by default in apps, on in documents).
- [ ] **Current** (`aria-current="page"`): no underline and full ink, so a link to where you are reads as "here" (breadcrumbs and nav use it).
- [ ] **Disabled / unavailable**: `aria-disabled`, ink3, no underline, no pointer; says why in a tooltip when given.
- [ ] **Loading** (a link that navigates in-app and waits): the underline runs like a progress line until the route arrives.
- [ ] **External**: the "↗" becomes the set's `external` glyph (see the icons entry) with its act on hover, instead of a text character.
- [ ] **Download** (`download` attribute): the `download` glyph and the file size after it ("Tram map.pdf · 2.4 MB").
- [ ] **Kinds**: `quiet` (no underline until hover, for dense lists and tables, only where the context already says "these are links") and `standalone` (a link on its own line with a trailing arrow).
- [ ] **Show every state on the page**: a states strip (rest, hover, pressed, focus, visited, current, disabled, external, download), in both colorways, plus the x-ray card for handling it.
- [ ] Keep the underline in every state except current and disabled (colour alone never marks a link); Swift in step.

## Popover: the Rename action

Owner, on the Popover page's "Rename" button: "same, add better semantic action." (2026-09-30)

- [ ] **The confirm names itself with a glyph**: "Rename" leads with `pen` (its act plays on hover and press), the same rule as the icons entry.
- [ ] **It behaves like a rename**: the field opens with the name selected (the extension kept out of the selection for a file); Enter renames, Escape cancels; Rename is disabled while the name is empty or unchanged; an invalid name (taken, too long) shows the invalid ring and says why under the field instead of closing.
- [ ] **Done shows it's done**: on Rename the glyph morphs `pen` → `check` and the label turns "Renamed" on the drum, then the popover closes after a beat; offer undo in a toast: "Renamed to Lisbon · Undo".
- [ ] **Saving**: when the rename is async, the key shows the spinner and the field locks until it lands; a failure morphs to `sync-error` with Try again.
- [ ] Apply the same pattern to Dialog's "Rename canvas…" and to every confirm that commits a small edit (Save region, Tag, Comment).

## Progress: more variations, and Reset

Owner, on the Progress page: "few more variations for reset." (2026-09-30) The page shows one known bar, one unknown bar, and worded "Run export" / "Reset" buttons.

- [ ] **Reset reads as reset**: the key leads with `undo` (or a new `reset` glyph); the fill drains back to empty on the release spring, not a jump; the value turns back to 0 % on the drum. "Run export" leads with its glyph, and while running it becomes "Cancel" (the glyph morphs to `close`).
- [ ] **End states**: complete (the fill finishes, then the head morphs to `check` and says "Exported"), failed (the fill stops where it was in the invalid ink, `sync-error`, Try again), paused (the fill holds and dims; Resume), cancelled (drains back).
- [ ] **Shapes**: a slim bar with no head (under a toolbar or a card's edge), a ring (circular, for a key or an avatar), a segmented bar for known steps ("Step 2 of 4"), and a buffered bar (a lighter second fill ahead, for media).
- [ ] **Detail**: time left or items done in the head ("8 of 12 · about 20 s"), `tabular-nums`, and the value turning on the drum.
- [ ] **Sizes**: compact and regular, to sit in a row, a toast or a dialog.
- [ ] Show them on the page as a states strip with a DialKit panel to scrub the value and flip the state; Swift in step.

## Slider: redesign

Owner, on the Slider page: "the knob goes out of bounds, which breaks it; allow changing icons and width, and improve it overall; the labels are unreadable, the colour gets muddled in the background; it has to be designed better." (2026-09-30)

What's wrong now:
- The knob's centre travels to the groove's very ends, so at 0 and 100 half the knob hangs past the groove. The tick row is inset (`slider-track-inset`) but the fill and groove are not, so the ticks, the fill end and the knob don't line up.
- The tick labels are the engraved `eng` type in ink3, small and spaced, on the dotted stage, so they blur into the background. The loose marks (15, 40, 62, 90) sit on the fill, sit apart from the ticks, and read as noise.
- The pale green fill against the pale groove has little contrast in bone.

Direction:
- [ ] **Bounds**: the knob stays inside the groove. Its travel is the groove minus the knob (the fill runs to the knob's centre), so at 0 and 100 the knob sits flush with the rounded ends. Ticks and labels use the same travel so the knob, fill end and tick line up at every value. Check it in Swift too (`MetalSlider`), which must follow the same geometry.
- [ ] **Readable scale**: labels in the meta type at ink2 (not engraved ink3), with enough size and a plate or clear space so the dotted stage never runs through them. Ticks only where there are labels or steps; drop the loose marks, or make marks a documented prop that draws them as notches in the groove.
- [ ] **Contrast**: a fill that reads in both colorways (the switch-on green at full strength, or ink for a neutral slider); the groove's edge clear against the surface.
- [ ] **Icons at the ends**: `startIcon` / `endIcon` (volume low / high, dim / bright), the glyphs from the set, playing their acts at the limits; and an optional glyph in or beside the knob.
- [ ] **Sizes and width**: `size` (compact, regular, large: groove thickness and knob size together) and a `width` / full-width option, all from the slider recipe.
- [ ] **Value**: an optional value readout (beside it, or a bubble over the knob while dragging) with the drum; a formatter (%, units).
- [ ] **More kinds**: a range (two knobs), a vertical slider, a stepped slider that clicks into detents (part spring), and a centred slider (fill grows from the middle, for balance or offsets).
- [ ] **Every state**: rest, hover (the knob lifts), dragging (the knob presses, the fill follows 1:1), focus, disabled, and at the limits (a small refusal nudge when you push past an end).
- [ ] Redo the page: examples for each kind, a DialKit panel, the x-ray card; captures in both colorways.
