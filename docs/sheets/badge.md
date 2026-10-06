### Badge

From "Components other libraries ship that we don't" § 1. Owner (2026-10-06), on a worked example: ReUI's ~200 combinations (7 tones × solid / outline / light × 5 sizes × 2 radii) become about six: a neutral engraved label, plus an LED for status; two sizes matched to our type; one pill shape; the dot is our LED; a glyph, and the `mini` IconButton for remove; *ours*: a count that turns on the drum, an LED that flickers on a state change.

Now: nothing plain. Two pills already exist, and both are specialised:

- **`StatusBadge`** (component): the *system's* state (`SYNC LIVE`, `SYNC OFFLINE · ADD KEY…`). 26 tall, a raised plate, an LED that is required and plays the state's own gesture, `role="status"` (announced when it changes), and a hint tooltip with the command that fixes it. One per corner or toolbar, not one per row.
- **`Chip`** (part): a pill that carries *actions* or lives on a particular ground: a suggestion to accept or dismiss, a tag on glass, a derived `#tag`, a chosen value in a Combobox with its × (`IconButton mini`).

**Badge vs Chip vs StatusBadge.** A badge says one short fact *about a thing*: its kind, its version, its state, how many are waiting. It is not announced (fifty rows of `role="status"` would talk over each other), it has no hint, and it is never operated. Extending `StatusBadge` would bring the live region, the 26 plate and the per-state gestures into every table row; extending `Chip` would add a fifth variant whose job is the opposite of a chip's (a chip is the thing you act on). So Badge is new, and the line is: **does the system speak (StatusBadge), do you act on it (Chip), or does it describe (Badge)?**

**Layer: Part.** It has a look and no job: you never operate it (Component fails), it is not a person's thing (Object fails), it stays (Instrument fails), it has no area (Place fails). Being a part keeps it actionless by construction: a part may not import `IconButton`.

**Its look: stamped, not raised.** Everything raised at this size already means something: a keycap (`Kbd`, 18, raised) is a key, a status plate is the system speaking. A badge is a mark stamped *into* the thing it describes: a shallow sunk pill (the well's light, cut for 18 tall) with the words in the engraved mono, ink2 with the lip. Nothing about it says "press me". The one exception is a count on another control's corner: it sits *on* the control, so it is a small graphite readout cap ringed in the page's ground, the way a lamp sits in its socket.

Jobs:

- [x] **Name a kind, a version or a role** (ReUI default / secondary / outline / light; shadcn `variant`): one neutral look, the engraved word in the stamp. `<Badge>Beta</Badge>`. ReUI's seven tones × three fills are mostly colour standing for meaning; we keep meaning in the words and the LED. **Must**.
- [x] **Say a thing's state** (ReUI success / warning / destructive / info; the "dot" variant): the LED part before the words: green live, amber waiting or urgent, red failed, blue a link's kind, off idle. `<Badge led="failed">Build failed</Badge>`. The words always say it (never colour alone). Unlike StatusBadge it holds the lamp steady: a table of breathing lamps is noise, and nothing runs at rest. **Must**.
- [x] *ours* **The lamp flickers when the state changes**: on a change after mount (queued → running → failed), the LED plays the `flicker` gesture once and settles lit, so a row that just changed catches the eye once and then goes quiet. Never on first paint. Reduce Motion: it changes at once. **Must** (it is the reason the LED is ours and not a dot).
- [x] **Carry a glyph** (ReUI with icon): a leading glyph from the set in ink2 (`lock` Private, `person` Owner). A glyph or an LED, not both: one leading mark. **Must**.
- [x] **Count** (ReUI and shadcn number badges): `count` in the readout type, tabular; a single digit sits in a circle (min width = height). `max` (99) shows `99+`. **Must**.
- [x] *ours* **The count turns on the drum** (`SwapText`): a new count rolls up when it grows and down when it shrinks (`swap-down`), the footprint settling to the new width. Reduce Motion: a crossfade. **Must**.
- [x] **A count on another control** (a notification badge: shadcn's badge on an avatar or a button, Apple's app badge; the job the brief asked about): `Badge.Anchor` wraps any control (an `IconButton`, an avatar) and puts the count on its top-right corner as the graphite readout cap, ringed in the page's ground so it cuts cleanly off the control under it. It comes in from 60 % on the object spring when the count leaves zero and goes on the release spring at zero, so it never sits showing "0". The count is said in the control's own label ("Inbox, 3 unread"): the corner cap is hidden from assistive tech, because a separate "3" after a button names nothing. **Must**.
- [x] **A count inside a tab, a nav row or a menu row**: just a compact `Badge count` after the label; no new API (Tabs' `label` is a node). **Covered** (documented, shown on the page).
- [x] **Two sizes matched to our type** (ReUI xs–xl): `regular` 18 tall beside ui and body text (12.5 / 16–18 line), `compact` 15 beside meta text, in dense rows and on corners. Not the field ladder (44 / 32 / 28): a badge never stands level with a field; it sits on a line of text, so its sizes follow the type. **Must**.
- [x] **What a count means, said** (accessibility, any library's `aria-label`): `label` ("3 unread") replaces the bare number for assistive tech. **Must**.
- [x] **Remove** (ReUI with an icon button; shadcn token): a badge you can remove is a value you chose, which is a `Chip` with `Chip.Actions` and `IconButton variant="mini"` (as Combobox `multiple` already draws it). **Covered by Chip**, so the remove job keeps the owner's form (`mini` IconButton) without making Badge pressable.
- [ ] **On a see-through ground** (frost, glass, an image): a stamp needs a solid surface to be cut into; on a see-through one it takes a keyline like StatusBadge's `solid`. **Should**, once a real place needs it (no see-through ground holds badges today).
- [ ] **A count on a tab or nav row that only says "new"** (a dot with no number): a bare dot is colour without words. **Later**, and only as the LED with a visible word ("New").

Not doing:

- **Tones and fills** (solid / outline / light × seven colours): colour standing for meaning is what our LED rule forbids; the LED carries state, and four extra tints of a neutral stamp would be decoration.
- **xs–xl and two radii**: two sizes cover the two places a badge sits (a line of text, a dense row or corner); one pill shape, because the stamp is a pill everywhere else in the library (wells, the status plate).
- **A badge as a link** (ReUI `asChild` link): a badge that goes somewhere is a `Link` (or a glass `Chip` action on glass). A pressable badge would be the only pressable part, with hover, press and focus states of its own.
- **Strong / tinted badges**: StatusBadge's `strong` exists for the one alert in a view; a tinted badge in every row would make every row an alert.

Decide: is Badge its own part, or a fifth `Chip` variant, or `StatusBadge` with a quiet small size?

- Decided (2026-10-06): its own part. A chip is something you act on and a status badge is the system speaking; a badge does neither, and folding it into either would carry their behaviour (actions, a live region, a hint, gestures) into every table row. The remove job stays Chip's.
- Done (2026-10-06): the Must tier in React (`Badge`, `Badge.Anchor`), SwiftUI (`MetalBadge`, `.metalBadge(count:)`), the badge recipe, the agent guide, the page (DialKit workbench) and `e2e/badge.spec.ts`. Decisions while building: the corner count is drawn in the other colorway (a graphite cap with light digits on Bone, a bone cap on Graphite), because a sunk stamp cannot sit on top of a control and a cap in the page's own colorway disappears on Graphite. Left: the two Should/Later items; the words' mono tracking leaves a trailing space after the last letter (optically a touch more padding on the right).
