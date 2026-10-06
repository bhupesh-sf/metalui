# Cascader

A value chosen through nested levels: a product's category, a place (region › country › city), a folder to save into. React: `Cascader` from `@unlocalhosted/metalui`. SwiftUI: `MetalCascader` with `MetalTreeItem`. It is composed: the field's well and mini keys, the menu's frosted plate, rows and hairline, `Row`'s slots, `Tree.Disclosure` for a branch's chevron and its wait, the combobox's matched letters, detail rows and chips, `Checkbox` at row size, on Base UI Popover (the columns' keys are its own; Base UI has no cascader). The `cascader` recipe adds the column, the path and a level's arrival. The variation sheet is `docs/sheets/cascader.md`.

## Use it for

- One value (or a few) from a hierarchy too big for one list: a category, a place, a folder, a department.
- A form field: it sits level with the fields beside it (regular 32, compact 28).

## Don't use it for

- A hierarchy you walk and open things from, or one that opens in place on the page: `Tree` (`selectionMode="single"` makes it a chooser). A cascader has no tree mode; that is Tree.
- One flat list, however long: `Combobox` (search) or `Select` (a few).
- Where you are in an app: `Breadcrumbs` (navigation; the cascader only borrows its look for the path).

## Anatomy

- The well (the field's, regular or compact): the chosen path in ui type, the levels above in ink2, small engraved chevrons in ink3, the last in ink; more than three levels keep the last two and fold the start into "…". The placeholder in the field's hint ink. Its trail: the clear key (once there is a value) and a chevron that turns while the plate is open. The whole well is the button (an overlay `Popover.Trigger`); its name is `aria-label` plus the path.
- Several values: the combobox's chips in the well, each with a remove key; the well grows a line when they wrap.
- The plate (the menu's, aligned to the well's start, at least as wide): the search well at its top, then one column per level opened (200 wide, scrolling past eight rows), parted by the menu's hairline standing upright. Each column is a `listbox` named for its parent.
- A row (the menu's row): a row-size checkbox (several values), the item's `icon`, its name, its `trail` (a count, ink2), the check (the single value), the chevron for a branch (`Tree.Disclosure`, pointing on).
- Search: one list of matches, each its name over its path (meta type, ink2).
- Drill (`layout="drill"`): one column as wide as the well under a header with a back key and the level's name engraved.

## States and motion

| State | Look | Motion |
|---|---|---|
| open | the plate under the well; the well keeps its focus ring | the menu's fade (settle in, release out) |
| on the trail | the row a column opened holds the option's raised plate | – |
| highlighted | one highlight in the column the keys are in (pointer and keys share it) | glides on the settle spring (the menu's live list) |
| chosen | a check at the row's end; the path in the well | – |
| a level opens | a new column (or, drilling, the level) | arrives one grid step from the right, fading in (settle); drilling back, from the left. Columns there when the plate opened stand still |
| loading a level | quiet for the show delay (400 ms), then the ring in the chevron's place | the spinner's clock (`useWait`) |
| load failed | its column is one row: `sync-error`, Couldn’t load, Try again; the chevron shows `sync-error` | – |
| empty level | its column says Empty in ink3 | – |
| searching | the columns give way to the matches: typed letters in ink, the rest ink2; nothing matched says the query back; past `limit` a quiet line says how many more | at once (rows never lag the fingers) |
| several | a branch's box is on when all of it is chosen, the dash when some is | the checkbox's pen; chips land (object) and leave (release) |
| at `max` | the boxes that would go past it dim and refuse; "3 of 3" under the columns | – |
| disabled item | the menu row's disabled look; the keys skip it; it can't be chosen | – |
| invalid / disabled | the foundation's invalid ring / 40 % | – |

Reduce Motion: levels fade in without travel; the chevron turns at once; chips come and go at once.

## Keyboard

Focus stays in the search well while the plate is open; `aria-activedescendant` names the row the keys are on, and a polite line says a level that opened ("Portugal, 5 items").

| Key | Does |
|---|---|
| Tab | to the well (one stop), then the clear key or chip remove keys |
| ↓, Enter, Space, or a letter on the well | opens the plate (a letter starts a search with it) |
| ↓ ↑, Home / End | move in the column (disabled rows skipped) |
| → | opens the branch (loading it) and goes into it |
| ← | back to the parent's column (drilling: back one level) |
| Enter | a leaf: chooses it and closes. A branch: goes in (`pick="leaf"`), or chooses it and closes (`pick="any"`). Several: ticks a leaf, goes into a branch. Try again: reloads |
| Space | several values, with nothing typed: ticks the row (a branch takes all of it) |
| letters | search across every loaded level; ↓ ↑ and Enter work on the matches |
| Esc | closes; focus returns to the well |

Pointer: a click on a branch opens it (with `pick="any"` it also chooses it, and the plate stays so you can go deeper); a click on a leaf chooses it and closes (several: ticks it, the plate stays). Hovering moves the highlight but never opens a level.

## API

| React | SwiftUI |
|---|---|
| `items: CascaderItem[]` (Tree's item: `{ id, label, icon?, children?, hasChildren?, disabled?, trail? }`) | `items: [MetalTreeItem]` |
| `aria-label` (required) | first argument |
| `value` / `defaultValue` / `onValueChange(id, path)` | `selection: Binding<String?>` |
| `multiple`, `value` / `defaultValue` / `onValueChange(ids)`, `max` | `values: Binding<[String]>`, `max:` |
| `pick` leaf / any (default leaf; several values ignore it) | `pick: .leaf / .any` |
| `layout` columns / drill (default columns) | `layout: .columns / .drill` |
| `loadChildren(item)`: add the children to your items, then resolve; reject to fail | `loadChildren: (MetalTreeItem) async throws -> Void` |
| `size` regular / compact, `placeholder`, `invalid`, `disabled` | `size: MetalFieldSize`, `prompt:`, `invalid:`, `.disabled()` |
| `limit` (search matches drawn, 100) | `limit:` |
| `words` `{ search, empty, failed, retry, loading(item), back, clear, noMatches(q), more(n), count(n, max), opened(item, n) }` | `words: MetalCascaderWords` |

```tsx
<Cascader
  aria-label="Place"
  items={places}
  value={place}
  onValueChange={(id, path) => setPlace(id)}
  loadChildren={async (item) => {
    const children = await fetchLevel(item.id);
    setPlaces((was) => withChildren(was, item.id, children));
  }}
/>

<Cascader aria-label="Ship to" items={places} multiple max={3} value={ids} onValueChange={setIds} />
```

## Rules

- The value is the item's `id`. The well and `onValueChange`'s path need the items loaded down to it; pass them with the value.
- Several values are a **covering set**: a branch chosen whole is its own id, not its leaves (it holds for a level never loaded). Unticking one child of a whole branch replaces it with the rest of its children; ticking the last child of a branch replaces them with the branch.
- Highlighting never opens a level; → and a click do. Arrowing down a column of lazy branches must not start a load for each.
- Search covers what is loaded. A level that loads on opening is found once it has been opened.
- A failure says so in words, in its column; the glyph never carries it alone.
- Later (see the sheet): a server search (`onQueryChange`, `loading`, `failed`), virtual rows, a layout chosen by the room the plate has.
