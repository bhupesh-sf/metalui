# Tree

Nested rows that open and close in place, walked with the keyboard: files in a project, pages in a space, accounts in a chart, an org. From "Components other libraries ship that we don't" § 2 in `docs/BACKLOG.md`. Made the way the variation sheets there are: ReUI's Tree, shadcn's file tree, React Aria's `Tree`, the WAI-ARIA tree pattern, Finder's list view, VS Code's explorer and Things' areas were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## Where it sits

A **Component** (`docs/COMPOSITION.md`): you operate it to change something else (open a file, pick a page, choose a value), and it is the same in any app. Not an Object: its rows stand for things, but the tree is how you reach them, not a thing you hold. Not a Place: a `Sidebar` is the place; a tree is one of the things it holds.

It is composed: every row is a `Row` (`selected`, `opened`, `waiting`), the disclosure is the set's `chevron`, a wait is a `Spinner` on `useWait`'s clock, rows arrive and leave with `useRowMotion`, and renaming is `QuickEdit` in a `Popover`. Its own look is two pieces, exported for Table's tree rows and the Cascader's tree mode:

- `Tree.Guides`: the indent with one engraved guide line per level.
- `Tree.Disclosure`: the chevron that turns a quarter on the part spring, or the ring while a level loads.

## Jobs

