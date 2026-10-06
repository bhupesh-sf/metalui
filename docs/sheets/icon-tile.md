### Icon tile (and Icon stack)

From "Components other libraries ship that we don't". The backlog: an icon tile is "probably `Glyph` in a `well`, as a documented recipe" (ReUI: outline, elevated, soft, solid, framed; xs–xl; square or round; tones and brand colours; an icon, initials or short text; a status overlay; interactive; in a list row, a feature card and an empty state). An icon stack is "layered isometric icons for small illustrations; check against `BlockSilhouette` and `EmptyState` first."

Now: the tile already exists twice, drawn by hand, with numbers that don't agree:

- **Alert's window**: the kind's glyph in a 28 sunk well (radius 9, glyph 16, `recipe-well-field`), its LED seated on the top-right rim (inset 2).
- **EmptyState's well**: a 24 glyph in a 56 sunk well (radius 18), ink3.

Other neighbours: `Glyph` (a bare 10 / 14 / 16 mark, no ground), `Well` (the sunk material, no content), `Avatar` (a *person* as a raised disc with initials, presence lower right), `Badge.Anchor` (a count on any control's corner), the `LED` part (a state, in its own socket), `IconButton` (a pressable glyph key).

**Layer: Part.** It has a look and no job: you never operate it (Component fails: a pressable glyph is an `IconButton`, and the row or card around a tile is the control), it doesn't stand for a person's stuff on its own (Object fails: it marks a row that does), it stays (Instrument fails), it has no area (Place fails). It always sits beside words: a row's name, a card's title, an empty state's sentence.

**One part, not a documented recipe.** Two components already hand-draw it and drifted (28/9/16 vs 56/18/24, ink2 vs ink3); a recipe written up in the docs leaves a third copy to every app and no SwiftUI twin. A part is one source, and Alert and EmptyState can draw theirs with it.

Jobs:

- [x] **Mark what a row, a card or an empty place is about** (ReUI's default tile): a glyph from the set engraved in a sunk window, `<IconTile><FolderIcon /></IconTile>`. Sunk is the default because the mark belongs to the thing beside it, as a badge is stamped into what it describes. **Must**.
- [x] **Looks** (ReUI outline / elevated / soft / solid / framed): two of our materials, not five fills. `sunk` (the well: the window Alert already draws) and `raised` (the small raised plate, `raise-sm`: a tile that stands out of a flat card, an app or integration you'd pick). Outline and framed are a hairline on the same idea; soft and solid are colour fills, which is tone (below). A keycap look is dropped: raised at key height with a cap reads "press me", and a tile is never pressed. **Must**.
- [x] **Sizes** (ReUI xs–xl): the field ladder plus one for empty places. `compact` 28 (glyph 16: Alert's window), `regular` 32 (16), `large` 44 (20), `hero` 56 (24: EmptyState's well). The tile stands level with the row or field beside it, so it takes the field's heights; `hero` is the empty state's and a feature card's lead, the one place a mark stands alone above words. **Must**.
- [x] **Square or round** (ReUI radius): `square` (radius per size, from the window's 9/28 proportion) and `round`. Round sits in a list beside avatars (a bot, a team, a service among people) so the column of marks lines up. **Should** (built: one class).
- [x] **Holds an icon, initials or short text** (ReUI): any glyph as an element (the host imports it by name, so one import ships one glyph), or one to three characters (`AC`, `JS`, `v2`) in the engraved mono, uppercase, with the label's lip. A person's initials are an `Avatar`, not a tile. **Must**.
- [x] **Status overlay** (ReUI's dot): the `LED` part seated on the top-right rim, as Alert's window seats its lamp: green live, amber waiting, red failed, blue a link's kind, off idle. Top right, not Avatar's lower right: lower right is a person's presence, top right a thing's state. The words beside the tile always say the state. **Must**.
- [x] *ours* **The lamp flickers once when the state changes**, never on first paint, as a badge's does: the row whose service just failed catches the eye once, then goes quiet. Reduce Motion: it changes at once. **Must**.
- [x] **A count on the tile** (an unread count on an app tile): `Badge.Anchor` wraps any control or mark. **Covered by Badge**.
- [x] **Interactive** (ReUI hover and press states): a tile is never the target. The row (`Row`), the card or the link around it is; a lone pressable glyph is an `IconButton`. **Dropped**, so a part never grows hover, press and focus states of its own.
- [x] **Tones** (ReUI primary / success / warning / destructive / info fills): colour standing for meaning is what our LED rule forbids. A state is the lamp plus words; the glyph stays in ink2. **Dropped**.
- [x] **Brand colours** (ReUI brand tiles): no job needs us to tint a tile. A third-party mark arrives as its own SVG and keeps its own colours inside the neutral window. **Covered** (documented), no API.
- [x] **Named for assistive tech**: decorative and hidden by default (the words beside it name it); `label` makes it an image with that name, for the rare tile that stands alone. **Must**.
- [ ] *ours* **The glyph's lip**: in a sunk tile the glyph could carry the engraved lip the words do (a half-point light under the stroke). Needs a recipe layer for a filter per colorway. **Later**.
- [ ] *ours* **A tile wakes with its row**: in a selected or hovered `Row`, the glyph goes from ink2 to ink. A host can do it today with a class; **Later** as a `Row` rule.
- [ ] **Alert's window and EmptyState's well draw with `IconTile`** (compact and hero). Their owners' change, not this one; the numbers already match so it lands without a visual change. **Should** (for Alert and EmptyState).

**Icon stack: dropped.** It isn't covered by `BlockSilhouette` (that is the canvas at far zoom, a level of detail, not an illustration), but its jobs are covered elsewhere or are decoration:

- [x] **An empty state's picture**: one glyph in a hero tile, which `EmptyState` already draws. **Covered**.
- [x] **A feature card's or an onboarding step's lead**: a hero tile above the title. **Covered by IconTile** (shown on the page).
- [x] **A status panel's mark**: a tile with its lamp. **Covered by IconTile**.
- [x] **Isometric layered illustrations**: a second drawing system (isometric projections of every glyph, depth stacking) that the icon grammar doesn't have, for pictures that say nothing a single engraved mark and a sentence don't. Soft Hardware is calm: one mark, then words. **Dropped**.
- [ ] **Several things together** (app A connects to app B; three services in a group): a row of tiles with a `Connector` between them, or an overlapping group like `AvatarGroup`. **Later**, when a real place needs it.

Decide: one part or a documented recipe? **Decided**: a part (`IconTile`, `MetalIconTile`), for the reasons above: two hand-drawn copies already drifted, and a recipe page has no SwiftUI twin.

Decide: does the tile draw its glyph through the `Glyph` part? **Decided**: no. Glyph's ladder (10 / 14 / 16) is for marks beside words; the tile sizes its own glyph at 16 / 20 / 24, as Alert and EmptyState already do. It uses the well, the small raised surface and the LED.

Decide: what is the size above large called? **Decided**: `hero`, the word the surface radii already use for the biggest plate.

Decide: where does the lamp sit? **Decided**: the top-right rim (Alert's seat, inset 2), so a thing's state and a person's presence (Avatar, lower right) never look alike.

Done (2026-10-06): the Must tier and the round shape (Should) in React (`IconTile`), SwiftUI (`MetalIconTile`), the icon-tile recipe, the agent guide, the page (DialKit workbench; a list row, a feature card, an empty place, beside avatars) and `e2e/icon-tile.spec.ts`. Left: the glyph's lip and waking with its row (Later); Alert's window and EmptyState's well moving onto the tile (their owners); a group of tiles (Later).
