# Autocomplete

Free text with suggestions: the text is the value, and the list only helps finish it. React: `Autocomplete` from `@unlocalhosted/metalui`, on Base UI Autocomplete. SwiftUI: `MetalAutocomplete`. Everything drawn is Combobox's: the field well and its mini keys (`Field.Icon`, `Field.Trail`, `Field.Key`), the menu's frosted plate with its gliding highlight, `Row`'s slots, the detail rows, the sticky group labels, the matched letters, the plate's height settling (Combobox exports them as `comboboxParts`, `ComboboxFit`, `ComboboxMatched`, `ComboboxGlyph`), and the `Spinner` ring on the `useWait` clock. No recipe of its own: the field, menu and combobox recipes.

## Use it for

- A search box: what you type is searched; suggestions finish it faster.
- An address, a city, an email "To", a tag you may or may not have used before: anything is accepted.

## Don't use it for

- One value that must be in the list (use Combobox), several values as chips (Combobox `multiple`), a short list (Select), commands (the command palette).

## Anatomy

- Well: the form field's, `size` large (44, the palette's field and type), regular (32, the default) or compact (28), at least 220 wide. An optional leading glyph (`icon`); none by default, since an address isn't a search. The trail holds the clear key once there is text.
- Completion: the rest of the best match, after the caret, in ink3 and the input's own type. Drawn over the input, never typed into it.
- Plate: Combobox's (the menu's frosted plate, as wide as the well, 6 below it; 7 rows tall, then it scrolls), at most 8 suggestions (`limit`).
- Rows: the menu's rows under one gliding highlight; the typed letters in ink, the rest in ink2; a glyph or an avatar (`icon`) and a second line in meta type, ink2 (`description`). No check: nothing is chosen.
- Group labels: the menu's engraved heading, sticky at the plate's top. "Recent" is one.
- Quiet line (ink3): Searching… while a search with no rows yet runs.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the well, its glyph (if any) and placeholder | – |
| typing | the plate opens with the suggestions that contain the text (label or value), those that start with it first; the typed letters stand in ink | the plate fades in on settle; rows change at once; its height settles to the new count |
| completion | the rest of the best match after the caret, in ink3; only at the end of the text, while the plate is open | appears and changes with each keystroke (no motion: it is text) |
| take the completion | Tab, → or End at the end writes the whole suggestion; the plate stays with what now matches | – |
| moving | one row highlighted; the completion follows the keys | the highlight glides on settle |
| choose | ↩ or a click writes the row's value into the field | the plate fades out on release |
| nothing matched | the plate closes; the text stays | the release fade |
| before typing, with `recent` | "Recent" and its rows, on focus | – |
| clearable | the clear key shows | the field key's pop |
| loading (`loading`) | after the show delay the ring stands in the clear key's place; rows stay, dimmed (0.5); with no rows, Searching… | the wait's clock (delay 400, minimum 600) |
| failed (`failed`) | one row: `sync-error`, "Couldn't load", Try again; ↩ or a click calls `onRetry` | – |
| focus | the flush green ring on the well | – |
| invalid | the foundation's invalid ring; aria-invalid (also from a `FormField` that isn't valid) | – |
| disabled | 40 % | – |

Reduce Motion: the height snaps; the fades stay.

SwiftUI: the plate is an overlay under the well (give it room below, or it draws over what follows; it raises its z-index while open). Tab or → at the end takes the completion.

## API

| React | SwiftUI |
|---|---|
| `items`: strings, `{ value, label, description?, icon?, disabled? }` (Combobox's `ComboboxItem`; `value` is written, `label` shown), or `{ label, items }` groups | `items:` (`MetalComboboxItem`) and/or `groups:` (`MetalComboboxGroup`) |
| `value`, `defaultValue`, `onValueChange` (the text) | `text:` (a binding) |
| `placeholder`, `aria-label` | `prompt:`, the label |
| `name`, `required` | – (a SwiftUI form reads the binding) |
| `size` (`large`, `regular`, `compact`), `invalid`, `disabled` | `size:`, `invalid:`, `.disabled()` |
| `icon` (an element: `<SearchIcon />`) | `icon:` (`MetalIconName`) |
| `inline` (true) | `inline:` |
| `highlightFirst` (false) | `highlightFirst:` |
| `filter={false}`, `loading`, `failed`, `onRetry` | `filter:`, `loading:`, `failed:`, `onRetry:` |
| `recent` (strings) | `recent:` |
| `limit` (8) | `limit:` |

## Keyboard and accessibility

- A combobox input (`aria-autocomplete="list"`) with a listbox; ↑ ↓ move the highlight, ↩ writes the highlighted row, Esc closes, typing filters. Name it with a visible label or `aria-label`.
- Tab, → or End at the end of the text takes the completion; with no completion they do what they always do. Shift-Tab never takes it.
- ↩ with nothing highlighted keeps your text (and submits a form). `highlightFirst` lights the first row as you type, so ↩ takes it.
- The completion is drawn, not typed: the input's value is only what you typed, so a screen reader never hears letters you didn't type. The highlighted option is announced as usual.
- Loading sets aria-busy on the input and the plate; the ring says "Searching" once, politely.

## Rules

- The text is the value. Never clear or refuse what was typed because it isn't in the list; validate it the way you would a field.
- Suggest as people type; rows that start with the text come first.
- Keep ↩ for the text in a search box; use `highlightFirst` only where the top suggestion is nearly always wanted.
- Give suggestions with the same label a `description`; put what should be written in `value` (an address) and what people recognise in `label` (a name).
- Pass glyphs as parts or elements, never by name.
- A value that must be in the list is a Combobox.