| Job (where it comes from) | Our form | Tier |
|---|---|---|
| See where a row sits (ReUI guide lines, VS Code indent guides) | `Tree.Guides`: one engraved hairline per level at the parent's chevron centre; *ours*: the guide of the branch that holds the focus brightens from ink4 to ink3, so you see which branch you are in without a box around it | Must |
| Open and close a branch (everyone) | the set's `chevron`, pointing right when closed and down when open, a quarter turn on the part spring (it may overshoot its stop, like the accordion's); children land from one nest above on the object spring and the rows below glide down (settle); closing, they leave one nest down (release) and the rows below close the gap | Must |
| Chevron or plus/minus (ReUI) | chevron only | dropped: `plus` and `minus` mean add and remove in our set |
| Folder open, folder closed, file glyphs (ReUI, shadcn) | each item takes its own `icon` (or a function of `open`), so a host shows what its rows are: `document`, `person`, `calendar` | Must (the slot); the set has no `folder` glyph yet: Later, drawn as a `folder` → `folder-open` morph pair, then the slot takes it |
| Indent per level (ReUI `indent`) | `indent` follows the size (regular 16, compact 14, large 20) and is a recipe prop, not a free number | Must |
| Walk it with the keyboard (WAI-ARIA tree) | one tab stop (roving tabindex); ↑ ↓ to move; → opens, then goes to the first child; ← closes, then goes to the parent; Home / End; `*` opens every sibling; Enter is the row's action | Must |
| Find a row in a long tree (WAI type-ahead, Finder) | type-ahead over the visible rows: letters typed within the half second go to the next row whose name starts with them; *ours*: the matched letters are underlined in ink for as long as the word is being typed, so you see what it heard | Must (type-ahead), Should (the underline) |
| Choose (React Aria `selectionMode`) | `selectionMode` none / single / multiple. Single: click or Space selects, the row raises (`Row` `selected`). Multiple: ⌘-click and Space toggle, Shift-click and Shift+↑↓ extend, ⌘A takes every visible row; `aria-multiselectable`. Selection never follows focus | Must |
| Show what is open (VS Code's active file) | `opened`: the row whose content is showing carries `Row`'s green rail, separate from selection | Must |
| Act on a row (open a file) | `onAction` on Enter, and on click when `selectionMode` is none | Must |
| Levels that load when opened (React Aria async, Cascader) | an item with `hasChildren` and no `children` calls `loadChildren` on opening; the chevron's slot waits (`useWait`: nothing for a fast load, the ring after 400 ms, the children land); a failed load closes the branch, its slot shows `sync-error` and the row says "Couldn't load · Try again"; opening it again retries | Must |
| Disabled rows | dimmed, skipped by selection and action, still reachable by the keyboard (WAI) so it can be read | Must |
| An empty branch | opened with no children: one quiet row in ink3, "Empty", at the child level | Should |
| Rename in place (Finder Enter, VS Code F2) | F2 (and a double-click on a selected row's name) opens `QuickEdit` in a popover on the row, the name selected (a file keeps its extension out); refused names keep the plate; the save waits on the key | Should |
| Sizes | `size` large 44 / regular 32 / compact 28 (the field ladder) | Must |
| A long tree (React Aria virtualiser) | rows are flat (a list of the visible rows with `aria-level`, `aria-setsize`, `aria-posinset`), so a window of them can be drawn | Later: virtual rows |
| Drag to move with a drop line (ReUI) | on Sortable's grip and keyboard path: the drop line is a 2 pt green rail at the target's indent; hovering a closed branch for 600 ms opens it; ← and → while moving change the level | Later (after Sortable) |
| Checkboxes that cascade (Cascader's many values) | a `Checkbox` in `Row.Lead`, a parent mixed when some children are on | Later (with the Cascader) |

Not doing: lines drawn to every child (the box-drawing elbow look; the guides already say the level); plus/minus toggles (above); colour per level (colour carries no level); opening a branch on single click of its name (a click selects; the chevron and → open it, as in Finder and VS Code).

## Must

- [ ] `Tree` with `items` (`{ id, label, icon?, children?, hasChildren?, disabled?, trail? }`), `expanded` / `defaultExpanded` / `onExpandedChange`, `selected` / `defaultSelected` / `onSelectedChange`, `selectionMode`, `opened`, `onAction`, `loadChildren`, `size`, `label` (the tree's accessible name).
- [ ] The WAI-ARIA tree pattern on flat rows: `role="tree"`, `treeitem` with `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` on branches, `aria-selected` when selection is on, roving tabindex, the keys above, type-ahead.
- [ ] `Tree.Guides` and `Tree.Disclosure` exported for Table and the Cascader.
- [ ] Motion: the chevron's quarter turn (part), children land (object) and leave (release), the rest glide (settle); Reduce Motion: all at once.
- [ ] Lazy levels with the small-item wait; a failed load with Try again.
- [ ] SwiftUI `MetalTree` with the same items, keys (macOS), selection, guides and motion.

## Should

- [ ] Rename in place (F2): `onRename` and `validateName`, through `QuickEdit` in a `Popover`.
- [ ] The empty branch row.
- [ ] Type-ahead underline.

## Later

- [ ] Drag to move with the drop line (after Sortable).
- [ ] Virtual rows.
- [ ] Cascading checkboxes (with the Cascader).
- [ ] `folder` / `folder-open` glyphs in the set.
- [ ] Table's hierarchy rows built on `Tree.Guides` and `Tree.Disclosure`.

## Decide

- Flat rows or nested groups (`role="group"`)? **Flat.** One list of visible rows is what `useRowMotion` animates (direct children marked `data-row`), what a virtual window can cut, and what Table's rows already are; ARIA allows it when every item carries `aria-level`, `aria-setsize` and `aria-posinset`.
- Does selection follow focus? **No.** Arrowing through a project shouldn't open every file on the way; Space or a click selects, Enter acts. (React Aria and VS Code agree; WAI allows either.)
- Turn or morph for the chevron? **Turn.** The glyph's meaning doesn't change (it is still "open this"), only its direction; a CSS rotate on the part spring is transform-only and costs nothing on a tree of hundreds of rows, where a `MorphIcon` per row would plan a morph each.
- Where does the wait show? **In the chevron's slot**, the row's own glyph slot for "open": the ring stands in for the chevron, which is where you pressed.
- A failed load: a child row, or on the row itself? **On the row**: the branch closes, its chevron slot shows `sync-error`, and the row's trail says "Couldn't load · Try again"; → or a click on the slot retries. Nothing is left open over a hole.
- Default glyph for branches? **None.** Without a `folder` glyph in the set, the chevron already says "this opens"; a host passes its own `icon`.
