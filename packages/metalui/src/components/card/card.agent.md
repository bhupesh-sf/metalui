# Card

A person's thing, held on a raised plate. React: `Card` from `@unlocalhosted/metalui`. SwiftUI: `MetalCard`, `MetalCardFrame`, `MetalCardChoice`, `MetalCardEmptySlot`. An object: the plate is the raised `surface`; the `card` recipe adds the layout, sizes, the hover lift, the selected ring, the choice latch and the frame. For a link with its site's preview, use the link card; for code, the code card.

## Use it for

- One thing among several of its kind: a document, a project, a place, a person's saved item.
- A result in a list (horizontal, square media at the start).
- A choice whose options need more than a label: a plan, an add-on (choice cards).
- A frame of them: peers to compare (separated), the parts of one whole such as a settings page (stacked), or cards on the page (ghost).

## Don't use it for

- Grouping controls (use a fieldset or a section), or a single block of page text (no plate needed).
- A choice a label says well enough (use a radio group or checkboxes).

## Anatomy

- Plate: raised surface, the card radius (24), padding 16 (compact 12), parts 6 apart (compact 4).
- Media (optional): bleeds to the plate's top edges, 160 tall (compact 120). Horizontal: a square at the start, 72 (compact 56), inside the padding, its radius concentric with the plate's (24 − padding).
- Title (title type, an h3 by default); with `href`, its link stretches over the whole card.
- Status (optional): an LED at the end of the title's line, in an 18 box (the title's line).
- Action (optional): a ghost icon key (`more`) level with the title's first line, reaching 5 into the padding, above the stretched link.
- Description (body type, ink2); Footer: actions, 12 apart (compact 8), above the stretched link.
- Choice: the latch's 4 pt green LED (the LED part's live lamp), 12 in from the top and end corner.
- Frame: separated is the field well, padding 8 (compact 6), cards 8 apart (compact 6), radius card + padding; stacked is one raised plate, sections between engraved hairlines (the rule's groove, inset by the padding); ghost is a grid with no tray. Columns fill by a 200 minimum; side cards make one column.
- Empty slot: the track well (a step deeper than the tray), card radius, at least 120 tall, plus and a verb in ink2.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the raised plate | – |
| hover (with a link) | one grid step up, a larger shadow | settle spring (the hover lift) |
| pressed | back down | press time |
| focus | the green ring round the card | – |
| selected | the green ring, 3 out | – |
| without a link | still | – |
| status | live green steady, waiting amber breathing, failed red two blinks | the LED's gesture |
| waiting | a lit edge round the border after the show delay | spinner edge (useWait timing) |
| choice pressed | the seated look, 1 down | press time, linear |
| choice chosen | the seated look (flush, shaded rim), 1 down, the green LED | release spring; the LED settles in |
| choice released (another chosen) | back up to the raised plate, the LED out | release spring |
| choice disabled | 40 % | – |
| section (stacked) | no plate of its own; a hairline above all but the first; the plate clips its corners | never lifts; a linked one washes on hover (settle) |
| empty slot hover / focus | ink to ink1 / the green ring | fade |

Reduce Motion: no lift (the shadow still grows); a choice still seats its 1 pt, a key's depth on the release spring, as the tool key's; the waiting edge breathes in place.

## API

| React | SwiftUI |
|---|---|
| `Card` `selected`, `waiting`, `status` (live, waiting, failed), `statusLabel`, `size` (regular, compact), `orientation` (vertical, horizontal), `render` | `MetalCard(_ title, description:, selected:, waiting:, status:, statusLabel:, size:, orientation:, action:, open:)` |
| `Card.Media` (an image's attributes) | `media:` (a trailing closure; a footer without media passes `media: { EmptyView() }`) |
| `Card.Title` `href`, `render` (a router's link), `level` (3) | the title, the link with `open:` |
| `Card.Action` `label`, `icon` (`more`), `onClick` | `action: MetalCardAction(label, icon:) { … }` |
| `Card.Description`, `Card.Footer` | `description:`, `footer:` |
| `Card.Frame` `variant` (separated, stacked, ghost), `size`, `orientation` (horizontal: one column of side cards) | `MetalCardFrame(_ variant, size:, orientation:) { … }` |
| `Card.Choices` `value`, `onValueChange`, `multiple`, `render` (`<Card.Frame />`) | `MetalCardChoices(selection:)` / `(selections:) { MetalCardFrame { … } }` |
| `Card.Choice` `value`, `disabled`, `waiting`, `size`, `orientation` | `MetalCardChoice(_ title, description:, value:, waiting:, size:)` |
| `Card.EmptySlot` (the verb as children), `onClick` | `MetalCardEmptySlot("New canvas") { … }` |

## Keyboard and accessibility

- An `article`. With `href`, the title is the card's one link (Tab reaches it; the whole card is its hit area); the corner action and footer actions are separate buttons after it. The card shows the focus ring when its link has focus. Never nest a button inside the link.
- Status: the LED is `role="img"` named by its word ("Failed", or `statusLabel`: "Deploy failed"), and the word is its tooltip on hover. Never colour alone: the word and the gesture carry it too. Keep the meanings: green live, amber waiting, red failed.
- Choice cards are Base UI radios (one Tab stop; arrows move and choose) or, with `multiple`, checkboxes (each a Tab stop; Space toggles). The card's text is its name. A choice card holds no link and no other button.
- Empty slot: a button named by its verb ("New canvas"); the plus is decorative.
- Waiting: `aria-busy` on the card or the choice.

## Rules

- One link per card; everything else is an explicit action in the corner or the footer.
- Only cards that go somewhere move; a stacked section never lifts.
- Status is for a wall of cards scanned for trouble, not decoration: use `status="waiting"` for the thing's state (queued) and `waiting` for the card's own work under way.
- A choice card latches like the tool key: down, seated, the green LED. Don't add the selected ring to it.
- The frame says the relation: separated for peers, stacked for parts of one whole, ghost when the page is enough. One radius, no custom spacing, no ornament.
- An empty slot sits where the new card will go (last in a separated or ghost frame); say the verb.

## Waiting

- `waiting` (useWait's `busy`): aria-busy, and after the show delay a lit edge travels round the card's own border in its ink (never a spinner in its middle). Say what is happening in the card's words ("Lifting the subject…", then "Still …" from `wait.still`), mount `Spinner.Status` beside them, and hand over to `Progress` once the amount is known (drop `waiting`). Reduce Motion: the edge breathes. The edge follows every variation: a compact card, a horizontal one (edge to edge, round the media too), a choice card (it stays chosen while it waits) and a stacked section (its own rectangle).
