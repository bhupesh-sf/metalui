# Variation sheet: Data grid

From "Variation sheets: Table", Later: "The data grid: arrow keys between cells, editing in place, cell ranges with copy and paste, reordering columns (after Sortable)." And § 3, "Table → data grid" (ReUI Data Grid, shadcn Data Table), whose list is checked off below.

Now: `Table` has kinds, sort, selection, totals, groups, pinning, hiding and sizing, hierarchy, virtual rows and infinite scroll. Its rows are the targets: ↑ ↓ move between rows, ↩ opens one. Nothing walks cells, edits in place, or moves a range through the clipboard. `Sortable` (`useSortable`) reorders any list; its sheet already names "a Table header row" as a host.

How this was made: the WAI-ARIA APG grid pattern (roving focus over cells, the keys), Google Sheets and Numbers (typing replaces, Enter keeps; Enter down, Tab right; one value fills a range; tab-separated clipboard), ReUI's Data Grid and shadcn's Data Table (the checklist), AG Grid (cell editors by type, a failed save) and Apple's HIG (tables, editing) were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Decide

- **A mode of Table, or its own component?** Both, in one sense: **`DataGrid` is its own export that renders `Table` in grid mode.** The grid is a different keyboard model (cells are the targets, not rows: ↩ edits instead of opening, the arrows walk cells, the whole grid is one tab stop), so a page uses one or the other, never a prop flipped at run time. It also costs: the editors (Select 47.7 KB gzip, NumberField 27.1, mostly Base UI's) and Sortable would push `Table` (94.8 of its 96 ceiling) far over. So `Table` gets one small hook (`grid`: `role="grid"`, attributes per cell, the head row for Sortable) and `order` in `TableColumnsState`; `DataGrid` (135.7, ceiling 137) holds the rest. `Table` alone stays at 95.0.
- **Which layer?** A **place**. The person's rows (objects) live in it and you work inside it (the cursor goes in, Tab leaves), and it hosts an instrument (Sortable's drag for the columns), which an object may not (`check:layers`). `Table` stays an object.
- **What an edit commits, and who rolls back.** `onCellCommit({ row, rowKey, column, value, previous })` per cell; the host writes `rows`. Return a promise and the grid shows the new value, dimmed, until it lands; a rejection (or a throw) puts the old value back, shakes the cell, rings it red until it is edited again and says which cell. Like Kanban's `onValueCommit`, the rollback is the grid's: a host that only writes `rows` after a save lands needs no undo code.
- **Paste: one call or many?** One `onCellCommit` per cell, so each cell saves and rolls back on its own. A host that wants one request batches them (a microtask). One batch call is Later if hosts ask.
- **What is copied?** What the cells show, figures bare (`toFixed` to the column's digits, no unit, ASCII minus), a status in its word, dates `YYYY-MM-DD` (and `HH:MM`), check cells TRUE/FALSE, joined by tabs and lines: a spreadsheet takes it and gives it back. `text` and `parse` on a column override.
- **Editors.** The library's own, compact: `Field` for text, code and tags (comma-separated) and dates (the native date input), `NumberField` inspector for figures (percent and progress in hundreds, as shown), `Select` (opened at once) for a status (its words) or any column with `options`. Check and yes cells toggle (Space, ↩, a click). Person, trend and actions cells don't edit without `options` or `parse`.
- **Where the grip goes.** Over each header's start padding, shown on hover and focus (always on touch), so the labels don't move to make room for it.
- **Not with `virtual`, hierarchy or `expandRow` yet.** The grid walks the drawn cells; a virtual window and a treegrid need their own keys. Later.

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **Walk the cells** (APG grid; the backlog) | `role="grid"`, one tab stop (roving `tabindex`), a 2 ring inside the active cell; ← → ↑ ↓, Home / End, ⌘ or Ctrl to the edges; the columns that left a narrow table are skipped | Must (done) |
| **Edit in place** (backlog; ReUI, shadcn) | ↩, F2, a double-click, or typing over the cell; ↩ commits and goes down, Tab right, Escape puts it back, leaving commits | Must (done) |
| **Save, and a save that fails** (AG Grid; Kanban's commit) | `onCellCommit`, saving dim, rollback with a shake, a red ring and the live region | Must (done) |
| **A cell that can't change** (a computed margin) | `editable` false or a function: `aria-readonly`, and a try shakes it once | Must (done) |
| **Select a range** (backlog; ReUI "select cells") | Shift with any move, Shift-click, a drag; ⌘A; Escape back to one cell; `aria-selected`; the selected rows' green, a step stronger | Must (done) |
| **Copy and paste ranges** (backlog; ReUI, Sheets) | ⌘C / ⌘X / ⌘V as tab-separated text; paste from the range's top-left; one value fills the range; refused cells shake and are counted; Delete clears | Must (done) |
| **Reorder columns** (backlog "after Sortable"; ReUI "move") | `reorderable`: Sortable's grip and keys on the header row; `order` in `onColumnsChange` | Must (done) |
| **Undo an edit** (Sheets ⌘Z) | Later: the host's toast can offer Undo (it has `previous`). | Later |
| **Fill down by dragging a corner** (Sheets' fill handle) | Later; one value pasted into a range covers the common case. | Later |
| **Quoted clipboard cells** (Excel quotes a cell holding a tab or a line) | Later: a value with a tab or line break pastes split; copying flattens them to a space. | Later |
| **Formulas** (Sheets) | Dropped: a grid of records is not a spreadsheet; computed columns are the host's `value`. | Dropped |

## § 3 "Table → data grid": the ReUI / shadcn checklist

| Item | Verdict |
|---|---|
| Looks: cell borders | **Done**: `DataGrid` parts cells with a hairline (the rule), head included. Table keeps none (its rows are the targets). |
| Looks: dense | **Covered**: `density` compact 32 (and roomy 48). |
| Looks: light (rounded rows, no header fill) | **Dropped**: the reading guide's plate is already rounded; Table's sheet "Not doing". |
| Looks: striped | **Dropped**: the reading guide does it (Table's sheet "Not doing"). |
| Looks: auto column width | **Covered**: the table lays out by content, the primary column takes what is left; `resizable` widths, and a double-click gives a column back its own width. |
| Columns: resize | **Covered**: `resizable` (Table). |
| Columns: move | **Done**: `reorderable` (DataGrid). |
| Columns: show/hide | **Covered**: `columnsMenu` (Table). |
| Columns: pin rows to the top or bottom | **Dropped**: the head holds the top and the totals row the bottom; pinning a record is an order the host chooses (sort, `groupBy`), and a row that ignores the sort lies about the order. Pinning a column is covered (`pin: 'start'`). |
| Rows: tree rows that expand | **Covered**: `childRows` (Table). |
| Rows: virtualised rows | **Covered** for Table (`virtual`); a virtual DataGrid is Later. |
| Spreadsheet editing: select cells | **Done** (DataGrid ranges). |
| Spreadsheet editing: copy and paste | **Done** (DataGrid clipboard). |
| Spreadsheet editing: edit in place | **Done** (DataGrid editors and `onCellCommit`). |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| saving | the cell's content dims (opacity) | settle |
| failed, refused | the cell (or the field) shakes once | refusal |
| a column lifted | Sortable's: the headers glide (FLIP); the lifted one on the raised plate; the body's cells follow at once | settle |
| everything else | nothing moves: the ring is the cursor, the tint the range | – |

Reduce Motion: no shake (the refusal travel is zero); Sortable's own rules.

## SwiftUI

`MetalDataGrid` draws the table recipe's rows with its own focusable cells (`@FocusState`, `onKeyPress`, macOS 14 and iOS 17): arrows walk, Return edits in a `TextField`, Escape cancels, Return commits with `onCommit` (async throws: a throw puts the value back and shakes). Ranges are not there (SwiftUI has no cell selection); copy and paste take the focused cell (`onCopyCommand`, `onPasteCommand`, macOS). Columns reorder by dragging a header onto another (`draggable`, `dropDestination`), without keys. Every editor is a text field.

## Left

- A virtual DataGrid; a treegrid (hierarchy with cells); `expandRow` in a grid.
- Undo; a fill handle; quoted TSV; one batched commit for a paste.
- The body's cells jump (the headers glide) when a column moves.
- PageUp / PageDown.
- SwiftUI: ranges, keyboard column moves, kind-specific editors.
