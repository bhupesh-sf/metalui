# Data grid

A table whose cells are targets: walk them with the arrow keys, edit them where they stand, select a range and copy or paste it. React: `DataGrid` from `@unlocalhosted/metalui`. SwiftUI: `MetalDataGrid`. A place: the person's rows live in it and you work inside it (the cursor goes in, Tab leaves), so it can host an instrument (Sortable's drag for the columns). It **is** a `Table` (an object) in grid mode (`role="grid"`, the APG grid pattern), with `Field`, `NumberField` and `Select` as cell editors, the row `Checkbox` for check cells and `useSortable` for the header row. The `data-grid` recipe adds the cell hairlines, the focus ring, the range tint, the saving dim and the grip's reveal.

## Use it for

- A price list, stock counts, a bulk edit, a budget: rows a person changes many of, cell by cell, and moves to and from a spreadsheet.
- Columns a person arranges for their own work (`reorderable`).

## Don't use it for

- Records you open (invoices, issues): use `Table`, whose rows are the targets (`onRowAction`). A grid's Enter edits, it doesn't open.
- One value edited now and then: `QuickEdit` in a popover, or a form.
- A hierarchy (`childRows`), detail in place (`expandRow`) or ten thousand rows (`virtual`): Table only, for now.

## Anatomy

- Everything of `Table` (caption, head, kinds, sort, selection, totals, groups, pinning, sizing, waiting and empty), plus:
- A hairline (the rule) between cells, head included.
- The active cell: a 2 ring in the focus colour inside it. It is the grid's one tab stop.
- A range: the cells' quiet green tint (a step stronger than a selected row's).
- The editor: in the cell, 4 from its sides. Text, code and tags: a compact `Field` (tags as "a, b"). Number, currency, percent, delta, progress: a compact `NumberField` inspector (percent and progress in hundreds, as shown). Date: a `Field` date input (`format: 'date'`) or date-and-time. Status, or any column with `options`: a compact `Select`, open at once. Check and yes: no editor, they toggle.
- Reorder grip (`reorderable`): Sortable's knurl at each header's start, shown on hover and focus (always on touch).

## States and motion

| State | Look | Motion |
|---|---|---|
| active | the 2 ring inside the cell | none (it is the cursor) |
| range | green tint on each cell; `aria-selected` | none |
| editing | the editor in the cell; the ring gives way to the field's own | the editor takes focus at once |
| saving (`onCellCommit` returned a promise) | the new value, dimmed to .55; `aria-busy` | opacity on settle |
| saved | the value from `rows` | the dim lifts (settle) |
| failed (rejected or threw) | the old value; a red 2 ring until the cell is edited again; said in the live region | the cell shakes once (refusal) |
| refused (not editable; text that means nothing for the kind; a paste into such a cell) | unchanged | the cell (or the field) shakes once |
| column lifted | the header on the raised plate and shadow | headers glide (the rows' motion); the body's cells follow at once |

Reduce Motion: the shake is still (the refusal travel is zero); Sortable's own rules for the lift.

## API

| React | SwiftUI |
|---|---|
| Every `Table` prop except `onRowAction`, `opened`, `expandRow`, the hierarchy props and `virtual` | `MetalDataGrid(rows, columns:)` |
| `columns`: `DataGridColumn` = `TableColumn` + `editable` (boolean or `(row) => boolean`), `options` (`SelectOption[]`), `parse(text, row)` (undefined refuses), `text(value, row)` (the copied text) | `MetalDataGridColumn(MetalTableColumn(…), editable:, parse:)` |
| `onCellCommit({ row, rowKey, column, value, previous })`: put the value in `rows`; return a promise to show it saving; reject to put it back | `onCommit: (row, columnID, value) async throws` (the grid shows the value while it runs) |
| `reorderable`: the header grips; the order lands in `onColumnsChange` as `order` (also `columnsState`, `defaultColumnsState`) | `columnOrder:` binding |

## Patterns

- **Saving each cell**: `onCellCommit` updates the host's rows, then saves; reject to roll back (the grid shows the old value and says "Couldn’t save Price for Lisbon."). A host that writes `rows` only after the save lands can return the save's promise: the grid shows the new value, dimmed, until then.
- **Paste from a spreadsheet**: tab-separated text pastes from the active cell (or the range's top-left) rightwards and down; one value fills the whole range. Each cell is one `onCellCommit` (batch them on the host if the server wants one request). Cells that can't take a value shake and are counted ("Pasted 6 cells. 2 can’t take it.").
- **Copy to a spreadsheet**: what the cells show, figures bare (no unit, a real number), a status's word, dates as `YYYY-MM-DD` (and the time), check cells TRUE/FALSE, so it pastes back in.
- **Choices**: a status column edits with its words; any column with `options` edits with a Select and commits the option's `value` (map it with `parse`).
- **Totals**: a column's `total` recomputes from `rows`, so an edit turns it on the drum.

## Keyboard and accessibility

- The table is `role="grid"` `aria-multiselectable`; its cells are gridcells (`aria-readonly` when not editable, `aria-selected` in a range, `aria-busy` while saving). One cell is in the tab order; Tab leaves the grid.
- ← → ↑ ↓ move; Home / End to the row's ends; ⌘ or Ctrl with an arrow, Home or End to the grid's edges. Shift with any of them extends the range; ⌘A selects every cell; Escape returns to one cell.
- Enter or F2 edits (caret at the end); typing a character edits with it replacing the value; a double-click edits. In the editor: Enter commits and goes down (Shift up), Tab commits and goes right (Shift left), Escape puts the value back, leaving the cell commits.
- Space, Enter or a click toggles a check or yes cell.
- ⌘C copies, ⌘X cuts, ⌘V pastes, Delete or Backspace clears the range. The live region says what happened ("Copied 6 cells.", "Pasted 4 cells.").
- Column grips (`reorderable`) are Sortable's: "Move Price", Space lifts, ← → move, Space drops, Escape puts it back, each step said.
- The row checkbox column (with `selected`) and keys inside cells (row actions) keep their own tab stops.

## Rules

- Make a column `editable` only where a person owns the value; leave computed ones (a total, a margin) read-only: they shake when tried.
- Units in the header, bare figures in the cells and on the clipboard.
- Commit per cell and roll back per cell; never leave a cell showing a value that wasn't saved.
- Colour never carries a state alone: a failed cell shakes and is said; a range is also `aria-selected`.

## SwiftUI differences

- `MetalDataGrid` draws Table's rows with the table recipe and its own focusable cells (`@FocusState`, `onKeyPress`, macOS 14 and iOS 17): arrows move, Return edits in a `TextField`, Escape cancels, Return commits; a failed commit puts the value back and shakes.
- Ranges, ⌘A and Shift-arrows are not there: SwiftUI has no cell selection; copy and paste (`onCopyCommand`, `onPasteCommand`) take the focused cell only, on macOS.
- Columns reorder by dragging a header onto another (`draggable` and `dropDestination`), no grip; no keyboard reorder yet.
- Editors are text fields for every kind (numbers parsed by the column's `parse` or `Double`); no Select or NumberField in the cell.
