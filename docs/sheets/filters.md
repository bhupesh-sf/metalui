# Filters

A row of conditions you build and change in place, each read as a sentence: **Status is Open**, **Amount more than 500**, **Due between 1 Oct – 14 Oct**. From "Components other libraries ship that we don't" § 5 in `docs/BACKLOG.md`, with the date selector's operators (§ 3, "Calendar and DatePicker → date selector") folded in as the date field. Made the way the variation sheets there are: ReUI's Filters, Linear's and Notion's filter bars, Airtable's and Retool's condition builders, GitHub's issue search tokens, macOS Finder's search criteria (the + and − rows) and Apple Mail's smart mailboxes were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## Where it sits

A **Component** (`docs/COMPOSITION.md`): you operate it to change something else (the rows a table shows), and it is the same in any app.

**Not the Filter bar.** `FilterBar` is a Place: a floating frosted pill that *names* a question already asked ("open tasks about the poster · 6 MATCHES · VIA MODEL") and switches how its answer is shown. It has no way to build or change a condition, and its rule is that the palette asks and the bar names. Filters is the asking, for structured data: the controls that build the conditions. They meet without overlapping: a host can put the sentence Filters reads (`describeFilters`) in a FilterBar's `query`. Extending FilterBar would turn a quiet readout into a form and break its "a filter never moves anything" job; building a second bar that names a query would duplicate it. So Filters is new, and FilterBar is untouched.

It is composed. Each condition is a token on the combobox chip's frosted plate (the neutral hairline the chosen values already wear) with the chip's mini remove key; its parts are keys that open the menu's plate (`Menu`) or a `Popover` holding the editor (`Field`, `NumberField`, `CheckboxGroup`, `Calendar`, `Button`); the add key is a compact `Button` with the set's `filter` glyph; tokens arrive and leave with `useRowMotion`; the value turns on the drum (`SwapText`). The bar is one Base UI `Toolbar`. Its own look is small: the token's segments and the hairline between them.

## Jobs

