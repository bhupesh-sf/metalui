# Cascader

A value chosen through nested levels: a product's category, a place (region › country › city), a folder to save into. From "Components other libraries ship that we don't" § 2 in `docs/BACKLOG.md`. Made the way the variation sheets there are: Ant Design's and Element's Cascader, ReUI's, React Aria's (none; its Tree and ComboBox), Finder's column view, macOS's Save panel "Where" popup, iOS Settings' drill-down and Shopify's category picker were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## Where it sits

A **Component** (`docs/COMPOSITION.md`): you operate it to change a value, and it is the same in any app. Not an Object: the levels stand for things, but the cascader is how you reach one. Not a Place: it has no area that holds things; its plate exists while you choose.

It is composed. The well is the field's (`Field` sizes, rings and mini keys), the plate and its rows are the menu's (`menuParts`, `ListGlide`), each row is `Row`'s slots, a branch's chevron and its wait are `Tree.Disclosure` on `useWait`, the search well is `Field`, matched letters and the search's empties are Combobox's, chips are Combobox's chips moving with `useRowMotion`, the boxes are `Checkbox` at row size. Its own look is small: the column (a width and a hairline between columns), the path in the well, and a level arriving from the side.

## Jobs

| Job (where it comes from) | Our form | Tier |
|---|---|---|
| Choose something deep in a hierarchy (everyone) | a field well that opens the menu's frosted plate of **columns**, one per level you've opened (Miller columns, Finder's column view, Ant's default) | Must |
| See where you are while choosing (Finder) | the row each column opened holds the option's raised plate (`Row` `selected`), so the trail through the columns reads left to right; the one highlight glides in the column the keys are in; the chosen value carries the check | Must |
| A level arriving (*ours*) | a new column arrives one grid step from the right on the settle spring, fading in, the way a breadcrumb goes deeper; the plate grows to the right (it is aligned to the well's start). Columns open when the plate opens stand still | Must |
| See the value without opening it (Ant `displayRender`, macOS "Where") | the path in the well in Breadcrumbs' look: the levels above in ink2, engraved chevrons in ink3, the last in ink; *ours*: a long path keeps the last two levels and folds the start into "…", since the end is what tells two values apart | Must |
| Find by name, at any depth (Ant `showSearch`, Shopify) | a search well at the plate's top, focused when it opens; typing turns the columns into one list of matches across every loaded level, each row its name (matched letters in ink, the rest in ink2, Combobox's) and its path above it in a second line; nothing matched says the query back; past `limit` a quiet line says how many more | Must |
| Walk it with the keyboard (Finder, Ant) | focus stays in the search well (`aria-activedescendant`): ↑ ↓ move in a column, Home / End to its ends, → opens a branch and goes into it, ← goes back to the parent's column, Enter chooses (or goes in, see Leaves only), Esc closes and focus returns to the well | Must |
| Leaves only, or any branch (Ant `changeOnSelect`) | `pick="leaf"` (the default): a branch only opens; `pick="any"`: a click on a branch opens it *and* chooses it (your path is the value, as in Finder's column view), Enter chooses and closes, → only opens | Must |
| Levels that load when opened (Ant `loadData`) | Tree's contract: an item with `hasChildren` and no `children` calls `loadChildren`; the row's chevron waits (`Tree.Disclosure`: nothing for a fast load, the ring after the show delay) and the column arrives with the children; a failure opens a column holding one row, sync-error · Couldn't load · Try again (Enter or a click retries) | Must |
| An empty branch | its column says Empty in ink3 | Must |
| Disabled items | dimmed, skipped by the keys (a listbox, unlike Tree, where reading every row matters) | Must |
| What a row shows | `icon` (an element) before the name, `trail` (a count) at its end, the chevron for a branch: Tree's item shape, so the same data feeds both | Must |
| Sizes | regular 32 and compact 28, Combobox's (the field ladder's form sizes); large (44) | Must (regular, compact); large dropped: the field's large is the palette's search, not a form control |
| A narrow place: one level at a time with Back (iOS, Element on mobile) | `layout="drill"`: one column as wide as the well; a header with a back key and the level's name engraved; going in, the level arrives from the right; going back, from the left. Same keys | Should |
| Several values, cascading (Ant `multiple`, Element `checkStrictly`) | `multiple`: a `Checkbox` (row size) leads each row; a branch's box is on when all of it is and shows the dash when some is; ticking a branch takes all of it. Chosen values are Combobox's chips in the well, with remove keys; the plate stays open; Space ticks, Enter opens a branch | Should |
| A limit (`max`) | `max`: once reached, the boxes that would go past it are dimmed and a quiet line under the columns says "3 of 3" | Should |
| A tree that expands in place (ReUI) | **covered by Tree**: `Tree` with `selectionMode="single"` in a `Popover` (or on the page) is exactly this; a third layout here would rebuild Tree. The agent guide says when to take which | dropped as a mode |
| Long lists (Ant virtual) | each column scrolls at the menu's seven rows; search draws `limit` (100) matches with "N more". No virtualiser (Combobox decided the same: Base UI's needs a dependency) | Later |
| Search the server (Ant `showSearch.filter` async) | `onQueryChange` with `loading` and `failed`, Combobox's | Later |
| Open on hover (Ant `expandTrigger="hover"`) | dropped: columns appear and vanish under a pointer passing through, and a load fires for every row crossed. A click or → opens |
| Show only the last level (Ant `displayRender`) | dropped as an option: the path is what tells "Paris, France" from "Paris, Texas"; a long one folds its start |
| Show the parent or the children when all are ticked (Ant `showCheckedStrategy`) | dropped as an option: the value is the **covering set** (a branch ticked whole is one id), so an unloaded branch can be chosen whole and the chips stay few |

