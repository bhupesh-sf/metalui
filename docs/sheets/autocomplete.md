### Autocomplete

From "Components other libraries ship that we don't" § 2: free text with suggestions, where the value isn't limited to the list (ReUI Autocomplete, Base UI Autocomplete).

Now: nothing. One neighbour does most of the drawing and must not be duplicated:

- **`Combobox`** finds **one of many** (or several): its value is an item of the list, a pick is remembered (the check, the pick's glyph in the well, chips), text that matches nothing is not a value, and "nothing matched" is news ("No matches for 'lisb'").

Autocomplete is the other job: **the text is the value**. The list only helps you finish typing; anything you type is accepted, and choosing a suggestion writes its text into the field and is then forgotten (no check, no chip, no "chosen" state). A search box, an address, an email "to", a tag you may or may not have used before.

Read for jobs: ReUI Autocomplete, Base UI Autocomplete, the WAI-ARIA APG combobox ("list autocomplete", "inline autocomplete"), the browser's address bar (inline completion), fish shell (grey suggestion, → accepts), Gmail's "To", Apple Maps' search, Raycast.

**Place (docs/COMPOSITION.md): a Component.** You operate it (type, choose a suggestion) to change something else: the text it holds for a form or a search. It stands for nothing of the person's (Object fails), it stays when you stop typing (Instrument fails), and it has no area that holds objects (Place fails).

**How it differs from Combobox, and what it shares.**

| | Combobox | Autocomplete |
|---|---|---|
| Value | an item's `value` (or several), `null` when none | the text, a `string`, always |
| Typing something not in the list | not a value; the field goes back to the pick on blur | the value |
| Choosing a row | the pick: the check, its glyph in the well, chips | writes the row's text into the field; nothing is remembered |
| Nothing matched | "No matches for '…'" | the plate closes: your text is fine as it is |
| The rest of the best match | – | shown after the caret in ink3; Tab or → takes it |
| Chevron "Show all" | yes (a list to browse) | no (suggestions follow what you type) |
| How many rows | 100, then "211 more matches" | 8: suggestions help you finish, not browse |
| Matching | label contains the query | label or value contains it; rows that **start** with it come first |

Shared, not copied: the well (the field's sizes, rings, mini keys, `Field.Icon`/`Field.Trail`/`Field.Key`), the menu's frosted plate with its one gliding highlight, `Row`'s slots, the detail rows, the sticky group labels, the matched letters, the plate's height settling to its rows (`Fit`), the loading ring on the `useWait` clock and the failed row. Combobox exports these as `comboboxParts`, `ComboboxFit`, `ComboboxMatched` and `ComboboxGlyph` (additive; its behaviour is unchanged), and its item and group types are Autocomplete's (`AutocompleteItem = ComboboxItem`). No new recipe: every number is the field, menu or combobox recipe's.

**Semantics.** Base UI Autocomplete (`role="combobox"` on the input, `aria-autocomplete="list"`, a listbox, `aria-activedescendant`), so focus, keys and ARIA are Base UI's. The inline completion is drawn, not typed into the input: the input's value stays exactly what you typed until you take the completion, so a screen reader never hears letters you didn't type; the completion is said through the highlighted option as usual.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Type anything, get help finishing it | search boxes, an address, a city | the field well; the plate opens under it as you type with the suggestions that contain what you typed (in the label or the value), those that start with it first; the typed letters stand in ink, the rest in ink2 (Combobox's) | Must |
| Free text is the value | every use | `value` / `defaultValue` / `onValueChange(text)` hear every keystroke and every suggestion taken; nothing typed is ever thrown away on blur | Must |
| Choose a suggestion | every use | ↑ ↓ and ↩, or a click: the row's `value` is written into the field and the plate fades out on release | Must |
| *ours*: inline completion | a city, an email "to", a tag | the rest of the best match is drawn after the caret in ink3, in the input's own type, so it reads as the same line; **Tab** or **→** at the end takes it; it is only shown while the caret is at the end and the plate is open, and only for a suggestion whose value starts with what you typed. Base UI's `mode="both"` (the highlighted row rewrites the input) was rejected: it puts letters you didn't type into the value while you look | Must |
| Highlight the first match | a command-ish field where ↩ should take the top suggestion | `highlightFirst`: Base UI `autoHighlight`. Off by default: in a search box ↩ must search what you typed, not the first suggestion | Must |
| Clear | a search box | the field's clear key, popping in once there is text (Base UI `Clear`) | Must |
| Items with detail | an email "to" (a person and their address) | Combobox's items: `{ value, label, description, icon }` drawn as its detail rows; `value` is what is written ("maria@studio.pt"), `label` what is shown ("Maria Costa") | Must |
| Groups | suggestions of different kinds ("Places", "Saved") | Combobox's groups: engraved labels that stay at the plate's top | Must |
| Sizes | a page's search, a form, a toolbar | `size` large 44 (the palette's field and type, with the focus ring) / regular 32 / compact 28 | Must |
| In a form | an address, a "to" | `name` and `required` on the input (the text is submitted, Base UI); inside `FormField` the invalid ring and disabled look reach it; `invalid` alone draws the ring and sets aria-invalid | Must |
| Disabled | every use | the well at 40 %, the input disabled | Must |
| A search you run | a server's suggestions | `filter={false}` (the items are already the matches) with `loading`, `failed`, `onRetry`: Combobox's empties: after the show delay the ring takes the clear key's place and rows dim; with no rows yet, "Searching…"; a failure is the `sync-error` row with Try again | Must |
| A leading glyph | a search box, a place | `icon`: an element in the well's leading slot (`<SearchIcon />`). None by default: an email or an address isn't a search | Must |
| Recent before typing | a search box's last searches | `recent` (strings): shown under an engraved "Recent" when the field is focused and empty | Should |
| Reduce Motion | every move | the plate's height snaps; the fades stay (Combobox's) | Must |
| Nothing matched (ReUI) | "No results" | dropped: free text needs no permission. The plate closes, so the field is calm while you type something new. A search you run says its own "no results" in the page | dropped |
| A trigger button / "show all" (ReUI) | a chevron beside the clear | dropped: browsing the whole list is Combobox's job (or Select's). Suggestions follow what you type; `recent` covers "before typing" | dropped |
| Chips, several values (shadcn) | tags | covered: Combobox `multiple` with `onCreate` is "several, may be new" | covered |
| Create what's missing | a new tag | covered: free text already is the new value | covered |
| Commands at the end | "Search the web for '…'" | Later: Combobox's `actions` would carry over, but no real screen needs it yet | Later |
| Ghost text in a textarea (C) | the AI's next words | Later: the same inline completion in a `Textarea`, on the "Ghost text" entry; this one is one line | Later |
| Virtualised lists | thousands of suggestions | dropped: 8 rows; past that, type more | dropped |

