# Combobox

Type to find one of many, or several. React: `Combobox` from `@unlocalhosted/metalui`, on Base UI Combobox. SwiftUI: `MetalCombobox`. The well and its mini keys are the field's (`Field.Icon`, `Field.Trail`, `Field.Key`); the plate and rows are the `menu` recipe with its gliding highlight; rows use `Row`'s slots; several values are `Chip`s with an `IconButton` mini remove; loading is the `Spinner` ring on the `useWait` clock. The `combobox` recipe adds the fit, the detail rows, the sticky labels, the chips' well and the chip's material.

## Use it for

- One value from a long list people know by name: a city, a person, a font, a time zone.
- Several values from a list that can grow: labels, people on a thread (`multiple`, `onCreate`).
- A picker in a toolbar or a row, where a field would be too much (`trigger="button"`: Assign, Kind).

## Don't use it for

- A short list (use a select), commands only (use the command palette), or free text with no list (use a field). A value that isn't in the list at all is Autocomplete, not this.

## Anatomy

- Well: the form field's, `size` regular (32, the default) or compact (28), at least 220 wide; led by the `search` glyph; ui type. The trail holds the field's mini keys: clear (`close`), once there is something to clear, and a chevron key that opens the whole list.
- Plate: the menu's frosted plate, as wide as the well, 6 below it; 7 rows tall, then it scrolls.
- Rows: the menu's rows under one gliding highlight; the typed letters in ink, the rest of the label in ink2. A row may lead with a glyph or an avatar (`icon`) and carry a second line in meta type, ink2 (`description`): such rows are 6 taller at each edge. The chosen row ends in a `check`.
- Group labels: the menu's engraved heading, sticky at the plate's top while their rows scroll.
- After the matches, behind hairlines: a `plus` row "Create "…"" and then command rows, each with its glyph.
- Quiet line (ink3): No matches for "…", Searching…, or "211 more matches; type to narrow" past `limit` (100).
- Chips (`multiple`): frosted, a neutral hairline (not the suggestion's green), 20 tall, 4 apart, a mini remove key; the query keeps at least 64; the well grows a line at a time and its glyph and keys stay on the first line.
- Button (`trigger="button"`): a standard cap (compact under `size="compact"`), 160 to 260 wide, the pick (its glyph or avatar first) or the placeholder in ink3, and a chevron. The plate is at least 260 wide, aligned to the cap's start, with a regular search well at its top.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the well, its search glyph and placeholder | – |
| typing | the plate opens; rows filter; the typed letters stand in ink | the plate fades in on settle; rows change at once; the plate's height settles to the new count |
| moving | one row highlighted | the highlight glides on settle |
| open | the chevron points up | the chevron morphs (one glyph turning) |
| chosen | the field holds the value; a pick with a glyph shows it in the well's leading slot | the plate fades out on release; the glyph morphs from search |
| clearable | the clear key shows | the field key's pop |
| before typing, with `recent` | "Recent" and its rows first, the rest after | – |
| loading (`loading`) | after the show delay the ring stands in the clear key's place; rows stay, dimmed to the spinner's item look (0.5); with no rows, Searching… | the wait's clock (delay 400, minimum 600) |
| failed (`failed`) | one row: `sync-error`, "Couldn't load", Try again; ↩ or a click calls `onRetry` | – |
| nothing matched | No matches for "lisb" | – |
| several, pick | a chip lands; the query and the plate stay | the chip lands on the object spring, one nest from above |
| several, remove | Backspace on an empty query rings the last chip; a second Backspace (or its ×) removes it | the chip leaves one nest down on the release spring; then the value changes |
| focus | the flush green ring on the well (on a chip, its own ring) | – |
| invalid | the foundation's invalid ring; aria-invalid | – |
| disabled | 40 % | – |

Reduce Motion: the height snaps, chips come and go at once, glyphs change in place; the fades stay.

SwiftUI: the plate is an overlay under the well (give the combobox room below, or it draws over what follows; it raises its own z-index while open); from a button it is a popover. The pick's glyph and the chevron change in place (SwiftUI has no glyph morph yet: the chevron turns by rotation). Recent shows whenever the plate opens on an empty query.

## API

| React | SwiftUI |
|---|---|
| `items`: strings, `{ value, label, description?, icon?, disabled? }`, or `{ label, items }` groups. `icon` is a glyph as its parts, `{ glyph: tagGlyph, morph: tagMorph }` (both from `@unlocalhosted/metalui/icons`; it plays its act on row hover and morphs from search into the well), or an element such as an `Avatar` | `items:` (`MetalComboboxItem`, with `person:` for an avatar) and/or `groups:` (`MetalComboboxGroup`) |
| `value`, `defaultValue`, `onValueChange` (one value or `null`) | `selection:` (`String?`) |
| `multiple` with `value` / `onValueChange` as arrays | `selections:` (`[String]`) |
| `placeholder`, `aria-label`, `emptyText` (string or `(query) => string`) | `prompt:`, the label |
| `size` (`regular`, `compact`), `invalid`, `disabled` | `size:`, `invalid:`, `.disabled()` |
| `onQueryChange`, `filter={false}` (your own search), `loading`, `failed`, `onRetry` | `query:` (a binding), `filter:`, `loading:`, `failed:`, `onRetry:` |
| `recent` (values) | `recent:` |
| `onCreate(label)`: return the new value to choose it | `onCreate:` |
| `actions`: `{ id, label, icon, onAction }[]`, `icon` an element (`<SettingsIcon />`) | `actions:` (`MetalComboboxAction`) |
| `limit` (100) | – |
| `trigger` (`field`, `button`) | `trigger:` (`.field`, `.button`) |

## Keyboard and accessibility

- A combobox input with a listbox; ↑ ↓ move the highlight, ↩ chooses, Esc closes, typing filters. The chevron key ("Show all") opens the list. Name it with a visible label or `aria-label`.
- Several values: ← from the start of the query or Backspace on an empty query moves to the last chip; ← → move between chips; Backspace or Delete removes the focused one; typing returns to the query.
- From a button: the cap is the combobox and carries the name; the search inside the plate is named "Search <name>".
- Loading sets aria-busy on the input and the plate; the ring says "Searching" once, politely.

## Rules

- Filter as people type; never make them press a button to search. A search you run yourself sets `filter={false}` and `loading` while it runs.
- The plate grows and shrinks with the matches; it never jumps.
- Tell the three empties apart: loading keeps the rows, a failure offers Try again, nothing matched says the query back.
- Create and commands come last, behind a hairline, each with its glyph; they never become the value.
- Pass glyphs as their parts or elements, never by name: the combobox ships only the glyphs you give it (and search, chevron, check, close, plus, sync-error), not the catalog.
- Give items with the same name a `description` (or an avatar) so they can be told apart.
- Pass `trigger="button"` for pickers in toolbars and rows; keep the field for forms.
