# Icon tile

A mark for what a row, a card or an empty place is about: a glyph, or one to three characters, in a tile beside the words that name it. React: `IconTile` from `@unlocalhosted/metalui`. SwiftUI: `MetalIconTile`. A part: it has a look and no job.

## Use it for

- A list row's lead: a folder, a service, a file type (`regular` or `compact`, level with the row).
- A feature card's or an onboarding step's lead, above the title (`large` or `hero`).
- An empty place's mark (`hero`), with the sentence that says what would be here.
- A thing's state at a glance, with its LED on the rim, when the words beside it say the state too.

## Don't use it for

- A person: that is an `Avatar` (initials, a photo, presence lower right).
- Something pressable: a lone glyph you press is an `IconButton`; a tile in a row is marked by the row, and the row (or card, or link) is the target.
- Colour for meaning or brand: there are no tones. A state is the LED plus words; a third-party logo comes in as its own SVG and keeps its colours.
- A count: wrap the tile in `Badge.Anchor`.
- A bare glyph beside words with no ground: that is `Glyph`.

## Anatomy

- **Tile**: `sunk` (default), the well's field cut into the surface, the window Alert draws; or `raised`, the small raised plate (`raise-sm`), where a tile stands out of a flat card.
- **Sizes**: the field ladder, so a tile stands level with the row or field beside it: `compact` 28 (radius 9, glyph 16), `regular` 32 (10, 16), `large` 44 (14, 20); and `hero` 56 (18, 24), the empty state's and a feature card's lead.
- **Shape**: `square` (the radius above) or `round`, beside avatars, so a column of marks lines up.
- **Mark**: a glyph in ink2, sized by the tile; or one to three characters in the engraved mono, uppercase, ink2 with the engraved label's lip, centred optically (the tracking's trailing space is indented back).
- **Lamp** (`led`): the LED part seated on the top-right rim, 2 past the corner (4 small on `compact`, 6 otherwise). Top right is a thing's state; lower right is a person's presence (Avatar).

## Behaviour and motion

- Nothing moves at rest. When `led` changes after the first paint, the lamp plays `flicker` once and settles lit; never on first paint, so a list of tiles doesn't flicker on load.
- No hover, press or focus: the tile has none of its own. The row or card around it shows them.
- Reduce Motion: the lamp changes at once.

## API

| React | SwiftUI |
|---|---|
| children: a glyph element, or "AC" | `MetalIconTile(.folder)` / `MetalIconTile(text: "AC")` |
| `look` (`sunk`, `raised`) | `look:` (`.sunk`, `.raised`) |
| `size` (`compact`, `regular`, `large`, `hero`) | `size:` |
| `shape` (`square`, `round`) | `shape:` |
| `led` (`live`, `waiting`, `failed`, `link`, `off`) | `led:` (`MetalLEDKind`) |
| `label` | `label:` |

## Rules

- Always beside words. The tile marks; the words name it and say its state.
- Glyphs are imported by name (`<FolderIcon />`), never `<Icon name>` inside a library component.
- One to three characters; more is a `Badge` or a label.
- Sunk unless the tile must stand out of a flat ground; mixing looks in one list makes some rows look pressable.
- In a list, every row's tile is the same size and shape, so the words line up.

## Accessibility

- Hidden by default (`aria-hidden`): the words beside it name the thing. With `label`, it is an image with that name, for a tile that stands alone.
- The LED is hidden; the words carry the state.

## Tokens

`recipes.icon-tile`: `size-icon-tile-<size>-size`, `rounded-icon-tile-<size>-radius`, `size-icon-tile-<size>-glyph`, `type-icon-tile-<size>`, `-top/-right-icon-tile-lamp-inset`. The looks are `recipe-well-field` and `recipe-surface-raise-sm`; the characters' lip is `recipe-label-engraved`. Swift: `MetalRecipes.iconTile`.