Not doing: an LED for "has suggestions" (colour would carry a state alone); highlighting the first row by default (↩ must keep the typed search); a second, different-looking plate (it is Combobox's plate); filling the input as you arrow (`mode="both"`, see above).

**Decide**

- **A new component, or `Combobox freeSolo`?** A new component on Base UI Autocomplete. The value type differs (a string, never `null`, never a list), "chosen" doesn't exist (no check, no glyph in the well, no chips), nothing-matched is not an empty, and Base UI ships them as two roots. Sharing the drawing through Combobox's exports keeps one look.
- **Does ↩ take the first suggestion?** Not by default (`highlightFirst` opts in). In a search box ↩ searches what you typed. Tab and → take the inline completion, which you can see, so the "take the best match" key is always one you chose to press.
- **Which suggestion completes inline?** The highlighted row, if you moved to it with the keys and its value starts with what you typed; otherwise the first row whose value starts with it. The pointer doesn't move the completion (hovering would flicker letters in the field); ↩ takes the highlighted row, Tab the completion.
- **What does choosing write?** The item's `value`. For a person, `value` is the address and `label` the name, so the "To" gets the address and the row shows the name.
- **How many rows?** 8 (`limit`), with no "more" line: an autocomplete helps finish; a longer list is a Combobox.
- **What about "No matches"?** The plate closes. Free text needs no permission, and an empty plate would be noise on every new word.
- **SwiftUI.** `MetalAutocomplete` takes Combobox's item and group types (`MetalComboboxItem`, `MetalComboboxGroup`) and draws the same recipes; its plate is its own view (Combobox's is private to its state), on the same numbers.

**Must**
- [x] React: `Autocomplete` (`items`, `value`, `defaultValue`, `onValueChange`, `placeholder`, `aria-label`, `name`, `required`, `size`, `icon`, `invalid`, `disabled`, `inline`, `highlightFirst`, `filter`, `loading`, `failed`, `onRetry`, `limit`) on Base UI Autocomplete, drawn with Combobox's parts.
- [x] Inline completion: drawn after the caret, Tab or → takes it; only at the end, only while the plate is open.
- [x] Prefix matches first; label or value matches.
- [x] SwiftUI `MetalAutocomplete` (the well, the completion, the plate, the same states).
- [x] Agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Should**
- [x] `recent` before typing.

**Later**
- [ ] Commands at the end.
- [ ] Inline completion in a Textarea (the "Ghost text" entry).
- [ ] Share Combobox's SwiftUI plate as a view of its own once a third control needs it.

- Done (2026-10-06): Must and Should. A small `autocomplete` recipe holds only `self.limit` (8); everything drawn is the field, menu and combobox recipes'. ↩ with no row lit submits the owning form itself (Base UI's hidden input is a second field, which stops the browser's implicit submission). Try again keeps the plate open (Base UI closes it on any row press). 70.3 KB gzip for a lone import, nearly all Base UI's combobox core (Combobox is 81.5). Left: SwiftUI shows `recent` when the plate opens on an empty field with ↓ (it can't see the field's focus) and draws the completion while the plate is open wherever the caret is; the SwiftUI plate is its own view on Combobox's numbers (see Later); no x-ray card.