| Job (where it comes from) | Our form | Tier |
|---|---|---|
| Narrow a list by its columns (everyone) | `fields` say what can be filtered (`id`, `label`, `type`, `options`, `icon`, `get`); `value` is a list of conditions `{ id, field, op, value }` the host keeps, so it can save them, put them in a URL, or send them to a server | Must |
| Read what's applied at a glance (Linear, GitHub tokens) | one token per condition reading as a sentence: the field (its glyph and name in ink2), the operator (ink2), the value (ink, the strong word); a token is the combobox chip's plate, 28 tall, level with the add key | Must |
| Add a condition (Linear "+ Filter", Notion) | a compact `Button` with the `filter` glyph and "Filter" opens a `Menu` of the fields (each with its glyph); choosing one lands a token with the field's default operator and opens its value editor at once, focus inside | Must |
| A condition left unfinished (*ours*) | an editor closed with nothing in it takes its token away again (leaving on the release spring): nothing half-built stays in the row, and nothing half-built is applied | Must |
| Change the operator (Notion, Airtable) | the operator is a key: a `Menu` of the operators the field's type allows, the current one checked; a change keeps the value where it still means something (`more than 500` → `between 500 and …`) | Must |
| Change the value (everyone) | the value is a key that opens its editor in a `Popover` under it; the token's value word turns on the drum when it changes and the tokens after it glide to their new places | Must |
| Remove one (everyone) | the token's mini remove key; it leaves one nest down on the release spring and the tokens after it close the gap (`useRowMotion`) | Must |
| Clear all (ReUI, Linear) | a compact "Clear" key after the tokens, **only with two or more**: with one, its own remove key is the clear, and a lone Clear beside a lone token is noise | Must |
| Filter a data grid (ReUI, Retool) | `filterRows(rows, value, fields)` applies the conditions (AND) using each field's `get` (or `row[field.id]`); the host feeds the result to `Table` and its `filter={{ total, matched, onClear }}`, so the table says "12 of 240" with its own Clear. One fact, no second count in the bar | Must |
| **Text** field (everyone) | operators *contains* (default), *is*, *starts with*, *ends with*, *is empty*, *isn't empty*; the editor is a compact `Field` that applies as you type, case-insensitive; the value shows in quotes ("“ana”") | Must |
| **Number** field (everyone; ReUI "range" field) | *is*, *isn't*, *more than* (default), *less than*, *between*, *is empty*; the editor is `NumberField` (two of them with "and" for between), with the field's `unit` engraved; applies as you change it. A "range field" is a number field whose default operator is between (`defaultOp`) | Must |
| **Select** field: one value per row (everyone) | *is* / *isn't* (default *is*); the editor is a `CheckboxGroup` of the options, so you can tick several; *ours*: the operator's words follow the count, "is Open" with one and "is any of Open, Paused" with two, "isn't" becoming "is none of", so there are two operators to choose, not four; more than two show as "Open +2" (Table's tags) | Must |
| **Multiselect** field: several values per row, like labels (ReUI) | *has any of* (default), *has all of*, *has none of*; the same ticked list | Must |
| **Boolean** field (ReUI) | the value key opens a `Menu` of Yes and No; "Paid is Yes" | Must |
| **Date** field (the date selector's operators) | *is* (that day), *before*, *after*, *between*; the editor is a `Calendar` (a range for between, two months side by side) with **Cancel and Apply**: a range means nothing until both ends are picked, so the table waits for Apply instead of flashing a half range. Values are ISO dates (`2026-10-06`), so conditions survive a URL | Must |
| Search a long list of options (ReUI, Notion) | past 8 options a compact `Field` at the top of the list narrows it as you type | Must |
| Chosen options first (ReUI "selected pinned to the top") | when the editor opens, ticked options stand first; they stay where they are while it is open (an option that jumped away from under the pointer as you ticked it would be lost) | Must |
| Keyboard (WAI toolbar) | the bar is one tab stop (Base UI Toolbar); ← → move between the add key, each token's parts and Clear; Enter or Space opens; Esc closes an editor and focus returns to its key; Enter in a text or number editor closes it too. A token is a group named by its sentence ("Status is Open") | Must |
| Say what changed (a11y) | the toolbar is named "Filters"; each token's group says its sentence; remove keys say "Remove Status is Open"; the host's table announces its count | Must |
| Sizes | one size: 28 (the field ladder's compact), the size of a table's toolbar; regular 32 and large 44 dropped, a filter row sits over data, not in a form | Must (compact only) |
| A field's own editor (ReUI custom renderers: toggles, radios, checkboxes) | `field.editor(value, setValue)`: the host's own control in the popover; the operator, token and motion stay ours | Should |
| Find a field among many (Notion's search in "+ Filter") | the field menu takes a search well past 10 fields (Combobox `trigger="button"`) | Should |
| Two conditions on the same field | allowed: `Amount more than 100` and `Amount less than 900` are two tokens; each condition has its own `id` | Must (no extra work) |
| Relative dates ("in the last 7 days", "this month") | presets for a date field, as DatePicker's presets | Later |
| Advanced: nested groups of AND / OR, reorderable, in a sidebar (ReUI advanced, Airtable) | a vertical builder of rows (field, operator, value) in groups with an AND/OR switch per group, drag to reorder on `Sortable` | Later |
| Nested fields (ReUI: `address.city`) | `get` already reaches anything; a field menu with levels would be the Cascader | Later |
| Save a filter as a view (Linear, Notion) | the host's job: `value` is plain data; a pinned view is FilterBar's `onPin` | covered |
| An option that clears the rest ("All", ReUI) | dropped: unticking everything removes the condition, and the token's remove key does it in one press; an "All" row would be a third way to say "no filter" | dropped |
| Free-text query mixed with tokens (GitHub `is:open label:bug`) | dropped: a typed language needs a parser, its errors and its autocompletion; that is a search field's job, and Autocomplete exists | dropped |
| OR between top-level tokens | dropped from the row: a row of tokens reads as "and" everywhere; OR is the advanced builder's (Later) | dropped |
| Count per option in the list ("Open 12") | dropped for now: the host would have to compute it for every option on every change; `options` can carry it in the label | dropped |

## Must

- [x] `Filters` with `fields`, `value` / `defaultValue` / `onValueChange`, `aria-label`, `className`.
- [x] Field types text, number, select, multiselect, boolean, date, with the operators above and the default per type.
- [x] The add key and its field menu; a new token opens its editor; an empty editor closing takes the token back.
- [x] Operator menu; value popover; value on the drum; remove; Clear with two or more.
- [x] Searchable options past 8; ticked options first.
- [x] Date editor with Calendar (range for between), Cancel and Apply.
- [x] Toolbar keys; groups named by their sentence.
- [x] `filterRows` and `describeFilters`; the docs page filters a real `Table` with "12 of 240".
- [x] SwiftUI `MetalFilters` with the same fields, conditions, operators, editors (popovers), tokens, remove and Clear, and `MetalFilters.apply`.
- Done (2026-10-06): Must on Base UI Toolbar with the library's Menu, Popover, Field, NumberField, CheckboxGroup, Calendar and Button; the token wears the combobox chip's plate; `MetalFilters` with `apply` and `describe`. A new or re-opened editor waits for the menu to hand focus back before it opens, so focus lands inside. 103 KB gzip on its own (it composes five Base UI parts and the calendar), the heaviest single import. Left: the Should tier; SwiftUI's popover is the system's (as Popover's and Cascader's are) and its checklist is the WIP CheckboxGroup; no x-ray card.

## Should

- [ ] `field.editor` for a host's own control.
- [ ] A search well in the field menu past 10 fields.

## Later

- [ ] Relative date presets.
- [ ] The advanced builder: nested AND / OR groups, reorder on Sortable, in a sidebar.
- [ ] Nested fields through a Cascader field menu.

## Decide

- Extend FilterBar, or a new component? **New.** FilterBar names a question and switches views (a Place); Filters builds conditions (a Component). They compose: the host may show `describeFilters(value, fields)` as a FilterBar's query.
- Live or Apply? **Live, except dates.** Every tick and keystroke is cheap to see on a table, and seeing the count fall is how you know the filter is right. A date range is meaningless after its first click, so the date editor alone has Cancel and Apply (the date selector's ask).
- Where does Clear all live when a Table shows "12 of 240 · Clear"? **Both, by job.** The table's Clear says "you are looking at a subset"; the bar's Clear sits with the tokens it removes, and only appears when there are two or more of them.
- Four select operators or two? **Two**, whose words follow the count ("is" → "is any of"). The operator menu shows the words for the current count.
- Unfinished conditions? **Never kept.** A token whose editor closes empty leaves; `filterRows` also ignores a condition with no value, so a host-built one can't hide every row.
- Sizes? **Compact (28) only.** A filter row lives over data, in a table's toolbar, at the size of the keys beside it.
- Date values? **ISO day strings** (`YYYY-MM-DD`), compared as days in local time: a filter is data a URL can hold, and "is 6 Oct" means the whole day.
