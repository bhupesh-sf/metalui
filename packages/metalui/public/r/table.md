# Table

Rows of a person's things, read across and compared down. React: `Table` (and `TableCell`) from `@unlocalhosted/metalui`. SwiftUI: `MetalTable` (and `MetalTableCell`). An object: engraved `label`s, `rule` hairlines, the row `checkbox`, the `row`'s rail, and the parts its cells are made of (`led`, `avatar`, `chip`, `meter`, `sparkline`, `skeleton`); the `table` recipe adds the densities, the cell sizes, the sticky frost and the narrow-width rules.

## Use it for

- Records: one row per thing you can open (invoices, issues, members, files, deployments): a primary column with a second line, status, a person, a date, row actions, selection, sort, a visible filter, pages.
- Numbers to compare (balances, usage, line items): figures aligned at the end, units in the header, deltas, trends.

## Don't use it for

- One thing's details (use `Properties`), layout (use a grid), or a handful of things (use cards).

## Anatomy

- Caption: names the table (title type), or hidden for assistive tech; with `filter`, "12 of 240" on the drum and a Clear key.
- Head: 32 tall, engraved labels, the unit after the label in ink3 ("Amount (€)"); a sortable label is a button with the `arrow` glyph. Sticky, on frost, inside a scroll container (`maxHeight`).
- Rows: `density` roomy 48 (touch), regular 40, compact 32 (a minimum: a second line grows it); padding 12 at the sides, parted by hairlines.
- Primary column (the first, or `primary`): takes the room that is left and truncates; `detail` is its second line in ink2; with `onRowAction` it is a button stretched over the row.
- Selection (optional): a first column of row checkboxes; select-all in the head.
- Reading guide: one plate (the menu's row highlight) under the hovered or focused row.

## Cell kinds

A column says its `kind`; the kind sets alignment, type and the empty look. `cell` renders anything else. `TableCell` draws one value alone (in `Properties`, a card).

| Kind | Value | Look |
|---|---|---|
| `text` (default) | string | truncates with an ellipsis, the whole in a tooltip when cut; non-primary text stops at 280 |
| `number` | number | tabular, end-aligned; `digits`; the `unit` in the header |
| `currency` | number | two places, no symbol in the cell; the symbol of `currency` in the header |
| `percent` | a share, 0–1 | shown in hundreds; "%" in the header |
| `delta` | signed number | "+12.4" or "−3.2" with an up or down `arrow`; the arrow green when good, red when bad (`better`, up by default); zero in ink2 with no arrow |
| `date` | Date, ISO string or ms | `format` relative ("3h ago", "in 2 days", the exact time in a tooltip; a week or more becomes a short date), or `date`, `time`, `datetime` |
| `status` | `live` `waiting` `failed` `off`, or `{ status, label }` | a small LED and its word; `words` renames them ("Paid", "Due", "Overdue"); the LED never blinks in a table |
| `person` | `{ name, src? }` or several | avatar (small) and name; several overlap, 3 then "+N" |
| `tags` | string[] | up to two tag chips, then "+N" with the rest in a tooltip |
| `progress` | a share, 0–1 | a slim 12-lamp meter, its percent in a tooltip and said to assistive tech; green unless `warn`/`danger` say where it turns |
| `trend` | number[] | a mini sparkline 72 wide, named "from a to b" |
| `yes` | boolean | `check` for yes; nothing for no (said to assistive tech) |
| `code` | string | monospaced; a copy key on hover and focus that turns to `check` |
| `actions` | – (`actions(row)`) | a `more` key at the row's end, on hover and focus, opening a `Menu`; one `primary` action with an icon shows as its own key beside it |
| empty | null, undefined, "" or [] | "—" in ink3 in every kind |

Real minus signs everywhere. Numbers are never red alone: a sign or a glyph carries it.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover, focus | the guide plate under the row | the plate glides row to row on the settle spring |
| sort | the arrow points the way; rows reorder | the arrow morphs up ↔ down (settle); each row travels from where it was (settle) |
| selected | a quiet green tint; head checkbox mixed or ticked | the checkbox's own |
| opened | the row's green rail at the start | – |
| actions, copy | keys at the row's end | fade in on hover or focus (settle); always shown without hover (touch) |
| loading, no rows | `loadingRows` skeleton rows in the columns' shapes | the skeleton's own delay and sheen |
| loading, rows | the rows stay, `aria-busy` | they dim after the show delay (`useWait`, the spinner's item dim) |
| empty | `empty` (say what would be here, and the action that starts it) | – |
| nothing matches | `emptyFiltered` and Clear | – |
| failed | `sync-error`, `error.message`, Try again | – |
| narrow | under 720 priority 3 columns leave, under 560 priority 2 (and the side padding narrows to 8); their values join a line under the primary cell, each after its header in ink3 | – |

Reduce Motion: rows jump to their places; the arrow and the guide change at once.

## API

| React | SwiftUI |
|---|---|
| `columns` (`key`, `header`, `kind`, `unit`, `value`, `detail`, `cell`, `sortable`, `sortBy`, `align`, `priority`, `primary`, `actions`, `currency`, `digits`, `format`, `better`, `words`, `warn`, `danger`), `rows`, `rowKey` | `MetalTable(rows, columns: [MetalTableColumn(…)])` |
| `caption`, `captionHidden` | `caption:` |
| `density` | `density:` (`.roomy`, `.regular`, `.compact`) |
| `sort`, `defaultSort`, `onSortChange` | `sort:` binding |
| `selected`, `onSelectedChange`, `rowLabel` | `selection:` binding |
| `onRowAction`, `opened` | `onOpen:`, `opened:` |
| `filter` (`total`, `matched`, `onClear`) | `filter:` |
| `loading`, `loadingRows`, `error`, `empty`, `emptyFiltered` | `loading:`, `error:`, `empty:` |
| `maxHeight` | a fixed frame (the head is pinned) |
| `now` | `now:` |
| `TableCell` (`kind`, `value`, the format props) | `MetalTableCell(_:format:)` |

## Patterns

- **Many rows at once**: `selected` plus a `ToolStrip` over the list with its `count` on the drum ("3 selected", `SwapText`), destructive verb last, × to clear. The table doesn't own the strip.
- **Pages**: `Pagination` under the table for records (sort across all pages on the host, show one page); a "Load more" `Button` for feeds. No infinite scroll until virtual rows.
- **Details**: open a row (`onRowAction`), mark it `opened`, and show its fields as `Properties` with `TableCell` values.

## Keyboard and accessibility

- A real `table` with a caption and column headers; a sortable header says `aria-sort` and its button is in the tab order. Row checkboxes are named "Select Lisbon"; select-all is mixed when some are chosen.
- With `onRowAction`, the primary cell is a button: Tab reaches it, ↩ or a click anywhere on the row opens, ↑ ↓ move between rows. The keys at the row's end are their own buttons ("More for Lisbon", "Copy INV-2045").
- Meters and trends are named by their column; a yes/no cell says Yes or No; an empty cell says none.
- While loading, the table is `aria-busy`.

## Rules

- Say the kind, not the look; reach for `cell` only when no kind fits.
- Units in the header, bare tabular figures in the cells.
- Sort only columns where order means something.
- Give every column but the name a `priority` when the table can get narrow; never scroll records sideways.