## Must

- [ ] `Cascader` with `items` (Tree's `{ id, label, icon?, children?, hasChildren?, disabled?, trail? }`), `value` / `defaultValue` / `onValueChange(id, path)`, `pick`, `loadChildren`, `size`, `placeholder`, `aria-label`, `invalid`, `disabled`, `limit`, `words`.
- [ ] Columns, the trail's raised plates, the gliding highlight, the check, columns arriving from the right; Reduce Motion: they appear at once.
- [ ] The path in the well, folded at the start when long; a clear key once there is a value.
- [ ] Search across loaded levels with the path in a second line, matched letters, nothing matched.
- [ ] The keys above with `aria-activedescendant`; each column a `listbox` named for its parent; a polite line says a column that opened ("Portugal, 5 items").
- [ ] Lazy levels with the wait in the chevron's slot; a failed level's Try again column; Empty.
- [ ] SwiftUI `MetalCascader` with the same items, columns, search, keys (macOS), loading and path.

## Should

- [ ] `layout="drill"` with Back.
- [ ] `multiple` with cascading boxes, the covering set, chips, and `max`.

## Later

- [ ] Server search (`onQueryChange`, `loading`, `failed`).
- [ ] Virtual rows in a column.
- [ ] `layout` chosen by the room the plate has.

## Decide

- Columns or drill by default? **Columns.** They show the whole path at once, which is the point of choosing from a hierarchy; drill is for a well too narrow to hold two columns, and the host knows when that is (a phone sheet), so it's a prop, not a guess made after the plate has opened.
- Rebuild a tree mode? **No.** "A tree that expands in place" is `Tree` with single selection; the guide points to it. A cascader's columns and a tree are two answers to the same job, and Tree already ships the keys, the motion and the waiting.
- Does the highlight open a branch (Finder) or only → and a click (Ant)? **Only → and a click.** Arrowing down a column of lazy branches would start a load for every row it crosses, and the columns to the right would flicker in and out under the keys.
- Use `Breadcrumbs` for the path? **Its look, not the component.** Breadcrumbs is navigation (`nav`, links, `aria-current="page"`); the well holds a value and is one button. The path borrows its inks and its chevron, and folds the start (not the middle) since the end is what differs.
- Where does focus live? **In the search well**, always: one place for letters and arrows, `aria-activedescendant` names the row, and Esc returns to the well (Base UI Popover's focus return). The search is always there: past a dozen leaves, typing the name is the quickest path, and it gives the keys a home.
- What is the value with several? **The covering set**: a branch ticked whole is its own id, not its leaves. It holds for a branch whose children were never loaded ("all of Portugal"), keeps the chips few, and unticking one child of a whole branch splits it into its other children.
- Search scope? **What is loaded.** Levels that load on opening can't be searched without the server; that is the Later item.
