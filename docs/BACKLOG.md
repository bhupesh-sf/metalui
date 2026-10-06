# Backlog

Feedback, bugs and performance notes to work on later. The owner's word is in the first line of each entry; the rest is what a good library ships for it. Take entries one at a time, component by component.

## Calendar and Date picker

Owner: "no select date range; add option for min legit date, option for max legit date, and like everything which should be there for date." (2026-09-30)

- [x] **Range selection**: `mode="range"`, `{ start, end }` value; the thumb stretches across the range, with ends and a hover preview of the range before the second click; `minDays` / `maxDays`.
- [x] **Min and max on the page**: `Calendar` already takes `min` / `max` (out-of-range days disabled, month steps stop), but the docs page doesn't show them and `DatePicker` does not pass them through. Wire them through, demo them, and let the DialKit set them.
- [x] **Unavailable days**: `isDateUnavailable(date)` (weekends, booked days), distinct from out of range, and said to assistive tech. (Quiet in ink3, described "Unavailable", still choosable; out of range stays the unchoosable case. On the page as Quiet days.)
- [x] **Multiple days**: `mode="multiple"`.
- [x] **Week start** (`weekStartsOn`) beyond the locale default; **week numbers**.
- [x] **More than one month** side by side (`months={2}`, for ranges).
- [x] **Jump to a month or year**: the title opens a month/year picker (birthdays, far dates).
- [x] **Controlled month**: `month` / `onMonthChange`.
- [x] **Marked days**: a dot or LED for days with something on them (events).
- [x] **Date picker**: typed entry (segments, locale aware), a clear button, Today, presets for ranges ("Last 7 days"), `required`, `name` (a hidden input for forms), `readOnly`, and it works inside `FormField`.
- [x] **Time** (later): date and time together, and time zones.
- [x] Check on the Calendar page: a pill-shaped plate cut off at the left edge of the viewport, level with the playground (seen in the owner's screenshot); find what it is.
- Done (2026-10-06): range (a stretched thumb per week, `minDays`/`maxDays`), multiple, `weekStartsOn`, ISO week numbers, `months={2}`, month/year views, `marks` (ink dot or amber/red LED), `period` day/month/quarter/half/year; DatePicker is a typed `Field` with a readback, ↑/↓ per part, presets, `required`/`name`; the set's glyphs; real `MetalCalendar` and `MetalDatePicker`. Left: the operator picker (is/before/after/between) as its own component; time and zones (Later); "Q"/"H" names are English; SwiftUI has no presets or range in the picker.

## Checkbox (and Checkbox group)

Owner: "the tick animation is boring, it just makes it appear; it should make the glyph run the tick action." (2026-09-30)

- [x] **Draw the tick as a stroke.** Now the tick is a rotated CSS border box revealed by a `clip-path` wipe (`checkbox-tick`, keyframes `mu-checkbox-tick`), so it fades or wipes in as a whole shape. Make it an SVG path drawn by `stroke-dashoffset` along the pen's route: the short stroke down into the corner, a beat of pace change at the corner, then the long stroke up and out, with a slight overshoot at the tail on the part spring. Use the icon set's check geometry (`icons.mjs`, one source) and its motion format (timelines as data, one act per trigger), not a held CSS pose.
- [x] **Unticking runs it backwards**: the tick withdraws from the tail toward the corner before the key goes light, rather than vanishing.
- [x] **Mixed (the parent's half)**: the dash draws from left to right the same way; mixed to ticked morphs the dash into the tick instead of swapping.
- [x] **The group cascade** keeps its stagger, with each child's tick drawing in turn.
- [x] Reduce Motion: the tick appears whole and at once. Keep SwiftUI in step (`trim(from:to:)` on the same path).
- [ ] Anything else that draws a tick uses the same drawing: the menu's checkbox item, the select's chosen row, and the table's select column (it uses Checkbox already).

## Destructive confirm: hold to delete (Alert dialog, Button)

Owner, on the Alert dialog's "Delete regions" button: "this should have motion like hold to delete, and proper icon animation." (2026-09-30)

- [x] **Hold to confirm** as a Button behaviour (`hold` on a destructive cap, e.g. `<Button cap="destructive" hold>`), used by `AlertDialog.Confirm` for irreversible acts:
  - press: the cap presses as now, and a darker red fill runs across it from the leading edge over the hold time (a token, about 800 ms, linear, so it reads as time and not as a spring);
  - let go early: the fill drains back on the release spring, and nothing happens; a short line under the actions says "Hold to delete" the first time;
  - complete: the fill reaches the end, the cap gives one small settle (object spring), and the act fires; then the dialog closes;
  - keyboard: holding Space or Enter fills it the same way; a single tap only shows the hint.
- [x] **The trash glyph acts**: the cap leads with the trash icon; while held, its lid lifts a little in step with the fill; at complete, the lid drops shut (a short timeline in the icon set's motion format, from `icons.mjs`, not a CSS pose).
- [x] **Accessibility**: say the hold in the button's name or description ("Delete regions, hold to confirm"); announce the progress sparingly; WCAG 2.5.7 needs a single-pointer path; for pointers that can't hold, offer a setting or `hold={false}`, and the alert dialog's question still guards the act.
- [x] Reduce Motion: the fill still shows the time passing (it is information), with no settle bounce and no lid travel.
- [x] SwiftUI in step (a long-press gesture with the same fill and timing).
- [x] Decide where it applies: irreversible deletes only; a delete that goes to the past (undoable) stays a plain press.
- Done (2026-10-06): `<Button cap="destructive" hold>` (800 ms token) and `AlertDialog.Confirm hold`; trash has a held act (`act.hold`); "Hold to confirm" is the description; a click with no press first (switch, screen reader) confirms at once; opt-in, irreversible deletes only. Left: SwiftUI's alert is the system one (can't host a hold); the Swift hold has no capture or test, doesn't cancel when the pointer slides off, and isn't mirrored for right-to-left.

## Button group and Split button: redesign

Owner: "these groups look ugly, we need to find a good UX; rounded corners inside a button group don't make sense; it doesn't have the feeling of metal." (2026-09-30)

What's wrong now: each segment is its own rounded cap (inner radius `button-group-key-radius`) sitting in a sunk switch tray, so the group reads as loose pills in a trough, not one part. The 100 % readout is dressed as a key though it can't be pressed. The split button's dark cap and light chevron are two different objects pushed together.

Direction (research and sketch before building; interface-craft storyboard first):

- [x] **One machined bar.** The group is a single raised cap with the outer pill radius only; segments are divided by an engraved seam (a hairline groove: a dark line with a light edge beside it), with square inner edges. Reference: segments cut from one block (hardware rockers, console transport keys, Braun and Teenage Engineering panels).
- [x] **Pressing a segment** sinks only that segment inside the bar (its own shading goes to the pressed look, travels its 1 px); the seams and the rest of the bar stay put, so it feels like one part with several keys.
- [x] **Readouts are windows, not keys**: a value between steppers (the zoom's 100 %) is a sunk, engraved display window in the bar, with tabular figures and the drum when it changes.
- [x] **Pairs as a rocker (explore)**: Undo / Redo, − / + as one rocker cap that tips toward the pressed end (a small rotation about the centre on the part spring), with a single seam in the middle.
- [x] **Split button**: one bar in one material (the primary's dark for both parts), the chevron segment behind a seam; opening the menu keeps the chevron segment pressed while it's open.
- [x] **Latched groups** (a toggle group) share the look: the latched segment stays sunk with its lamp.
- [x] Every state per segment: rest, hover (lift the segment's light, not the bar), pressed, focus (ring on the segment, inside the bar's shape), disabled (per segment and whole), and the bar in both colorways and at compact size.
- [x] Swift in step; update the Button group docs page, the agent guide and the captures.
- Done (2026-10-06): one raised bar with seams; only the pressed key sinks; `ButtonGroupReadout` (a sunk window on the drum); `rocker`; the split's chevron is the set's glyph and stays held while its menu is open; `latch` one / several; a real SwiftUI twin. The chevron is a `MorphIcon` half turn now (SplitButton 32 → 19 KB gzip). SwiftUI latches use plain toggles.

## Icons on actions, and morphs on changes (library-wide)

Owner: "for each button which causes some action, couple it with a semantic icon; we have morphing icons which we aren't using anywhere. Find all the relevant actions and semantic changes where we can apply these icons." (2026-09-30)

Audit (2026-09-30): the icon set has 47 product glyphs. Each plays its act when its trigger (`.mu-icon-trigger`, which every Button carries) is hovered or pressed, so an icon in a button already moves. `MorphIcon` morphs any glyph into any other, but no component uses it; only the docs' Icons, Transitions and MorphGlyphs pages do. 16 components draw their own inline SVG or text glyph instead of using the set.

Rules to adopt first (one layer, in the Button foundation and agent guides):

- [x] **An action names itself with a glyph and a verb** (done: `Button` `icon` prop; link, graphite and strip caps still lack a glyph size token): a button that does something (save, share, export, delete, send, attach, copy, new) leads with its glyph. A plain choice (Cancel, Done, Close as a word) stays words only. `Button` gets a documented `icon` slot (leading, sized by the cap), not ad hoc children.
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

- [x] `chevron` (one glyph; `turn` prop on Icon and MorphIcon), `minus` (done)
- `save`, `download`, `upload`, `send` (done, with `stop`, `attach`, `retry`, `person`, `bell`, `palette`), `copy` (distinct from paste), `external` (the link's arrow) (done)
- `settings`, `filter`, `sort`, `eye` / `eye-off` (a password field), `lock` (done, with `copy` and `external`; `copy` → `check` strains 2.38, so Copied turns its glyph by the drum, not a morph)
- `info`, `warning` (toast and alert kinds), `sun` / `moon` (colorway), `sidebar` (the rail toggle)

Order of work: the rules and `Button`'s icon slot → D's `chevron` and `minus` → C (component by component) → B's morphs (copy first, it's everywhere) → A in the docs pages.

## Fan (the canvas tool bar)

Owner, on the Fan page: "why are the tray things labels, fix them, make relevant icons"; "instead of showing this tall thing maybe show a grid of 3 × 3"; "what is this ink thing". (2026-09-30)

- [x] **Tray actions are glyph keys, not worded buttons.** The text and image trays hold compact `Button`s with words (Tasks, Summarise, Gather, Region, Export, Send away; Lift subject, Copy). Add `Fan.Action` (a graphite key with the action's glyph; its name in a tooltip and as its accessible name; the glyph plays its act on hover and press) and use it on the page. Glyphs: Tasks `task`, Summarise `document`, Gather `group`, Region `region`, Export `share` (or a new `download`), Send away `send-away`, Lift subject `capture`, Copy `duplicate` (or a new `copy`). (No `Fan.Action` needed: the tray holds `IconButton variant="tool"` keys named in `title` and `label`, SwiftUI `MetalIconButton(…, variant: .tool)`; Export is the new `download`. The guide says so.)
- [x] **The fold key is a text "‹"**: use a glyph from the set (a `chevron`, see the icons entry), or morph the tray's own cap glyph into `close` while open. Swift's `MetalFanTray` has the same "‹".
- [x] **The tool picker is a tower**: 11 tools fan straight up into a column taller than the page. Lay the choices out as a grid (3 × 3, or 4 × 3) that unfolds from the cap: each key travels from behind the cap to its cell on the part spring, staggered by distance from the cap; arrows move in two dimensions; group related tools (select / text / region; pen, marker, pencil; line, arrow, rectangle, ellipse; eraser). Keep "nothing hides in a menu".
- [x] **The Ink tray doesn't explain itself**: "Ink" as a worded label cap, a bead that only shows the current ink, five colour beads and three width dots with no names, and a "‹". Rework it: the label cap says what the bar is about with a glyph (not a word in a cap), the colours and widths are two named groups (tooltips and accessible names: "Ink: red", "Width: fine"), the chosen ink and width read as latched, and the widths show as strokes of that width in the chosen ink rather than bare dots.
- [x] The "Pretend selection" switcher sits right on top of the fanned picker; give the demo room, or move the switcher beside the bar.
- [x] Update the Fan agent guide, Swift and the captures with each change.
- Done (2026-10-06): the fold is the set's `chevron`; the picker is a grid unfolding from the cap (options take a `group`, one row each; nearest keys leave first); `Fan.Label icon`; `InkStroke`; named Ink and Width groups, latched in the graphite well; the switcher sits under the bar. Left: the fold key overhangs the tray's right edge slightly; no draw-picks e2e slice (the fan slice covers them).

## Link: more states

Owner, on the Link page: "add different states to links." (2026-09-30)

Now: rest (engraved hairline underline), hover (underline darkens), pressed (dims), focus (green ring), external (a text "↗" that nudges). The hover is too quiet to notice, and the page shows no state but rest.

- [x] **Hover you can see**: the underline draws thicker from the side the pointer entered, or rises to meet the baseline (settle spring), with a faint tint behind the words; not only a colour change.
- [x] **Pressed**: the words sink one step (press travel) as well as dimming, the same press language as a button.
- [x] **Visited**: a quieter underline (ink3) for `:visited`, opt-in (`visited` on the Link, off by default in apps, on in documents).
- [x] **Current** (`aria-current="page"`): no underline and full ink, so a link to where you are reads as "here" (breadcrumbs and nav use it).
- [x] **Disabled / unavailable**: `aria-disabled`, ink3, no underline, no pointer; says why in a tooltip when given.
- [x] **Loading** (a link that navigates in-app and waits): the underline runs like a progress line until the route arrives.
- [x] **External**: the "↗" becomes the set's `external` glyph (see the icons entry) with its act on hover, instead of a text character.
- [x] **Download** (`download` attribute): the `download` glyph and the file size after it ("Tram map.pdf · 2.4 MB"). (`fileSize`; the glyph acts on hover; both sit outside the underline; assistive tech hears "(download, 2.4 MB)". SwiftUI's `MetalLink` is still a placeholder.)
- [x] **Kinds**: `quiet` (no underline until hover, for dense lists and tables, only where the context already says "these are links") and `standalone` (a link on its own line with a trailing arrow).
- [x] **Show every state on the page**: a states strip (rest, hover, pressed, focus, visited, current, disabled, external, download), in both colorways, plus the x-ray card for handling it.
- [x] Keep the underline in every state except current and disabled (colour alone never marks a link); Swift in step.
- Done (2026-10-06): the line sits under the descenders and rises and thickens on hover with a faint tint; pressed sinks; `visited`, `aria-current`, `disabled` with `reason`, `loading`; the `external` glyph (joined to the last word); `quiet` and `standalone`; a states strip, the x-ray, and a real `MetalLink`. Left: `:visited` colour can't be shown headless (the strip proves `data-visited`); SwiftUI has no visited.

## Popover: the Rename action

Owner, on the Popover page's "Rename" button: "same, add better semantic action." (2026-09-30)

- [x] **The confirm names itself with a glyph**: "Rename" leads with `pen` (its act plays on hover and press), the same rule as the icons entry.
- [x] **It behaves like a rename**: the field opens with the name selected (the extension kept out of the selection for a file); Enter renames, Escape cancels; Rename is disabled while the name is empty or unchanged; an invalid name (taken, too long) shows the invalid ring and says why under the field instead of closing.
- [x] **Done shows it's done**: on Rename the glyph morphs `pen` → `check` and the label turns "Renamed" on the drum, then the popover closes after a beat; offer undo in a toast: "Renamed to Lisbon · Undo".
- [x] **Saving**: when the rename is async, the key shows the spinner and the field locks until it lands; a failure morphs to `sync-error` with Try again.
- [x] Apply the same pattern to Dialog's "Rename canvas…" and to every confirm that commits a small edit (Save region, Tag, Comment).
- Done (2026-10-06) as `QuickEdit`, a Component the popover's Rename and Dialog's "Rename canvas…" use; the rule for every small-edit confirm is in its guide. Left: SwiftUI crossfades the glyph (no morph yet); validation is synchronous only; the Dialog x-ray specimen still shows the old Save layout; Save region, Tag and Comment use it when built (Comment needs a multiline kind).

## Progress: more variations, and Reset

Owner, on the Progress page: "few more variations for reset." (2026-09-30) The page shows one known bar, one unknown bar, and worded "Run export" / "Reset" buttons.

- [x] **Reset reads as reset**: the key leads with `undo` (or a new `reset` glyph); the fill drains back to empty on the release spring, not a jump; the value turns back to 0 % on the drum. "Run export" leads with its glyph, and while running it becomes "Cancel" (the glyph morphs to `close`). (Started: Run export leads with `download` and Reset with `undo`; the drain, the drum and Cancel are open.)
- [x] **End states**: complete (the fill finishes, then the head morphs to `check` and says "Exported"), failed (the fill stops where it was in the invalid ink, `sync-error`, Try again), paused (the fill holds and dims; Resume), cancelled (drains back).
- [x] **Shapes**: a slim bar with no head (under a toolbar or a card's edge), a ring (circular, for a key or an avatar), a segmented bar for known steps ("Step 2 of 4"), and a buffered bar (a lighter second fill ahead, for media).
- [x] **Detail**: time left or items done in the head ("8 of 12 · about 20 s"), `tabular-nums`, and the value turning on the drum.
- [x] **Sizes**: compact and regular, to sit in a row, a toast or a dialog.
- [x] Show them on the page as a states strip with a DialKit panel to scrub the value and flip the state; Swift in step.
- Done (2026-10-06): the fill drains on the release spring; Run export morphs to Cancel; `state` complete / failed / paused; `shape` slim and ring (the Spinner's ring), `steps`, `buffer`; `detail` and `icon`; `size` compact; a real `MetalProgress`. Attachment now uses the transform fill. Left: re-baseline `bench/budgets.json`; the ring takes the Spinner's fixed sizes.

## Slider: redesign

Owner, on the Slider page: "the knob goes out of bounds, which breaks it; allow changing icons and width, and improve it overall; the labels are unreadable, the colour gets muddled in the background; it has to be designed better." (2026-09-30)

What's wrong now:
- The knob's centre travels to the groove's very ends, so at 0 and 100 half the knob hangs past the groove. The tick row is inset (`slider-track-inset`) but the fill and groove are not, so the ticks, the fill end and the knob don't line up.
- The tick labels are the engraved `eng` type in ink3, small and spaced, on the dotted stage, so they blur into the background. The loose marks (15, 40, 62, 90) sit on the fill, sit apart from the ticks, and read as noise.
- The pale green fill against the pale groove has little contrast in bone.

Direction:
- [x] **Bounds**: the knob stays inside the groove. Its travel is the groove minus the knob (the fill runs to the knob's centre), so at 0 and 100 the knob sits flush with the rounded ends. Ticks and labels use the same travel so the knob, fill end and tick line up at every value. Check it in Swift too (`MetalSlider`), which must follow the same geometry.
- [x] **Readable scale**: labels in the meta type at ink2 (not engraved ink3), with enough size and a plate or clear space so the dotted stage never runs through them. Ticks only where there are labels or steps; drop the loose marks, or make marks a documented prop that draws them as notches in the groove.
- [x] **Contrast**: a fill that reads in both colorways (the switch-on green at full strength, or ink for a neutral slider); the groove's edge clear against the surface.
- [x] **Icons at the ends**: `startIcon` / `endIcon` (volume low / high, dim / bright), the glyphs from the set, playing their acts at the limits; and an optional glyph in or beside the knob.
- [x] **Sizes and width**: `size` (compact, regular, large: groove thickness and knob size together) and a `width` / full-width option, all from the slider recipe.
- [x] **Value**: an optional value readout (beside it, or a bubble over the knob while dragging) with the drum; a formatter (%, units).
- [ ] **More kinds** (see follow-ups): a range (two knobs), a vertical slider, a stepped slider that clicks into detents (part spring), and a centred slider (fill grows from the middle, for balance or offsets).
- [x] **Every state**: rest, hover (the knob lifts), dragging (the knob presses, the fill follows 1:1), focus, disabled, and at the limits (a small refusal nudge when you push past an end).
- [x] Redo the page: examples for each kind, a DialKit panel, the x-ray card; captures in both colorways.
- [ ] **Follow-ups**: range (two knobs), vertical, stepped detents, centred; a neutral ink fill; a value bubble over the knob while dragging; volume / brightness glyphs (the set has none; the demo uses zoom); RTL refusal direction; Swift drum for the readout. `e2e/slider.spec.ts` "knob stays inside the groove … graphite" failed once under a full parallel run and passed alone twice: make it robust.

## Spinner: rethink as waiting, by where it happens

Owner, on the Spinner page: "again very bad implementation, think again; think of the various states this could happen in: conveyed on a large item vs a small item vs on an action, and all those things." (2026-09-30)

Now: a sunk ring with a green arc, in two sizes, floating on its own above two worded buttons ("Quick save", "Slow save") that don't show the spinner in themselves. It reads as a loose widget, not as something waiting.

Rethink it as one waiting language, placed where the wait is (research first: how Apple, Linear, Vercel and Teenage Engineering show waiting; storyboard each placement):

- [x] **On an action (a button, a key)**: the glyph itself becomes the wait (the icon morphs into a small arc, or its act loops quietly) while the label turns on the drum ("Save" → "Saving…" → "Saved" with `check`); the key keeps its width and stays pressed-looking; a second press is refused. Short waits under the show delay show nothing, then just the result. (Done as Button `state`; the arc stands in for the glyph after the show delay.)
- [x] **On a small item (a row, a chip, an attachment, an avatar)**: a small ring in the item's glyph slot or at its trailing edge, sized to the text; the item dims a little and can't be acted on; done → the ring morphs to `check` and fades.
- [x] **On a large item (a card, an image, a panel, a region)**: not a spinner in the middle: the item's own shape waits (a skeleton or a slow sheen across its surface, or a lit edge that travels around its border), with the words of what's happening ("Lifting the subject…"); progress when it's known.
- [x] **In a field** (search, combobox, validation): a small ring in the trailing slot, replacing the clear key while it works.
- [x] **For the whole place** (a page or view loading): skeletons of what will arrive, not a spinner; a thin top bar for route changes.
- [x] **Background work** (syncing, uploading while you keep working): the status LED breathes (the lamp gesture), and nothing blocks.
- [x] **Known vs unknown**: switch to Progress as soon as the amount is known (ring fills rather than spins).
- [x] **Timing rules**: a show delay (nothing for fast work), a minimum time on screen once shown (no flash), then the result (`check`, or `sync-error` with Try again); long waits say more after a while ("Still exporting…").
- [x] **Accessibility and motion**: `aria-busy` on the waiting thing, a polite status only at start and end; Reduce Motion: no spin, a slow pulse of the arc or the words only.
- [x] **Sizes and inks**: sized from the host (button glyph, row glyph, field glyph), in the host's ink (white on a primary key), not a fixed green arc on a sunk well.
- [x] Redo the page as placements, each a real host (a saving button, an uploading row, a loading card, a searching field, a syncing status), with a DialKit panel for the timing; Swift in step.
- Done (2026-10-06): one clock, `useWait(work, ref?)` in `motion/wait.ts` (phases idle, quiet, shown, done, failed; timings are tokens), SwiftUI `.metalWait`; Row, Chip, Avatar, Card, Attachment and Field.Trail wait in place; `Spinner.Bar` for routes; `Spinner.Status` announces start and end. Left: SwiftUI Chip dims only its text and actions; `Spinner.Bar` and `Spinner.Status` are pending Swift slots; `bench/budgets.json` can drop the spinner loop allowance (none run at rest).

## Status: LEDs and badges get lost on the page

Owner, on the Status page: "these appear way too muddled on the page a lot of the time, especially if someone is using them in transparent mode." (2026-09-30)

What's wrong now:
- The LEDs are 6-ish px beads in pastel inks; on the bone surface (and on frosted or transparent surfaces) their colour and the page mix, and waiting (amber) vs failed (red) are hard to tell apart at that size.
- The captions and badge words are the engraved label type in ink3, spaced wide, so they fade into the dotted stage; the badge plate is a near-white pill on a near-white page, held only by its shadow.
- Colour alone tells the states apart (live vs waiting vs failed).
- The Swift capture doesn't match the web: it says "Recognizer" where the web says "Sync", and its label font falls back to a serif monospace.

Direction:
- [x] **An LED reads on any ground**: a dark bezel ring (the LED sits in a small sunk socket) so the lamp has its own backdrop on light, dark, frosted and transparent surfaces; a lit lamp glows (a soft halo in its ink), an off lamp is a dull socket. Size up to 8 at default.
- [x] **Stronger, separable inks**: deeper, more saturated lamp inks tuned per colorway so live / waiting / failed / link read at a glance and for colour-blind people (check with simulated deuteranopia and protanopia).
- [x] **Not colour alone**: each state also differs in gesture (live steady, waiting breathing, failed a double blink, off dark) and the badge says the state in words.
- [x] **Badges hold their own ground**: the badge plate gets a defined edge (hairline plus shadow), and on transparent or frosted parents it switches to an opaque plate (`reduce-transparency` and a `solid` option); labels in ink2 at a readable size, not ink3 engraved.
- [x] **Transparent mode**: define it and test it: the status parts over frost, over images, and over the dark graphite colorway, in the captures.
- [x] **Tones**: a quiet badge (LED and words, no plate) for dense places, and a strong one (tinted plate in the state's ink) for alerts.
- [x] Make the Swift twin match the web example (same words, the label font from the tokens) and recapture it.
- Done (2026-10-06): the lamp sits in a sunk socket and glows; inks tuned per colorway and checked through deuteranopia and protanopia filters (worst pair ΔE 21); each state has its own gesture; `StatusBadge` `tone` quiet / plate / strong and `solid` for transparent mode; the Swift twin matches. IconButton, toolbar, chip, choice cards and the Fan now light the LED part's lamp (Chip.Lead `led` takes `LedKind`). Left: hover engraving, select, swatch and the calendar's today dot still use `--mu-led-green` and their own rings. The Swift mono role is Menlo now (all Swift captures re-run 2026-10-06).

## Toast: stack in depth

Owner, on the Toast page: "the stacking in toast is vertical; it should be 3D, it should appear to go behind." (2026-09-30) Now each new toast takes a full row above the last, so five identical toasts make a tall column covering the page.

- [x] **A deck, not a column**: the newest toast sits in front; older ones step back behind it, each a little smaller (scale ~0.95 per step), a little higher (a peek of ~8 at the top edge), and a little dimmer, so they read as cards going behind. Show at most three; the rest are counted, not drawn.
- [x] **Arrival pushes the deck back**: a new toast rises into the front (T6) on the object spring while every card behind moves back one step on the same spring, together, from the same frame.
- [x] **Hover or focus fans it out**: pointing at the deck (or Tab into it) spreads the cards into a readable column on the surface spring and pauses their timers; leaving folds them back into the deck.
- [x] **Dismiss**: swipe a front toast away (it follows the pointer, then leaves on release) or its close key; the next card comes forward.
- [x] **Repeats merge**: the same message again doesn't add a card: the front toast bumps (a small press) and shows a count ("×5").
- [x] **Reading and focus**: only the front card is read out (polite status); the deck is one landmark; F6 or a shortcut reaches it. Reduce Motion: cards cross-fade into place, no travel or scale.
- [x] **Placement**: the deck grows toward the screen edge it sits on (bottom stack peeks upward, top stack downward); tokens for step scale, peek, depth and visible count; Swift in step.
- [ ] **Follow-up: cards behind take the front card's width** (as Sonner does). Now a short front toast ("Gathered 4 notes") sits on wider cards that stick out on both sides. Also: the "+N" count floats detached above the deck; tuck it into the back card's edge. Swift fans out on hover only (add keyboard focus). The React error toast has no red mark while Swift has one.

## Tool strip: adapt to what was clicked

Owner, on the Tool strip's Swift capture: "this tool strip is static; it should be dynamic, adaptable to the node it's clicked on." (2026-09-30)

Now: `ToolStrip` takes a fixed `items` list (Tasks, Summarise, Gather, Region, Export | Send away); the page shows one set of worded verbs whatever is selected, and it doesn't place itself.

- [x] **Verbs come from the selection**: the strip asks what's selected and shows the verbs that apply: a text block (Tasks, Summarise, Region), an image (Lift subject, Copy, Crop), a link (Open, Copy link), a mix of kinds (only the verbs they share: Gather, Export, Send away), one item vs many (Rename only for one). An API like `verbsFor(selection)` or per-kind verb sets merged by intersection, with the order kept stable so muscle memory holds.
- [x] **Changing the selection morphs the strip**: when the verbs change, the strip's width settles on the settle spring, leaving verbs fade out, new ones fade in, and kept verbs stay in place (no jump); glyphs rather than words (the icons entry), names in tooltips.
- [x] **It places itself at the node**: anchored to the selection's bounds (above it, or below when there's no room; follows when the canvas pans or zooms; flips at screen edges), rising from the selection on the part spring as now.
- [x] **Overflow**: when the verbs don't fit, the rest go into a More key (`more`) at the end, before the destructive verb.
- [x] **States**: disabled verbs say why in the tooltip; a verb in progress shows the waiting language (the spinner entry) in its key; the destructive verb stays last, apart, and uses hold-to-confirm when irreversible.
- [x] Redo the page with a small canvas where clicking a text block, an image, a link or several shows the strip adapting; Swift twin in step and recaptured.
- Done (2026-10-06): `verbsFor(kinds, sets)`; the strip morphs on the settle spring when its verbs change (transforms only: the plate animates as two halves under a clip); `anchor` places it above or below the selection inside the parent; overflow goes into More; `disabledReason`, `state`, `hold` (Button's `hold` now also works on `strip-danger`); the page is a small canvas; SwiftUI in step. Left (SwiftUI): menus open below the key; the arrival doesn't reverse when the strip sits below.

## Cues (the in-text semantic marks): meaning, tags, motion, delight

Owner, on the Cue family page: "the icons are treated as secondary and a lot of the time don't signify what they relate to; #tag feels a bit weird; the other semantic chunks are okay but we need better UX for that semantic distinction, and better motion; this kind of intelligent stuff should delight the user and add a feeling of whimsy." (2026-09-30)

What's wrong now:
- The trailing life glyphs (the cup after "moodboard", the wave after "call the printer") sit after a middle dot in ink3, small and far from the words they explain, so they read as decoration; nothing says what they stand for (the mood? the kind of task?).
- `#poster` and `#studio` are grey pills that look like disabled chips or code, not like tags; two tag looks exist (filled and outlined).
- The kinds (date, duration, amount, sleep, colour, tag, link) differ only by underline style and colour, and several are close (dotted green vs solid green vs grey).
- Recognising a chunk has no moment: marks are simply there.

Direction:
- [x] **Glyphs say what they mean and sit where they belong**: a glyph attaches to the chunk it explains (a clock at "tomorrow 4pm", a coin at "$40", a moon at "slept 6h", a swatch of the actual colour at "#FF6B3D"), at full ink next to the words, with its name in a tooltip ("A meal · breakfast?"). The trailing "· glyph" pattern is for the whole line's kind only, and gets a label on hover.
- [x] **One grammar of kinds**: time (date, duration) → an engraved underline plus a clock glyph; money → a coin and tabular figures; body (sleep, steps) → a moon or a step; colour → a live swatch; link → the link chip; person → a small avatar. Each kind is one look, documented on the page as a legend.
- [x] **Tags as tags**: `#tag` becomes a small raised tab with a punched hole (a luggage tag), the hash kept as a quiet mark; the tag's colour is its own (stable hash to a palette); one look everywhere. Typing `#` shows the tags you've used.
- [x] **A moment of recognition (motion first)**: when a chunk is recognised as you type, its underline draws in from left to right (settle spring) and its glyph pops in beside it with a tiny overshoot (object spring); colour chunks bloom their swatch; money flips its figures on the drum into the formatted amount; dates show their resolved day as a chip that slides up and settles. Once, on recognition, never looping; nothing while the caret is still inside the word.
- [x] **Whimsy, with restraint**: a glyph's own act plays on first recognition (the cup steams once, the moon tilts, the coin spins a quarter turn); rare, short, and off under Reduce Motion; a tiny sparkle when an inferred cue is confirmed.
- [x] **Inferred vs confirmed**: inferred cues (the "FRI" chip at 0.82) read as a suggestion (dashed, ink2) until confirmed by a click or Tab; confirming stamps them solid with a small press.
- [x] **Raw vs cued**: the toggle between raw text and cues keeps every chunk exactly in place (already a rule); add the glyphs fading, not jumping.
- [x] Redo the page with a legend of kinds, a live typing demo that shows recognition, and the DialKit for the motion; Swift in step.
- Done (2026-10-06): glyphs at full ink before their words, named in the family's chip; one grammar (time, money, body, colour, person, link) with a legend; luggage tags hashed to six hues; recognition plays once after the caret leaves; one act and a sparkle on confirm; raw vs cued keeps every word in place; SwiftUI in step. Left: draw `coin` and `moon` (stand-ins used); Chip's `tag` variant should take the luggage look; Swift captures don't render life glyphs.

## Lasso demo: buggy selection and an unreliable trigger

Owner, on the Lasso page: "this demo is very buggy; applying the lasso keeps applying the selected state across the component; the trigger for the lasso was very unreliable." (2026-09-30)

Causes found in `apps/docs/src/ui/SnapCanvas.tsx`:
- **Native text selection runs with the lasso**: nothing stops the browser's own selection, so dragging paints the green text highlight over the notes' words and the size readouts ("call the printer", "150 × 64") on top of the lasso's selection. That's the "selected state across the component". Fix: `select-none` on the canvas and `preventDefault` on the lasso's pointerdown.
- **The trigger only fires on the world element itself** (`e.target !== e.currentTarget` in `worldDown`): pressing on the guides layer, on the canvas outside the scaled world (at 50 % most of the canvas), or on any child starts nothing. Fix: start from the canvas (`snap-canvas`), and treat any press that isn't on a note as empty space.
- **A drag that starts on a note moves the note** (right), but there's no feedback telling you where empty space is; the cursor should be a crosshair over empty space and a grab over notes.
- The selection frames and the size readouts both show for picked notes, so after a lasso the canvas is busy with readouts that belong to resizing; show the frame only.
- A click on empty space clears the selection (right), but Escape doesn't; add it, and Shift-lasso to add to the selection.

- [x] Fix the above in the demo, then check the Lasso instrument itself (`packages/metalui/src/components/lasso`) for the same assumptions and document the rules in its agent guide (empty-space start, no text selection, modifier keys).
- [x] An e2e slice that draws a lasso from several starting points (on the guides, outside the world at 50 %, next to a note) and asserts that no text gets selected (`getSelection().toString() === ''`).

## Cues you can operate: the interface molds inside the text

Owner, on the Provenance tooltip page ("Send #poster tomorrow 4pm, slept 6h in #done by #coffee"): "these should let the user interact and change them: slide up and down to change the number or unit; #done can rotate through its enum states; tomorrow → yesterday, today, then show dates; find opportunities where the interface molds inside the text itself." (2026-09-30)

Where it belongs: a recognised cue becomes a **component** (a control you operate, `docs/COMPOSITION.md`), living inline in text; the scrub feedback that shows only while you drag is an **instrument**. It builds on the Cue family and replaces nothing: at rest the text reads exactly as now.

- [ ] **Numbers scrub**: press and drag up / down on "6h", "1h30", "$40" to change the value (a pixel step per unit, Shift for bigger steps, Alt for finer); the digits turn on the drum; a tiny engraved scale appears beside the value only while dragging; arrow keys when focused. Units cycle with a horizontal drag or a key (h ↔ min, $ ↔ €), converting the value.
- [ ] **Enums rotate**: "#done" turns through its states (todo → doing → done → dropped) like a drum or a rotary switch: scroll, drag, or Space to step; the next state peeks above and below while held; its colour and glyph follow the state.
- [ ] **Relative dates slide**: "tomorrow" steps through yesterday / today / tomorrow / the weekdays, then real dates ("Fri 3 Oct"); the resolved date chip rides along; a long press opens the Calendar in a popover anchored to the words, and the chosen day writes back as words ("next Friday") when it can.
- [ ] **Times and durations**: "4pm" scrubs in 15-minute detents (part spring clicks, the haptic tick on a trackpad); "1h30" in 5-minute steps.
- [ ] **Colours**: "#FF6B3D" opens a swatch well; dragging on it shifts hue, with the text rewriting live.
- [ ] **Tags and people**: a tag cycles through your recent tags on scroll; a person's name opens a small picker.
- [ ] **The text stays the source**: every change rewrites the words in place (undoable as one step per gesture), the caret and layout never jump, and the line keeps its width through the change (the drum's footprint rule).
- [ ] **Affordance without clutter**: nothing shows at rest; on hover a cue's underline thickens and the cursor says it can move (ns-resize for numbers, a rotate cursor for enums); first-time hint in a tooltip ("Drag to change").
- [ ] **Accessibility**: each operable cue is a `spinbutton` (numbers, dates) or a listbox-like picker (enums) with a name ("Sleep, 6 hours"); keyboard does everything the pointer does. Reduce Motion: values change without the drum's travel.
- [ ] **Survey first**: go through every recognised kind (date, time, duration, amount, measurement, colour, tag, derived tag, link, person) and list what "changing it in place" means for each, before building; then build one kind at a time (numbers first).

## Snap guides: no haptic on the web

Owner, on the Snap guides page: "dragging on web doesn't trigger haptic feedback." (2026-09-30)

Facts: browsers expose no trackpad haptics on a Mac, and iOS Safari has no vibration API; `navigator.vibrate` works on Android only. The docs demo only counts taps ("haptic taps · 8 … the browser cannot") and doesn't even call `navigator.vibrate` where it exists. The Snap guides agent guide says: "Never replace a haptic with a sound or a flash."

- [x] **Call what exists** (done: `haptic()` and `setHapticBridge` in motion/haptic.ts; Snap guides only so far; the iOS switch path is untested on a real iPhone): a shared `haptic('alignment' | 'detent' | 'refusal')` helper in the motion layer: `navigator.vibrate` with a short pattern on Android; the iOS Safari (17.4+) trick of toggling a hidden `<input type="checkbox" switch>`, which plays the system tick, behind feature detection; a no-op elsewhere. Snap guides, Split pane detents, Slider detents and the operable cues (the entry above) all use it, once per catch.
- [ ] **In the Mac app**: the SwiftUI side already performs the alignment haptic; document how a web view host (Electron, Tauri, a WKWebView) bridges `haptic()` to `NSHapticFeedbackManager`, and ship that bridge as an optional hook.
- [ ] **Decide the fallback rule with the owner**: the guide forbids a sound or flash in place of a haptic. If the web should still *feel* the catch, the candidate is the line's own catch motion (the guide lighting with a tiny overshoot), which is already there, not a new sound. Record the decision in the guide.
- [x] Make the demo honest and useful: it calls `haptic()`, says which path this browser took ("vibrated", "iOS tick", "no haptics here"), and keeps the tap count.

## Library gaps found by building blocks

Building real screens shows what the components lack. Each was worked around inside the block; fix it in the library, then remove the workaround.

- [x] **Button**: `cap="primary"` ignores `size="compact"` (the AI composer's send key is 32 tall beside a 28 Select). (Primary and destructive take the compact size and keep their cap, as SwiftUI already did.)
- [x] **ScrollArea**: no way to reach the viewport or listen to scrolling (a `viewportRef` / `onScroll`); the AI composer finds `.mu-scroll-area-viewport` by class.
- [x] **Icons**: no `send`, `stop`, `attach`, `retry` glyphs (the composer uses arrow → rectangle, plus, redo); add them with the icons entry's D list. (Drawn, each with its act; the composer uses them, and Send ↔ Stop morphs at strain .5.)
- [x] **Motion**: no exported helper for "is motion reduced here" that covers both the OS setting and the site's motion switch; blocks read `--mu-travel-settle === 0`. Export one (`useReducedMotion()` or `motionReduced(el)`).
- [x] **Tooltip swallows the first Escape** on a focused trigger (Base UI's trigger), so a panel around it never hears ⎋; the share panel listens in the capture phase. (Decided: correct. Base UI stops ⎋ only while the tooltip shows, which WCAG 1.4.13 asks for; documented in the tooltip guide with the capture-phase way out.)
- [x] **DropZone compact** doesn't truncate its title: at narrow widths it runs into "or choose files". (Now the words clip to one line each; the description ends in an ellipsis.)
- [x] **SwapText can't end in an ellipsis**: its layers keep the measured width for the drum, so a clipped SwapText (DropZone compact's title) is cut mid-word ("Add image" for "Add images") instead of "Add ima…". Let it shrink and truncate when its box is narrower than the text. (The drum never outgrows its container and a face truncates with an ellipsis: "A…" in a 200 px zone. Tested on the DropZone page.)
- [x] **Attachment**: its error line wraps beside Try again when narrow; its fixed max width fights a full-width list. (The line truncates with the reason in its title and alert; `fill` drops the max width.)
- [x] **Attachment**: no hook for the rows below to close up after it leaves (with the shared row-leave helper below). (It leaves with `leaveRows`; a host list moved by `useRowMotion` closes up, as the share panel's files do.)
- [x] **A shared row-leave helper**: the release-spring leave lives only inside Attachment (with its own reduced-motion check); lists of people, files and rows need it too. Note the release travel stays full under Reduce Motion by the token; decide whether that's right. (`springOf`, `leaveRows`, `useRowMotion` in `motion/rows.ts`, exported; both blocks drop their copies; on the Motion page as Rows in a list. Decided: under Reduce Motion a row goes at once, since leaving is travel; the release token stays whole for presses.)
- [x] **Switch** has no `label` prop; blocks wire `aria-labelledby` and make the words toggle it by hand.
- [x] **Calendar bug: a day from the next or previous month can't be chosen with the pointer.** Pressing it focuses it first, which turns the month and removes the button before the click lands. The availability picker stops the focus on mouse-down as a workaround. Fix in the Calendar and test it.
- [x] **Calendar doesn't follow a controlled `value` into another month** (it keeps showing the old month); the availability picker remounts it. Add `month` / `onMonthChange` (also in the Calendar entry) and follow `value`.
- [x] **Calendar: no per-day unavailable predicate** (`isDateUnavailable`, already in the Calendar entry); the availability picker greys days with a scoped style keyed to aria-labels, which is fragile. (Added; the picker uses it and its scoped style is gone.)
- [x] **Toggle has no radio-group form** (one latched key of several, like time slots); the library doesn't export Toggle's classes, so the block copies them. Add a `ToggleGroup` single-choice mode or a `RadioKeys`. (`RadioKeys` / `RadioKey` in the toggle module: radio semantics with the latching key. The picker uses them and its copied classes are gone.)
- [x] **Button has no waiting or done state** (see the Spinner entry: the wait lives in the key); blocks hold the key down and mark it `aria-disabled` by hand. (`state`: ready / waiting / done, as the Spinner entry's "on an action" placement; SwiftUI `.metalButtonState`. The settings block uses it. Not yet: the minimum time on screen once the arc shows, with the Spinner entry's timing rules.)
- [x] **Toast's Undo shows ⌘Z but binds nothing**: the keycap promises a shortcut the toast doesn't handle; bind it (for the page's last undoable change) or let the host pass it. (⌘Z / Ctrl+Z runs the newest undoable toast's Undo, once; fields and a host that calls `preventDefault` keep theirs. Undo now also closes its toast, as SwiftUI's did.)
- [x] **ToolStrip** items take no icons, no menu trigger and no leading count; the task inbox rebuilds the strip from Base UI Toolbar. Extend `ToolStrip` (with the Tool strip entry above). (Items take `icon`, `iconOnly` and a `menu`; the strip takes a `count` and a `wordClassName`. The inbox uses ToolStrip; the page shows it Over a list. SwiftUI's strip hasn't caught up: noted in the guide. The Tool strip entry's adaptive verbs are still open.)
- [x] **Button strip / graphite / link caps don't size an `icon`** (noted with the icon slot); blocks pass `size-16`.
- [x] **Icons: no person / assign glyph** (the `me` glyph reads as a chart); add `person`. (`person`; the inbox's Assign and the settings Profile use it.)
- [x] **Icon: no way to play a glyph's act on demand** (a celebration, a result): add `play()` via a ref or an `act` prop; the inbox dispatches a synthetic click. (`act`: plays whenever it turns to a new truthy value, `act` alone on arrival; StrictMode-safe. The inbox uses it; the Icons page shows it under On cue.)
- [x] **AlertDialog.Popup** doesn't type Base UI's `finalFocus` (it passes it through); type it.
- [x] **Avatar**: no accessible label separate from the name its initials come from. (`label`; `''` makes it decorative.)
- [x] **Row**: no selected / opened state for a list row; blocks borrow the option rail classes. (`selected` raises any variant, `opened` carries the rail; SwiftUI too. The inbox uses them.)
- [x] **Task inbox polish**: while selecting, the selection box (14) and the completion box (16) sit side by side and look alike; make completion a distinct task dimple or a status glyph, or show selection only as the row's plate. (Selection is round, completion stays the task's square dimple, and the selected row takes Row's raised plate.)
- [x] **Icons blocks keep missing** (highest-value icon work; with the icons entry's D list): `person`, `bell`, `palette`, `save`, `send`, `stop`, `attach`, `retry`, `download`, `upload`. The settings block shows a chart glyph for Profile, a clock for Notifications and a document for Save because nothing better exists. (All ten drawn and in use: settings shows person, bell, palette and save.)
- [x] **Sidebar item icons take their own Tab stop in Chrome** (also on /components/sidebar). Cause: an `Icon` outside any `.mu-icon-trigger` put its focus listener on the bare svg, which Chrome then makes focusable. Fixed in `Icon`; Sidebar items are icon triggers now.
- [x] **Textarea**: its text is 15px (content type) beside Field's 12.5px, so a bio looks louder than name and email; add a `size` matching Field. Its counter only shows from 80 % with no per-instance option and reads the threshold from the document root. (`size` large/regular/compact; `countFrom`; the threshold reads from the textarea's own element; the counter is now linked by `aria-describedby`, as the guide already claimed.)
- [x] **Portalled popups ignore a colorway set on a parent** (Select, Menu, Popover open in the page's colorway inside a graphite block); let them inherit (portal into the nearest colorway root, or copy `data-mu-colorway`).
- [x] **Tabs has no vertical orientation** (settings sections use Sidebar items instead). (`orientation="vertical"`: a column with concentric corners, ↑ ↓, the panel from above or below; SwiftUI too. The settings block keeps its Sidebar items, a navigation look, until someone decides otherwise.)
- [x] **RadioGroup disabled**: the checked radio stays in the Tab order; decide (reachable to explain, or skipped) and document. (Reachable, as the settings block's held frequency needs: one stop on its choice, marked disabled, its description saying why. Shown on the Radio page, documented and tested.)
- [x] **Container queries in blocks**: unnamed `@container` matches the nearest container; blocks should name theirs (`@container/block`). Write it into the block page guide. (Every block names its container; the rule is in `docs/DOCS_ARCHITECTURE.md`, block page.)
- [x] **AI composer polish**: the thread's top edge fade leaves a half-cut message header just under the "Assistant" title; start the fade below the title or pad the first message. (A hairline fades in under the title while the thread runs under it, so the faded line reads as passing beneath.)

## Bundle weight: one glyph pulls the whole icon catalog

- [x] `Icon` imports the whole catalog, so any component with one glyph ships every glyph: Table 122 KB gzip, Combobox 111, ToolStrip 95, Card 79, Link 67 (2026-10-06, fresh build). Split the catalog per glyph (each `<Name>Icon` and `Icon name` resolving only what it draws), then put ceilings on these in `scripts/bench-bundle.mjs`. Button's ceiling went from 9 to 10 KB the same day for `state` and `hold`.
- Done (2026-10-06): one glyph ships one glyph (per-glyph records and morph parts; `MorphPair` takes only the parts it is given; `<Icon name>` still works for apps). Gzip KB, fresh build: Table 122 → 93, ToolStrip 95 → 71, Card 79 → 54, Link 67 → 43, DatePicker 89 → 65, AlertDialog 57 → 33, Fan 41 → 17, Calendar 37 → 13, `DownloadIcon` ~27 → 2.7; ceilings set. Breaking: Table's action `icon` is an element now. Left: Combobox (112) and QuickEdit still ship the catalog because their items take a glyph *name* that morphs into the well — decide an API that passes the glyph itself.
- [x] Combobox and QuickEdit: take the glyph itself (record and morph parts) instead of a name, so they stop shipping the whole catalog. (Done 2026-10-06: `GlyphParts` = `{ glyph, morph }`; Combobox 112 → 81 KB gzip, QuickEdit 37 → 32, Tree 81 → 75; breaking, in the CHANGELOG.)

## Docs console: "NaN is an invalid value for width"

- [ ] Seen on several docs pages (Collapsible, Stepper) as of 2026-10-06; not from either component. Find the width written from an unmeasured element and guard it.

## Tests that fail only under a full parallel run

- [ ] `xray-dialog-editing` "pulling the dialog up…" and `toast` (deck, undo) and `region`, `scroll-area`, `slider-states` focus ring, `spinner` (whole place, known or unknown), `toggle`, `tooltip`: each failed once in the 4-worker full run (2026-10-06) and passed alone. Also `drop-zone` (reduced motion), `memory-scrubber`, `progress` (Reduce Motion), `table` (sorts, graphite), in the 3-worker run that closed wave 2; all passed alone. Wave 3's run added `cue` (reduced motion tick), `fan` (graphite), `icon-turn`, `icons` (acts from keys), `scroll-area` (bar leaves), `table-should` captures: all passed alone. Find the race in each (AGENTS.md: sample with rAF, poll), don't retry.

## Variation sheets: existing components

Bhupesh Gupta: "don't you think we should plan variations as per our aesthetic, what looks good for us … maybe both are needed"; "write the sheets for those components first … think new out of the box ideas also." (2026-10-06)

How these were made: ReUI, shadcn, Base UI, React Aria, Apple's HIG, Figma, FabFilter, Raycast, Things and Geist were read for the **jobs** their variations do; each job was then given our form (materials, springs, the drum, LEDs, two colorways), marked as already covered, or dropped with the reason. Ideas of our own are marked *ours*. Review a sheet before its component is built; each `Decide` is a choice for the owner. Every item ships React, SwiftUI, the agent guide, the page and a test together, so a variation has to earn its place.

LED meanings stay the library's: green live, amber waiting or urgent, red failed, blue a link's kind. No sheet invents new LED colours. Sizes use the field ladder's names: large 44, regular 32, compact 28.

### Number field

Now: one size (32); a well pill with − and + keycaps; the value turns on the drum; drag the label to scrub; a refusal shake past the limits; typing commits on blur. SwiftUI is a stock `Stepper` (whole numbers only).

- [x] **SwiftUI first**: `MetalNumberField` rebuilt to match (the well, keycaps, drum, `Double` values, `format`, scrub). No variation below ships on one platform.
- [x] **Sizes** (ReUI sm/lg): `size` large / regular / compact, the same heights and radii as `Field`, so a number sits level with the fields beside it.
- [x] **Fine and coarse steps, shown** (Base UI `smallStep`/`largeStep`, HIG Shift-click): Alt steps fine, Shift coarse; *ours*: while a modifier is held, the keycaps' legends turn on the drum to "×0.1" / "×10", so the step size is visible, not a hidden rule.
- [x] **Units printed, not typed** (React Aria `formatOptions`, Geist suffixes): `unit` ("px", "%", "°") engraved after the value inside the well in ink3; `format` for currency and locale. Typing "12px" or "50%" is understood.
- [x] **Soft limits while typing** (Base UI `allowOutOfRange`, React Aria "validate"): a typed value past a limit is kept and shows the invalid ring with the limit said under the field ("Up to 100"); the keys and the scrub still clamp with the refusal shake.
- [x] **Back to default** (FabFilter Cmd-click): double-click the label, or ⌘-click a key, turns the value back on the drum to `defaultValue`; *ours*: the field shows the shared `changed` mark (see Field) while it is off its default.
- [x] **Mixed** (Figma "Mixed"): `mixed` for a multi-selection with different values: "Mixed" in ink3 on the drum; a step applies to each item (the host's job, documented); typing sets them all.
- [x] **Inspector kind** (*ours*, after Figma's letter labels): `kind="inspector"` for tight panels: no keycaps; a one-letter or glyph label (W, H, X, °) engraved inside the well's start is the scrub handle, with the resize cursor; regular and compact only.
- [x] **Wheel, only when asked** (Base UI `allowWheelScrub`): opt-in, and only while focused, so scrolling a page never changes a value.
- [x] **Expressions with a readback** (Figma maths): typing `+10`, `*2` or `=8*12` shows the result under the field in the shared `Readback` line (see Field) before it commits on Enter or blur.
- [x] **Thumbwheel kind, prototype first** (*ours*): a detented wheel standing out of the well's edge, one detent per `step`, a heavier tick at each `largeStep` (part spring; a haptic on Swift where the hardware has one). For values you set by feel (zoom, brush size). Prototype on the page; ship only if it reads better than scrubbing.

Not doing: ReUI's "custom button layouts" (one look: − value + or the inspector); Figma's four scrub speeds by cursor position (hidden; modifiers are shown instead); Shift for fine steps (audio gear) — it clashes with Base UI and the HIG, where Shift is coarse.

Decide: is the thumbwheel worth a prototype now, or after the rest?
- Done (2026-10-06). Decisions: the legends show the signed step ("−0.1", "+10"), not "×10"; the thumbwheel was prototyped and should not ship (a second gesture for the scrub's job, an 18 px target, detents you can't feel on a desktop) and stays on the page as a prototype. ⌘⌫ goes back to default; `smallStep` defaults to a whole `step`; `NumberFieldSize` exported. Left: SwiftUI legends and modifiers are macOS only.

### Combobox

Now: `items: string[]`; regular and compact; the menu's frosted plate, one gliding highlight, a clear mark, "No matches". No groups, item details, multiple values, loading or failure. SwiftUI is a `TextField` with plain buttons.

- [x] **SwiftUI first**: `MetalCombobox` with the plate, the gliding highlight and the clear mark.
- [x] **Items with detail** (ReUI avatars, shadcn custom items): items as `{ value, label, description?, icon? }`, drawn as `Row`s (glyph or avatar, a second line in ink2), so similar items can be told apart.
- [x] **Groups** (Base UI, shadcn, React Aria sections): engraved group labels in the plate, staying at its top while their rows scroll; long lists virtualised (Base UI).
- [x] **Matches you can see** (*ours*): the typed letters in each row in full ink, the rest in ink2, so you see why a row matched.
- [x] **Three empties, told apart** (ReUI async, research): *loading*: the small ring in the trailing slot in place of the clear mark (the Spinner entry's "In a field"), the rows kept and dimmed; *failed*: a row with `sync-error`, "Couldn't load", and Try again; *nothing matched*: "No matches for 'lisb'" with the query in it.
- [x] **Several values** (Base UI and shadcn chips, HIG token fields): `multiple`: chosen values become `Chip`s in the well that land on the object spring; the query stays and the plate stays open after a pick; Backspace on an empty query selects the last chip and a second Backspace removes it; chips leave with the rows' motion (`useRowMotion`).
- [x] **Create what's missing** (Base UI creatable, React Aria custom value): `onCreate`: when nothing matches exactly, the last row is `plus` + "Create 'Lisbon'", set apart by a hairline, so it can't be mistaken for an existing item.
- [x] **Recent before typing** (Raycast `storeValue`, React Aria `menuTrigger="focus"`): `recent` items shown under an engraved "Recent" label on focus, before anything is typed.
- [x] **Commands at the end** (React Aria `onAction`): action rows ("Manage labels…") after the items, behind a hairline, each leading with its glyph.
- [x] **From a button** (shadcn popup from a button): `trigger="button"`: a key opens the plate and the search sits inside it; for pickers in toolbars and rows (the task inbox's Assign).
- [x] **The pick shows its kind** (*ours*): a chosen item with an `icon` shows it in the well's leading slot, morphing from the search glyph.

Not doing: a drum or rolodex results list (curved neighbours are harder to scan in a long list, and the fixed highlight fights groups); recents as a strip of keycaps above the list (a second way to choose in one control); free values that aren't in the list (that's Autocomplete, a separate entry).

Decide: `trigger="button"` here, or a separate picker component?
- Done (2026-10-06). `trigger="button"` stays in Combobox (same filter, rows and empties). No virtualiser (Base UI needs a dependency): `limit` (100) and a line saying how many more match. Chips are neutral, not the suggestion chip. Left: chips after a removed one close the gap at once (row motion is vertical only); SwiftUI's plate overlays below the field and its chevron rotates; no x-ray card.

### Table

Bhupesh Gupta: "table or data grid still needs proper variations, there are so many ways data is shown in tables … think practically what's important, leaving the noise and capturing the needed." (2026-10-06)

Now: columns with sort (the arrow turns, rows travel to their places), row selection with a green tint, a hovered row sinks, engraved labels and hairlines, an empty line; rows 40, head 32. SwiftUI is a stack of rows with dividers.

Plan it by the **kind of data**, not by features: each kind below is a real situation with its own needs, and the features are what those kinds share. Tiers: **Must** (most products hit it), **Should** (common, after Must), **Later** (big, or rare).

**Kinds of table**

| Kind | Real examples | What it needs | Tier |
|---|---|---|---|
| **Records**: one row per thing you can open | invoices, issues, users, files, deployments | a primary column (name and a second line), status, person, date; open a row; row actions; select and act on many; sort; a visible filter; pages; loading and empty | Must |
| **Numbers to compare** | balances, usage, line items, analytics | numbers aligned, units in the header, deltas, a totals row | Must |
| **Grouped** | issues by status, payments by day | group header rows with a count, collapsible, a subtotal per group, the group header staying while its rows scroll | Should |
| **Comparison matrix**: both axes are headers | plans × features, roles × permissions | row headers, the first column and the header pinned, yes/no as glyphs; cells that are checkboxes for a permissions matrix | Should |
| **Live log**: rows keep arriving | CI output, audit log, events | new rows arrive at the top without moving what you're reading ("4 new" to jump up), a level LED, time, monospaced ids, many rows | Should |
| **Hierarchy** | folders, accounts, an org | expandable rows with indent guides | Later (after Tree) |
| **Editable grid** | price lists, bulk edits | cell focus, editing in place, copy and paste ranges | Later (the data grid) |
| **Properties**: label and value pairs | a receipt, a details panel, specs | two columns, no header | Must, as its own small `Properties` part (a `<dl>`), not a table |

**Cell kinds** — the most useful variation is a fixed vocabulary of cells, so every table in a product reads the same. A column says its `kind`; the kind sets alignment, type and the empty look.

| Kind | Look |
|---|---|
| text | truncates with an ellipsis, the whole in a tooltip; an optional second line in ink2 |
| number, currency, percent | tabular figures, end-aligned, the unit in the header ("Size (MB)"); a real minus sign, never red alone |
| delta | the sign and an up or down glyph with the value; green or red ink only on top of the sign |
| date, time | relative ("3 h ago") with the exact time in a tooltip, or a fixed short format; tabular |
| status | an LED and its word (live, waiting, failed, off), the library's LED meanings |
| person | avatar and name; several as overlapping avatars and "+2" |
| tags | up to two `Chip`s, then "+3" |
| progress | a slim `Meter` sized to the row |
| trend | a `Sparkline` sized to the row |
| yes / no | `check` for yes, nothing for no; never a red cross |
| id, code | monospaced; a copy key on hover |
| actions | a `more` key at the row's end, shown on hover and on keyboard focus |
| empty | "—" in ink3 in every kind |

**Must**
- [x] **SwiftUI first**: `MetalTable` with the header, sort, selection and the cell kinds.
- [x] **Properties**: a small part for label and value pairs (a `<dl>`): engraved labels, values in the cell kinds' looks, regular and compact; SwiftUI in step.
- [x] **Cell kinds**: the vocabulary above as `kind` on a column, with `unit`; `cell` stays for anything else.
- [x] **Density**: `density` roomy 48 (touch, iOS) / regular 40 / compact 32.
- [x] **A reading guide, not stripes**: one plate glides under the hovered or focused row on the settle spring (the menu's `ListGlide`), keyboard included.
- [x] **Sticky header** in a scroll container.
- [x] **Open a row**: `onRowAction` on Enter and click; the opened row takes `Row`'s `opened` rail.
- [x] **Row actions**: the `actions` cell opens a `Menu`; one primary action may show as a key on hover.
- [x] **Many rows at once**: selection shows a `ToolStrip` with the count on the drum (the strip's "Over a list"); a documented pattern.
- [x] **Filtered is visible**: the caption says "12 of 240" (drum) with a Clear key whenever the host filters.
- [x] **Pages**: `Pagination` under the table for records; "Load more" for feeds. Infinite scroll only with virtual rows (Later).
- [x] **Waiting and empty, told apart**: `loading` (`Skeleton` rows in the columns' widths), `empty` ("No invoices yet" and its action), `emptyFiltered` ("Nothing matches" and Clear), `error` (`sync-error`, Try again).
- [x] **Narrow widths**: each column has a `priority`; as the block narrows (`@container/block`), the lowest-priority columns leave first and their values move to a second line under the primary cell. No sideways scroll for records.
- Must done (2026-10-06): every cell kind (`kind`, `unit`, `TableCell` exported), densities 48/40/32, the gliding guide, the sort arrow morphs, sticky head, `onRowAction` with the rail, row actions, "12 of 240", loading/empty/filtered/error, `priority` for narrow widths (`@container/table`, 720 and 560), `Properties` (a Part; the host passes a `TableCell` as its value), a real `MetalTable` and `MetalProperties`. Left (SwiftUI): the guide follows hover only; the sort arrow rotates; avatars scale until `MetalAvatar` has sizes.

**Should**
- [x] **Totals**: `footer`, a sunk readout row, sticky; totals turn on the drum when rows change.
- [x] **Grouped rows**: `groupBy` with engraved group headers (the name and a count), collapsing with a chevron on the part spring, subtotals, the header sticky under the table header.
- [x] **Pinned first column**: `pin: 'start'` on the raised plate; a shadow at its edge only while content is under it (the composer's scrolled hairline).
- [x] **Row headers and a matrix**: `rowHeader` column (`<th scope="row">`); yes/no cells; checkbox cells for a permissions matrix.
- [x] **Live rows**: new rows arrive with the rows' motion (`useRowMotion`); if you've scrolled down, they wait behind a "4 new" key at the top instead of pushing you.
- [x] **Row detail in place**: `expandRow` opens a panel under the row (the error row's grow, settle spring) for a little more without leaving the list.
- [x] **Columns to hide and size**: hide and show from a column `Menu` with checkboxes; drag the hairline between headers to resize (it thickens to a grip, part spring); `onColumnsChange` so the host keeps them.
- Should done (2026-10-06): `total` (sum, mean, a function) in a sticky sunk footer on the drum; `groupBy` with sticky `rowgroup` headers, chevrons and subtotals; `pin: 'start'` with a shade only while scrolled under; `rowHeader` and a `check` kind for a permissions matrix; `live` rows behind "N new"; `expandRow`; `columnsMenu` and `resizable` with `onColumnsChange`. The head, group headers and pinned cells are opaque frost (blur doesn't apply on table cells). Left: `Menu` should get its own `MenuCheckboxItem`; SwiftUI `total` takes no function and live rows can overlap while landing.

**Later**
- [ ] Tree rows (after Tree, sharing its parts).
- [ ] Virtual rows for very long lists, then infinite scroll.
- [ ] The data grid: arrow keys between cells, editing in place, cell ranges with copy and paste, reordering columns (after Sortable).

Not doing: striped rows (the reading guide does it); full cell borders (they come with the editable grid, where cells are targets); ReUI's "light, rounded rows" look (the hover plate is already rounded); colour-only cells such as heatmap tints or red negatives (a sign or a glyph always carries it); a coloured sort LED per header (green and blue already mean other things); sideways scrolling as the answer to narrow screens.

Decided (Bhupesh Gupta, 2026-10-06): a roomy 48 density, yes; `Properties` now; live rows stay in Should.

### Card, and a frame of cards

Now: the raised surface; `Card.Media`, `Title` (a link stretched over the card), `Description`, `Footer`; a linked card lifts one step on hover; selected has the green ring. No sizes, header action, status, waiting, or side-by-side media. SwiftUI is a plain rounded rectangle.

- [x] **SwiftUI first**: `MetalCard` on the raised recipe, with media, a link, the lift and selected.
- [x] **A corner action** (shadcn `CardAction`): `Card.Action`: a ghost icon key (`more`) level with the title's first line, above the stretched link.
- [x] **Size** (shadcn `size="sm"`, ReUI spacing): `size` regular (16) / compact (12).
- [x] **Media at the side** (research): `orientation="horizontal"`: square media at the start, for result lists.
- [x] **Status** (*ours*): `status` live / waiting / failed lights an LED in the card's top-right corner, with the word in its accessible name and tooltip, so a wall of cards can be scanned for trouble.
- [x] **Choice cards that latch** (shadcn choice cards; *ours*: the icon key's latch): a card as a radio or checkbox; the chosen one sinks and stays down with the 4 pt green LED, the same latch as `IconButton`'s tool.
- [x] **Waiting**: the Spinner entry's "On a large item" (the card's own shape waits), not a spinner in the middle.
- [x] **A frame of cards** (ReUI Frame), in our materials:
  - *separated*: a sunk tray (well) that holds raised cards: peers to compare;
  - *stacked*: one raised plate with engraved hairlines between its sections: parts of one whole (a settings page);
  - *ghost*: the cards with no tray;
  - `size` regular / compact, as the cards.
- [x] **An empty slot** (*ours*, from a rack): an empty place in the tray, sunk, with `plus` and a verb ("New canvas"); it shows where a new card will go.

Not doing: screws, rack ears or other ornament (decoration with no job); a custom radius per frame (one look); a large spacing.

Decide: name the frame `Card.Frame`, `CardTray` or `Frame`?
- Done (2026-10-06). The frame is `Card.Frame` (a slot of the Card object: it arranges peers, you don't go into it); the status LED sits at the end of the title's line (a corner lamp collides with the action at compact). Left (SwiftUI): stacked sections clip the waiting edge at the outer corners; a footer without media needs `media: { EmptyView() }`; `MetalCardChoice` has no horizontal; frame items don't stretch to equal heights.

### Field and FormField

Now: `Field` (Root, Icon, Input, Trail) in large / regular / compact and two tones; `FormField` (label, description, error) whose error row grows open; `Fieldset`, `Form`. No prefix or suffix, side-by-side labels, required marker or readback. SwiftUI has no `MetalField` (meta.json points at a missing file), and `MetalFormField` is a plain stack.

- [x] **SwiftUI first**: write `MetalField` (the well, the sizes, the caret) and a real `MetalFormField` (the error row's motion, `Fieldset`).
- [x] **Fixed parts of the value** (shadcn input group, Geist prefixes): `Field.Prefix` / `Field.Suffix` ("https://", ".com", "$"), engraved in ink3 inside the well, not selectable, not part of the value; pressing them puts the caret in the input.
- [x] **Keys inside the field** (shadcn addons): `Trail` holds mini keys with a documented set: clear (`close`), copy (`copy` → `check`, a morph), show password (`eye` → `eye-off`, glyphs still to draw), and a working ring.
- [x] **A shortcut hint that knows** (Geist): a ⌘K keycap in the trail that turns on the drum to "Esc" while the field is active; Esc clears.
- [x] **Errors at the right moment** (Geist, Raycast, HIG): the default checks on blur and clears the error as you change the value; documented as the rule. A remote check that passed ("name available") shows `check` acting in the trail; ordinary valid fields show nothing.
- [x] **Labels beside the field** (shadcn orientation): `FormField` `orientation` vertical / horizontal, horizontal turning vertical when its block is narrow (the `@container/block` rule).
- [x] **Required or optional**: mark the minority: "Optional" in ink3 after the label when most are required, or a required dot when most are optional; never both.
- [x] **Changed** (*ours*): a small engraved mark before the label of a field changed since it was saved (and Number field's "off its default"), so you can review what you touched before saving; Settings uses it.
- [x] **Readback** (*ours*, after Things and synth value screens): `FormField.Readback`: a line under the field in the readout type, turning on the drum, saying what was understood ("Tue 8 Oct, 08:00", "= 96"); for dates in words, expressions and units.
- [x] **A counter** (shadcn addon counter): `Field` gets Textarea's counter (`maxLength`, `countFrom`), the same look.
- [x] **Sized to what goes in** (HIG): `chars` sets a field's width to an expected length (a postcode, a year), so the box says how much to type.

Not doing: prefix and suffix printed outside the well (they break the column of wells in a form); a green LED on every valid field (noise; only a remote check earns a confirmation); addons above and below the input (Textarea's toolbar belongs to Textarea). One box per character (OTP) is its own component in section 2; take its keycap slots from there.

Decide: is `chars` worth it, or is a width class enough?
- Done (2026-10-06): `MetalField`, `MetalFieldset` and a real `MetalFormField`; `Field.Prefix`/`Suffix`, `Field.Key`/`Clear`/`Check`, `Field.Shortcut`; validate on blur; `orientation` (its own `@container/form-field`, stacking under 400); `FormField.Label mark`; `ChangedMark` and `FormField.Readback` exported for reuse; the counter and `chars` (kept: a class can't say "a postcode is 8"). Copy and show-password keys done the same day (`Field.Copy`, `Field.Reveal`; the host passes the glyphs). Left: Number field, Table and Settings adopt `ChangedMark`.

## Components other libraries ship that we don't

Bhupesh Gupta: "compare our design system with reui, what all components are there which are missing in ours", then the same against shadcn/ui. (2026-10-05)

Compared with [ReUI](https://reui.io/docs) (its 25 extras on top of shadcn) and [shadcn/ui](https://ui.shadcn.com/docs/components) (64 components). Place each in the six layers (`docs/COMPOSITION.md`) before building it; some below are Objects or Places, not Components. Date ranges, range presets and time are already in the Calendar entry above.

Each entry lists the variations ReUI shows on its page (checked 2026-10-05); take them as the checklist when the component is built, not as a spec to copy.

### 1. Small, used everywhere (in both libraries)

- [x] **Alert**: an inline message in the page. (Built 2026-10-06; sheet in `docs/sheets/alert.md`. Left: draw `info` and `warning` — `note` and `bell` stand in; a SwiftUI capture on the page.) Today only `AlertDialog`, `Toast` and `StatusBadge` exist.
  - Kinds: default, info, success, warning, destructive, invert.
  - Parts: icon, title, description, actions (`Alert.Title`, `Alert.Description`, `Alert.Action`); title only, description only, or all of them; a long message that wraps.
- [x] **Badge**: a plain label or count. (Built 2026-10-06 as a Part; sheet in `docs/sheets/badge.md`: Badge describes, Chip is acted on, StatusBadge is the system speaking. `Badge.Anchor` puts a count on a control's corner.) `Chip` and `StatusBadge` are both specialised.
  - Tones: default, secondary, info, success, warning, destructive, invert; each as solid, outline and light (soft).
  - Sizes xs, sm, default, lg, xl; default or full radius.
  - With an icon, an icon button (remove), a dot (our LED), or as a link.

### 2. Common form and data controls

- [x] **Tree**: nested rows that expand and collapse, with keyboard navigation (ARIA tree pattern). (Built 2026-10-06; sheet in `docs/sheets/tree.md`: flat rows with `aria-level`, selection never follows focus, loading in the chevron's slot, F2 renames with QuickEdit; `Tree.Guides` and `Tree.Disclosure` exported for Table and the Cascader. Left: drag to move (on Sortable), virtual rows, a `folder` glyph pair.)
  - Guide lines per level; folder open, folder closed and file icons; chevron or plus/minus toggles; `indent` per level; drag to move with a drop line.
- [x] **Sortable**: drag to reorder, with a keyboard path. Nothing in the library reorders today. (Built 2026-10-06 as an Instrument; sheet in `docs/sheets/sortable.md`: live reorder, `onValueCommit(next, previous)` rolls back a failed save; `useSortable` for Tree, Kanban, Table columns and uploads; `useRowMotion` now glides sideways too. Left: between lists (Kanban), into a level (Tree), several at once, right-to-left keys.)
  - Vertical list, horizontal, grid with mixed sizes, nested levels; a grip handle or the whole item; disabled items.
  - `onValueCommit` with the previous order, so a failed save can roll back.
- [x] **Stepper** (ReUI) / **Questionnaire** (shadcn): the steps of a wizard. (Built 2026-10-06; sheet in `docs/sheets/stepper.md`: an ordered list with `aria-current="step"`, not tabs; linear by default; panels stay mounted; the groove fills by transform; "number only" and "progress across" are Progress `steps`. Left: SwiftUI Back/Continue slots and the narrow line; a skipped optional step, per-step icons, a compact size.)
  - Step states: inactive, active, completed, loading, disabled; custom indicators per state.
  - Layouts: number only, title, title and bar, title and status, title and description, title inline beside the indicator; horizontal and vertical.
  - Controlled or not; a progress bar across the steps; a panel per step.
- [x] **Time picker**: see "Time" in the Calendar entry. (Built 2026-10-06; sheet in `docs/sheets/time-picker.md`: an ISO time string; a typed field with readback and slot keys; unavailable slots stay choosable like Calendar's; DatePicker takes `time`. Left: scrubbing a part, SwiftUI ↑/↓, converting zones.)
  - In a popover, or typed by segment; 12 or 24 hour; hour, minute or second granularity; AM/PM before or after.
  - Steps (every 15 minutes), opening hours (`min`/`max`), unavailable slots; a start and end time pair; a time zone label.
  - Now, Clear, and Confirm before applying; localised labels; a form field with validation; date and time together.
- [x] **Input OTP** (shadcn): one box per digit for a one-time code; paste fills all of them. (Built 2026-10-06 as `CodeField`; sheet in `docs/sheets/code-input.md`: Base UI's OTP field, one input per slot, autofill on the first; keycaps spring in, paste ripples; a wrong code shakes once and stays; `CodeField.Resend`. Left: SwiftUI edits only at the end; WebOTP.)
- [ ] **Phone input**: a country picker plus number formatting; E.164 value; a default country; sizes sm, default, lg; disabled.
- [x] **Rating**: stars; half stars from decimals; the number shown beside them; editable or read-only; `max`; sizes sm, default, lg. (Built 2026-10-06; sheet in `docs/sheets/rating.md`: detents, not stars — the slider's groove cut per point, decimals fill exactly; a radio group with clearing; read-only is one image with the sentence. Left: half points when rating, slide to rate on touch, a `star` glyph if a product insists.)
- [x] **Cascader**: a value chosen through nested levels. (Built 2026-10-06; sheet in `docs/sheets/cascader.md`: columns by default, `layout="drill"` for narrow wells; "a tree in place" is Tree with single selection; only → or a click opens a level; several values as a covering set with cascading checkboxes and `max`. 78 KB gzip. Left: Checkbox should export `mixed` (the dash is passed through for now); server search, virtual rows.)
  - Modes: drill down one level at a time (with Back), Miller columns side by side, a tree that expands in place.
  - One value or many (checkboxes, a `max`, selection that cascades to children); leaves only or any branch.
  - Levels loaded on demand; virtualised long lists.
- [x] **Autocomplete**: free text with suggestions, where the value isn't limited to the list. A thin wrapper on Base UI Autocomplete. (Built 2026-10-06; sheet in `docs/sheets/autocomplete.md`: a separate component whose value is the text; shares Combobox's plate, rows, groups and empties through new exports; inline completion after the caret, Tab takes it. 70 KB gzip, mostly Base UI.)
  - Highlight the first match; a clear button, a trigger button, or both; groups; async search with a loading state; sizes; in a form; disabled.
- [ ] **Signature pad**: a form field that captures a signature. `BrushCursor` and `DrawPicks` are canvas tools, not a field.
  - Undo and redo; draw or type the name; stylus with pressure and palm rejection (`sizing`: auto, pressure, velocity); smoothing and min/max width.
  - Export PNG, JPEG, SVG or the strokes as JSON; `name`, `required` and validation in a form.
  - In a dialog, on an agreement card, initials per clause, proof of delivery.
- [ ] **Scrollspy**: marks the section being read in a table of contents; horizontal and vertical; a scroll container other than the window; an offset; smooth scrolling; the URL hash follows.

### 3. Extend what exists rather than adding new components

- [ ] **Table → data grid** (ReUI Data Grid, shadcn Data Table). `Table` has sort, row selection and an empty line today. Planned in our terms in "Variation sheets: Table"; the list below is ReUI's, kept for reference.
  - Looks: cell borders, dense, light (rounded rows, no header fill), striped, auto column width.
  - Columns: resize, move, show/hide; pin rows to the top or bottom.
  - Rows: tree rows that expand; virtualised rows.
  - Spreadsheet editing: select cells, copy and paste, edit in place.
- [ ] **Calendar and DatePicker → date selector** (beyond the Calendar entry above): period types (day, month, quarter, half year, year: done 2026-10-06); operators (is, before, after, between); in a dialog as well as a popover, with Apply and Cancel; two months side by side; localised.
- [x] **Number field**: sizes sm, default, lg (ours has one size today). See "Variation sheets: Number field".
- [ ] **DropZone and Attachment → file upload layouts**: an avatar upload (one image with a preview); a compact row with thumbnails and a count; a gallery grid with a preview dialog; a table of files with round progress; image tiles with their own progress; drag to reorder (needs Sortable); retry on failure (ours has it).
- [x] **Card → frame** (see "Variation sheets: Card"): panels separated, stacked or dense inside one frame, with header, title, description and footer; a ghost frame without the outer border; spacing sm, default, lg.
- [x] **Combobox**: groups, async search with a loading state, and a trigger button beside the clear mark (from ReUI's Autocomplete). See "Variation sheets: Combobox".
- [x] **Field → input group** (shadcn; see "Variation sheets: Field"): text attached to the input (a `https://` prefix, a `.com` suffix) and buttons inside the field.
- [x] **Collapsible** (shadcn): a standalone show/hide wrapper. (Built 2026-10-06; sheet in `docs/sheets/collapsible.md`. Height never animates: the panel is uncovered from its top edge and what follows travels by transform (`useTravelAfter` in `motion/rows.ts`). Accordion takes the set's chevron; moving it onto the shared reveal is Later. A plate around it resizes in one step.) `Accordion` and `SplitPane` collapse, but nothing does on its own.
- [ ] **Icon tile**: probably `Glyph` in a `well`, as a documented recipe.
  - Looks: outline, elevated, soft, solid, framed; sizes xs to xl; square or round; tones and brand colours.
  - Holds an icon, initials or short text; a status overlay; interactive; used in a list row, a feature card and an empty state.
- [x] **Code block**: `CodeCard` lives only in the docs; decide whether it ships in the package. (Built 2026-10-06 as `CodeBlock`, a Component; sheet in `docs/sheets/code-block.md`. The code card stays a separate Object but shares its tint and diff; no highlighter in the package (the host passes `html`); the docs' `Code` renders it. Left: the docs' Source/Install tabs aren't linked to their code; SwiftUI picks lines by click only; folding is Later.)
  - Looks: framed or ghost; line numbers from a start line; wrap; a max height with its own scroll or a `ScrollArea`; a copy button pinned over the scroll.
  - Lines: highlighted lines and words, focused lines, selectable lines (reference them in a chat), folding by indent.
  - Diff (added and removed lines), a unified patch with two gutters, diagnostics per line (error, warning, info) with an action ("Fix with AI").
  - Streaming from an AI response; splitting Markdown code fences; highlighting on the server.

### 4. Chat parts

Moved to "AI components" below (shadcn's Bubble, Message, Message scroller and Marker are there).

### 5. Large; place in the layers first

- [ ] **Chart** (shadcn): bar, line and area charts with axes and tooltips. `Sparkline` and `Meter` are the small cases.
- [ ] **Carousel** (shadcn).
- [ ] **Kanban**: columns of cards, dragged between columns with an overlay while dragging; columns reorder by a handle; disabled items; `onValueCommit` with the previous state so a failed save rolls back with a toast. Needs Sortable.
- [ ] **Gantt**: day, week, month, quarter and year scales; drag to move, resize and create; summary bars that roll up; planned against actual (a ghost baseline); dependencies as finish-to-start arrows; milestones as diamonds; progress fills; side columns (owner, status); people rows with avatars; zoom, now line, off days, infinite scroll; time zones; right-to-left.
- [ ] **Event calendar**: month, week, day, N days, agenda, and a resource time grid; all-day bars across days; custom event chips; drag to move, resize and create; tooltips; weekends, week numbers, now line, off days; day start and end hours, grid interval, snap; week start; time zones; right-to-left. See "Marked days" in the Calendar entry.
- [ ] **Timeline**: a vertical list of events in order. `MemoryScrubber` looks through the past; this is not that.
  - Dates on the left; custom indicators or icons; alternating sides; horizontal with indicators above or below; an active step.
  - Uses: a roadmap, an activity feed, an order's status, git activity, milestones, CI/CD steps, deployment history.
- [ ] **Filters**: a bar for building filters, for example "Status is Open".
  - Basic (a row of chips for a toolbar) or advanced (nested conditions, reorderable, inline in a sidebar).
  - Field types: text, number, range, select, multiselect, boolean; nested fields.
  - Operators: is, contains, starts and ends with, empty, is any of, is none of, greater and less than, between.
  - Searchable options, chosen ones pinned to the top, an option that clears the rest, custom editors (toggles, radios, checkboxes); clear all; filters a data grid.
- [ ] **Icon stack**: layered isometric icons for small illustrations (empty states, onboarding, feature cards, status panels); sizes and tones. Check against `BlockSilhouette` and `EmptyState` first.

Not needed as components: Aspect Ratio (the CSS `aspect-ratio` property), Native Select (a `<select>` on a `well`), Typography (`Label`). Direction (a right-to-left provider) only if the library commits to right-to-left text.

## AI components

Bhupesh Gupta: "research online what AI components exist which we might have to add in our library." (2026-10-05)

Compared with seven AI UI libraries: [AI Elements](https://elements.ai-sdk.dev/) (V), [prompt-kit](https://github.com/ibelick/prompt-kit) (P), [assistant-ui](https://www.assistant-ui.com/docs/ui/thread) (A), [Ant Design X](https://x.ant.design/components/overview) (X), [shadcn](https://ui.shadcn.com/docs/components/message) (S), [CopilotKit](https://docs.copilotkit.ai/) (C) and [OpenAI ChatKit](https://developers.openai.com/api/docs/guides/chatkit-widgets) (K). The letters after each entry say who ships it. Place each in the six layers (`docs/COMPOSITION.md`) before building it: a message is probably an Object, a thread a Place.

### 1. Lift the AI composer block's parts into components

The block (`apps/docs/src/blocks/ai-composer`) already does these inside itself; make them components and rebuild the block from them.

- [ ] **Thread** (V P A S): the scrolling conversation; stays at the newest message while a reply streams, lets the person scroll up to read, and offers Jump to latest. Needs the ScrollArea `viewportRef` / `onScroll` from "Library gaps".
- [ ] **Message** (V P A X S): user and assistant turns (start or end aligned), avatar, header (name, model, time) and footer (status); consecutive turns from one sender grouped; a system message (P).
- [ ] **Streaming text and Markdown** (P V K): words arriving at a pace, a caret while writing, Markdown rendered as it streams (headings, lists, tables, code fences into Code block); a "writing" status said with `role="status"` (shadcn's Marker).
- [ ] **Prompt input** (V P A X C): grows with its text; ↩ sends and ⇧↩ breaks the line; Send becomes Stop while a reply writes; attach (with `Attachment` and `DropZone`); a model selector (V); dictation (A); disabled while offline.
- [ ] **Message actions** (V P A X): copy, retry, edit the person's message, thumbs up and down with an optional reason (P's feedback bar), export as Markdown (A).

### 2. Agent parts (missing; most libraries ship them)

- [ ] **Reasoning** (V P A X): a collapsible "Thought for 4 s" that streams open while the model thinks and folds shut when the answer starts; consecutive reasoning parts grouped (A).
- [ ] **Chain of thought / steps** (V P X): a list of steps, each pending, running, done or failed, with detail under each.
- [ ] **Tool call** (V P A): the tool's name, its inputs, a status (queued, running, done, failed) and its result, folded by default; consecutive calls grouped (A); a fallback look for tools with no UI of their own.
- [ ] **Confirmation** (V C): the agent asks before it acts ("Delete 3 files?"), with Allow and Deny, and what was decided kept in the thread. Destructive ones can use the hold to confirm from "Destructive confirm".
- [ ] **Plan, task and queue** (V A): the agent's to-do list with progress, tasks nested under a step, and what is waiting to run.
- [ ] **Sources and inline citations** (V P X): numbered marks in the text that open the source in a preview card; a list of sources under the answer. Builds on the `ProvenanceTooltip` block.
- [ ] **Thinking indicator / shimmer** (V P S): shimmering placeholder text and a thinking bar. Do it inside "Spinner: rethink as waiting" rather than as its own thing.
- [ ] **Starter prompts and follow-ups** (V P A X): prompts on an empty thread and follow-ups after a reply. Different from `Chip variant="suggestion"`, which accepts or dismisses an AI suggestion.
- [ ] **Welcome** (A X): the empty thread's greeting with starter prompts; check against `EmptyState` first.
- [ ] **Conversation list** (A X): past chats in a sidebar, with rename, delete and a loading skeleton.
- [ ] **Branch picker** (A): moves between alternate replies, "2 of 3".
- [ ] **Context meter** (V): how full the model's context window is, likely a `Meter` use.
- [ ] **Checkpoint** (V): a point in the thread to restore to.

### 3. Code and artifacts (only if MetalUI targets coding agents)

- [ ] An artifact panel beside the thread (V); a web or JSX preview (V P); a terminal (V); a stack trace (V); test results (V); a commit (V); a schema view (V); environment variables (V). Code block and Tree are in "Components other libraries ship" above.

### 4. Voice (V)

- [ ] Speech input, transcription, an audio player, mic and voice pickers, and a persona (an animated presence for the agent).

### 5. Workflow canvas (V)

- [ ] Nodes, edges, a canvas, controls and panels. `Connector` and `SpatialField` already exist, so this may fit the Objects and Places layers better than anything above.

### 6. Generative UI and entry points

- [ ] **Render from JSON** (K): ChatKit's widgets are ordinary parts (card, list, badge, button, date picker) that a model composes. We have nearly all of them; what's missing is a schema that lets a model render MetalUI components from JSON.
- [ ] **Chat sidebar and popup** (C): the thread in a `Sidebar` or a floating panel.
- [ ] **Ghost text in a textarea** (C): the AI's next words shown in grey, Tab to accept. Close to the cues and the suggestion chip.

## SwiftUI on iOS

Found 2026-10-01 by building the package for the iOS Simulator (`xcodebuild -scheme MetalUI -destination 'generic/platform=iOS Simulator'`): it fails, so `Package.swift` lists macOS 14 only. CI has only ever run `swift build` on macOS. These eight files use AppKit; each needs a UIKit twin or a platform-neutral rewrite behind `#if canImport(AppKit)`:

- [ ] **Icons** (`Icons/MetalIcon.swift`): renders the custom SF Symbols through `NSImage.SymbolConfiguration` and `NSImage(symbolName:bundle:)`. iOS needs `UIImage.SymbolConfiguration` and `UIImage(named:in:)`, with the y-up/y-down centre correction checked.
- [ ] **Fonts** (`Foundation/MetalFonts.swift`): `NSFont` for the system and monospaced fallbacks and weights; `UIFont` has the same calls with `UIFont.Weight`. Registration of the bundled Geist, Martian Mono and Doto already goes through Core Text.
- [ ] **Fan** (`Components/MetalFan.swift`): `NSEvent.addLocalMonitorForEvents` to close on an outside click, and an `NSViewRepresentable` window probe. iOS needs a tap-outside layer instead.
- [ ] **Slider** (`Components/MetalSlider.swift`): `NSCursor` hand and pointer cursors and `NSApp.currentEvent` to tell keyboard focus from a click. iOS has no cursor; use `.hoverEffect` or none, and focus from `@FocusState` only.
- [ ] **Brush cursor** (`Components/MetalBrushCursor.swift`): `NSCursor` built from an image. iOS has no pointer cursor to set; the brush ring is drawn in the canvas there.
- [ ] **Spatial field** (`Components/MetalSpatialFieldView.swift`): a custom `NSView` that draws with `NSGraphicsContext` and `NSColor`. iOS needs a `UIView` with `UIGraphicsGetCurrentContext` or a `Canvas`.
- [ ] **Snap guides** (`Components/MetalSnapGuides.swift`): `NSHapticFeedbackManager`. iOS has `UIImpactFeedbackGenerator` or `.sensoryFeedback`.
- [ ] **Command palette** (`Components/MetalCommandPalette.swift`): `NSScreen.main` for the maximum height. iOS can read the container height.
- [ ] Then: add an iOS Simulator build to `.github/workflows/ci.yml`, restore `.iOS(.v17)` in `Package.swift`, and put "iOS 17" back in the README and the agent guide.
