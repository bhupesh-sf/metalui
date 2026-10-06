# Tree

Nested rows that open and close in place, walked with the keyboard: files in a project, pages in a space, accounts, an org. React: `Tree` (with `Tree.Guides` and `Tree.Disclosure`, also exported as `TreeGuides` and `TreeDisclosure`) from `@unlocalhosted/metalui`. SwiftUI: `MetalTree` with `MetalTreeItem`. It follows the WAI-ARIA tree pattern (Base UI has no tree). Every row is a `Row` (list); the `tree` recipe adds the sizes, the guides, the chevron's turn and the type-ahead window. The variation sheet is `docs/sheets/tree.md`.

## Use it for

- A hierarchy you walk and open things from: a project's files, a wiki's pages, a chart of accounts, an org.
- A sidebar's navigation when it nests more than one level.

## Don't use it for

- One level of sections that open in place (`Accordion`), a menu of commands (`Menu`), or choosing one value through levels inside a field (the Cascader, which reuses this tree's pieces).
- Rows with columns (`Table`; its hierarchy rows reuse `Tree.Guides` and `Tree.Disclosure`).

## Anatomy

- One flat list of the rows that show (`role="tree"`, each row a `treeitem` with `aria-level`, `aria-setsize`, `aria-posinset`).
- A row: its guides (one column of the indent's width per ancestor, an engraved groove at the column's centre, the full height of the row so the grooves join), the disclosure (the set's `chevron` in one more column; empty for a leaf so names line up), the item's glyph (`Row.Lead`, ink2), the name (`Row.Text`, one line, an ellipsis), a quiet trail (ink2).
- Sizes (the field ladder): large 44 (indent 20, glyph 18), regular 32 (16, 16), compact 28 (14, 14). The chevron is 12 in all three.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover, keyboard focus | the row's hover raise; focus adds the focus ring | the row's fade |
| the branch you're in | while the tree holds focus, the grooves of the focused row's parent light from the rule to `guide.lit` | opacity, settle |
| closed / open | chevron points right / down | a quarter turn on the part spring (may overshoot its stop) |
| opening | children land from one nest above, fading in; rows below glide down | object; settle |
| closing | children leave one nest down, fading; then the rows below glide up into the gap | release; settle |
| loading a level | quiet for the show delay (400 ms), then the ring in the chevron's place and the rest of the row dimmed (`Row` `waiting`) | the spinner's clock (`useWait`) |
| load failed | the branch closes; `sync-error` in the chevron's place; the trail says "Couldn’t load · Try again" (it describes the row); opening it again retries | – |
| empty branch | opened with `children: []`: one row "Empty" in ink3 at the children's level (hidden from assistive tech) | lands like a child |
| selected | the raised plate (`Row` `selected`), held through hover | the row's fade |
| opened | the green rail (`Row` `opened`): the row whose content is showing | – |
| disabled | everything but the guides at 40 %; can't be selected, acted on or renamed; the keyboard still reaches it | – |
| typing | the letters type-ahead heard are underlined on the row it found, until the window (500 ms) closes | – |

Reduce Motion: rows jump, land and leave at once; the chevron and the lit groove change at once.

## Keyboard (WAI-ARIA tree)

| Key | Does |
|---|---|
| Tab | enters on the selected row (or the first), leaves the tree: one tab stop (roving tabindex) |
| ↓ ↑ | next / previous row that shows (disabled rows included) |
| → | closed branch: opens it (loads it). Open: goes to its first child |
| ← | open branch: closes it. Otherwise: goes to the parent |
| Home / End | first / last row |
| Enter | `onAction`; without one, opens or closes a branch |
| Space | selects (single), toggles (multiple). While typing a name, it is a letter |
| ⇧↓ ⇧↑, ⇧Space | multiple: extends the range from the last row chosen |
| ⌘A / Ctrl+A | multiple: every row that shows |
| `*` | opens every branch beside the focused row |
| letters | type-ahead: within 500 ms they build a word; the next row starting with it takes focus. One letter repeated cycles |
| F2 | with `onRename`: QuickEdit on a plate under the row; Enter commits, Esc cancels, focus comes back to the row |

Pointer: a click focuses and selects (⌘-click toggles, ⇧-click takes a range); with `selectionMode="none"` a click acts. A double-click acts. A click on the chevron opens or closes without selecting. Selection never follows focus. SwiftUI on iOS has no modifier clicks: ⌘-click and ⇧-click are macOS only, and a hardware keyboard takes the keyboard paths.

## API

| React | SwiftUI |
|---|---|
| `items: TreeItem[]` `{ id, label, icon?, children?, hasChildren?, disabled?, trail? }`; `icon` may be `(open) => …` | `items: [MetalTreeItem]` (`MetalTreeItem(id, label, icon:, children:, hasChildren:, disabled:, trail:)`) |
| `label` (the tree's name) | first argument |
| `size` large / regular / compact | `size:` |
| `selectionMode` none / single / multiple (default single) | `selectionMode:` |
| `selected` / `defaultSelected` / `onSelectedChange` (ids) | `selection: Binding<Set<String>>` |
| `expanded` / `defaultExpanded` / `onExpandedChange` (ids) | `expanded: Binding<Set<String>>` |
| `opened` (id) | `opened:` |
| `onAction(item)` | `onAction:` |
| `loadChildren(item)`: add the children to your items, then resolve; reject to fail | `loadChildren: (MetalTreeItem) async throws -> Void` |
| `onRename(item, next)`, `validateName(item, next)`, `fileNames` (a leaf keeps its extension out of the selection) | `onRename:`, `validateName:` (from the row's context menu) |
| `words` `{ empty, failed, retry, loading(item), rename }` | `words: MetalTreeWords` |

```tsx
<Tree
  label="Project files"
  items={items}
  defaultExpanded={['design']}
  opened={openFile}
  onAction={(item) => openFileFor(item)}
  loadChildren={async (item) => {
    const children = await fetchFolder(item.id);
    setItems((was) => withChildren(was, item.id, children));
  }}
  onRename={(item, next) => rename(item.id, next)}
/>
```

## The pieces, for other rows at a level

`TreeGuides` (`Tree.Guides`) draws a row's indent: `level` (from 1), `lit` (the level whose groove lights), `size` where no `Tree` sets one (a table cell); its children go after the grooves (the disclosure). `TreeDisclosure` (`Tree.Disclosure`) is the chevron column: `branch` (false keeps an empty column), `open`, `phase` (from `useWait`, the ring after the delay), `failed` (`sync-error`), `label` (said when the ring shows). Both are presentational: the host gives the disclosure its role, name, `aria-expanded` and keys when it is the control (a table cell), as the docs page's account table does.

## Rules

- Flat rows, never nested groups: one list is what the rows' motion animates and what a virtual window will cut.
- Branches carry no glyph by default; the chevron says it opens. Pass an `icon` for what your rows are; for folders, a function of `open` that morphs the set's pair: `icon: (open) => <MorphIcon name={open ? 'folder-open' : 'folder'} />` (in a library component, `MorphPair` with `folderMorph` and `folderOpenMorph`).
- One disclosure: the chevron. Never plus and minus (they mean add and remove in the set).
- A failure says so in words on the row; colour and glyph never carry it alone.
- Later (see the sheet): drag to move with a drop line (after Sortable), virtual rows, cascading checkboxes.
