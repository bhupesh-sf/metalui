# Filters

A row of conditions you build and change in place, each read as a sentence: "Status is Open", "Amount more than 500 €", "Due between 1 Oct – 14 Oct". React: `Filters` from `@unlocalhosted/metalui` (Base UI Toolbar, with the library's `Menu`, `Popover`, `Field`, `NumberField`, `CheckboxGroup`, `Calendar` and `Button`), plus `filterRows` and `describeFilters`. SwiftUI: `MetalFilters`, with `MetalFilters.apply`. The `filters` recipe holds the token's and the editor's sizes; the token's plate is the combobox chip's.

## Use it for

- Narrowing a list of records by its columns: invoices, issues, files, people. Put it above a `Table` and pass the table `filter={{ total, matched, onClear }}`, so the table says "12 of 240".
- Conditions a person keeps: `value` is plain data (`{ id, field, op, value }`), ready for a URL, a saved view or a server query.

## Don't use it for

- Naming a question already asked, or switching how its answer is shown: that is `FilterBar` (a Place). They compose: `describeFilters(value, fields)` is a FilterBar `query`.
- Free-text search: a `Field` with the search glyph above the table (or `Autocomplete`). A row of tokens is not a query language.
- OR between conditions, or nested groups: not built (the advanced builder is Later). The row always means "and".
- A form's own inputs: Filters changes what a list shows, not a record.

## Anatomy

- A row that wraps, tokens 6 apart, then the add key (the button's compact cap, the `filter` glyph, "Filter"), then "Clear" once there are **two or more** tokens (with one, its remove key is the clear).
- A token, 28 tall (the field ladder's compact), on the combobox chip's frosted plate: the field's glyph (14) and name in ink2; the operator key in ink2; the value key in ink; the chip's mini remove key. Keys hover with the menu row's plate, inset inside the token.
- The operator key opens the menu's plate with the field's name as its heading and the current operator checked. A type with one operator (boolean) shows it as plain words.
- The value key opens a popover under it with the editor:

| Type | Operators (default first) | Editor | Applies |
|---|---|---|---|
| `text` | contains, is, starts with, ends with, is empty, isn't empty | compact `Field` | as you type; Enter closes |
| `number` | more than, is, isn't, less than, between, is empty | `NumberField` (two with "and" for between), `unit` engraved | as you change; Enter closes |
| `select` | is, isn't, is empty | `CheckboxGroup` of `options`; the words follow the count (is → is any of, isn't → is none of) | each tick |
| `multiselect` | has any of, has all of, has none of | the same list | each tick |
| `boolean` | is | a menu of Yes and No | the pick |
| `date` | is, before, after, between, is empty | `Calendar` (a range of two months for between), Cancel and Apply | on Apply |

- Lists past 8 options get a search well at the top; chosen options stand first when the list opens and stay put while it is open.

## States and motion

| State | Look | Motion |
|---|---|---|
| add | a token lands with its editor open, focus inside | object spring, from one nest above |
| change | the operator's or value's words turn | the drum; tokens after it glide (settle) |
| unfinished | an editor closing empty takes its token away | the token leaves (release), the rest close up (settle) |
| remove | the mini key; focus goes to the add key | leaves one nest down (release); the gap closes (settle) |
| clear | every token and the Clear key leave together | release, then the add key glides home |
| key open | its hover plate stays while its menu or popover is open | the plate's own fade |

Reduce Motion: tokens come and go at once; words change in place.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `fields` | `fields:` | `{ id, label, type, icon?, options?, unit?, defaultOp?, get? }`; Swift `MetalFilterField(id, label, type, icon:, options:, unit:)` |
| `value`, `defaultValue`, `onValueChange` | `conditions:` (Binding) | `FilterCondition { id, field, op, value }` / `MetalFilterCondition` |
| `aria-label` | `label:` | default "Filters" |
| `addLabel` | `addLabel:` | default "Filter" |
| `filterRows(rows, value, fields)` | `MetalFilters.apply(_:to:fields:value:)` | "and"; incomplete conditions are skipped; `get` (React) / `value:` (Swift) reads a row's field |
| `describeFilters(value, fields)` | `MetalFilters.describe(_:fields:)` | the sentence, joined by "and" |
| `describeFilter`, `filterComplete`, `filterOpWords`, `filterValueWords`, `isoDay` | – | the pieces, for a host's own readout |

Values by type: text a string; number a number, or `[low, high]` for between; select and multiselect the chosen option values; boolean `true` / `false`; date an ISO day (`"2026-10-06"`), or `[start, end]`. Dates compare as local days; a row's date may be a `Date`, an ISO string or a timestamp.

## Rules

- The value is the host's. Keep it, and derive rows with `filterRows`; don't keep a second filtered copy.
- One count: the table says "12 of 240". Don't add a count to the bar.
- A condition with no value is never applied and never kept by the bar.
- Changing an operator keeps the value where it still means something (`more than 500` → `between 500 and …`, a day → the range of that day).
- Field glyphs come in as elements (`<PersonIcon />`), never names.

## Accessibility

- A Base UI toolbar named "Filters" (or `aria-label`): one tab stop, ← → between the keys, Enter or Space opens.
- Each token is a group named by its sentence; the remove key says "Remove Status is Open"; the operator and value keys say "Operator: is", "Value: Open".
- Editors are popovers named by the field and operator; Esc closes and focus returns to the value key (to the add key if the token went).
- The table announces its own count.

## Tokens

`--mu-r-filters-*`: `bar.gap`, `token.height` / `pad-start` / `pad-end` / `gap`, `seg.height` / `pad-x` / `radius` / `glyph` / `glyph-gap`, `editor.width` / `gap` / `rows` / `search`. Look: the combobox chip's plate, the menu row's hover, the button, field, number field, checkbox group and calendar recipes. Motion: the object, settle and release springs; the drum.
