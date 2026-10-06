# Variation sheet: Kanban

From "Components other libraries ship that we don't" § 5: "Kanban: columns of cards, dragged between columns with an overlay while dragging; columns reorder by a handle; disabled items; `onValueCommit` with the previous state so a failed save rolls back with a toast. Needs Sortable."

Now: nothing moves between lists. `Sortable` reorders one list (its sheet lists "between lists (Kanban)" as Later), `Card` is the person's thing on a raised plate, `Card.Frame` a sunk tray of peers, `Badge` a count on the drum, `Collapsible` hides and shows in place, `Toast` says what happened.

How this was made: ReUI's Kanban (columns and items with handles, the drag overlay, `onMove`), dnd-kit's multiple-containers example and its accessibility guide, Trello (lists, the tilted card, "Move" in the card's menu, add a card at a list's foot), Jira (WIP limits that colour a column over its limit, swimlanes, collapsing a column), Linear's board (counts in the header, empty columns that still take cards), GitHub Projects (column limits, "Move to" for every item) and Apple's HIG (drag and drop, spring-loading) were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Where it sits (docs/COMPOSITION.md)

- **The board is a Place.** It has area, it holds the person's things (the cards are Objects: a task, an order, a lead), and you go into it to work; it isn't a control you operate to change something else (Component fails), and it stays when you let go (Instrument fails). Its siblings are Region and Drop zone.
- **The cards are the host's.** `Kanban.Card` is the slot a card sits in (a `listitem` with the drag); the look is the host's own `Card` (compact), a `Row` or anything. Kanban never paints a card, so a board of rows or of attachments needs no fork.
- **The drag is Sortable's.** Moving between lists is an additive part of the Sortable instrument (`useSortableLists`), so Tree, a sidebar's sections and the upload layouts can move things between lists too. The columns reorder with plain `useSortable` (horizontal, by a grip).

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **Move a card to another column** (every board: the card's status changes) | Press and move (a still press on touch): the card rises onto the raised plate on a layer above the board (the **overlay**, so a column's own scroll can't clip it) and follows the hand; where it would land, its slot is a sunk recess (the well's track), live in whichever column the hand is over; the others step aside on settle. Release: it travels into the recess and lands on the object spring. | Must |
| **Put a card in order inside its column** (priority) | The same drag: in the column it came from the card under the hand gives up its place (Sortable's rule, so mixed heights never flicker); entering another column it goes before the card under the hand when the hand is in that card's upper half, after it otherwise, and at the end below the last. | Must |
| **Reorder the columns** (ReUI column handle, Trello) | Each column header has Sortable's grip (six engraved dimples); the board is a horizontal `useSortable` by handle. Only when the host passes `onColumnsChange`; without it there is no grip. | Must |
| **A card that can't move** (ReUI disabled item; a card someone else holds) | `disabled` on `Kanban.Card`: it can't be lifted (trying shakes it once and says why), and the others flow around it. Unlike Sortable's pinned row it doesn't hold an index: in a column that gains and loses cards, an index means nothing. | Must |
| **A column that takes nothing** (a closed "Done" lane, an archive) | `disabled` on `Kanban.Column`: its cards don't lift and nothing lands in it; the hand passes over it. | Should |
| **Save, and undo a failed save** (ReUI `onValueCommit` with the previous state) | `onValueChange(next)` live while moving; `onValueCommit(next, previous)` once on a drop that changed anything. Return a promise: the board is `aria-busy` and nothing lifts while it is out; a rejection glides every card back (across columns too) and announces it. The host says it in a toast, red, "Couldn’t move …", because the toast is the host's. | Must |
| **Change your mind** (dnd-kit, HIG) | Escape (or the system cancelling the pointer): the board goes back to how it was at the lift and the card travels home on settle. | Must |
| **Do it without a pointer** (dnd-kit a11y, WCAG 2.1.1) | Focus a card: Space or Enter lifts it (it rises in place), Up and Down move it in its column, Left and Right to the next column that takes cards (same position, or the end), Home and End to the column's ends, Space or Enter drops, Escape puts it back, Tab drops it where it is. Each step is said: "Lifted Proof the poster. To do, position 2 of 4." … "Dropped Proof the poster in Printing at position 1 of 2." | Must |
| **How many are in a column** (Linear, Jira) | A compact `Badge` count in the header, turning on the drum as cards arrive and leave. | Must |
| **Too much in progress** (Jira and GitHub WIP limits) | `limit` on a column: the header reads "max 3" in ink3; over it, the count is joined by a compact Badge with the amber LED and the words "Over by 1" (the LED's meaning: urgent; never colour alone). Soft: the card still lands, because the board records what is true. | Must |
| **An empty column** (Linear) | The column keeps its height as a drop target, and a quiet line in ink3 ("No cards", the host's words) sits in the tray until a card or the recess arrives. | Must |
| **Put a column out of the way** (Jira collapse) | `collapsible` on a column: `Collapsible.Key` in its header hides its cards in place (the Collapsible's own motion); the header still says the count. A collapsed column takes no cards: you couldn't see where it lands. | Must |
| **A long board** (everyone) | Auto-scroll: near the board's left or right edge it scrolls sideways, near a column's top or bottom that column scrolls, faster the closer you are; the window too. Only while dragging. | Must |
| **Phones and tablets** (dnd-kit sensors, HIG) | Touch: a still press lifts (Sortable's hold), so a swipe still scrolls the board; the grip lifts a column at once. The alignment haptic on lift, the detent on drop. | Must |
| **Reduce Motion** | Following the hand stays (direct manipulation). No scale, no travel: the drop, the return and the others are at once; the plate still fades so you see what is held. | Must |
| **Add a card** (Trello's "Add a card") | Covered: the host puts `Card.EmptySlot` ("New order") after `Kanban.Cards` in the column; Kanban stays out of what a new card is. | Covered |
| **Move without dragging, by pointer** (Trello's "Move", GitHub's "Move to"; WCAG 2.5.7) | `moveCard(value, key, column, index?)` is exported; the host puts "Move to …" in the card's menu. The docs board shows it. | Should |
| **The held card's own look** (dnd-kit `DragOverlay`, Trello's tilt) | Covered by the overlay: Sortable's lift (raised plate, floating shadow, one hair larger). No tilt: our objects don't wobble. | Covered |
| **Open a collapsed column by hovering** (HIG spring-loading) | *Ours*, from Finder: hold a card over a collapsed column and it opens after the spring-load delay. | Later |
| **Swimlanes** (Jira rows by person or epic) | A board per lane, or a lanes axis. Real, but a second axis doubles the keyboard model. | Later |
| **Several cards at once** (Jira) | Lifting a selection as a stack; Sortable's Later too. | Later |
| **Very long columns** (thousands of cards) | Virtual rows. | Later |
| **Add, rename and delete columns** (Trello) | The host's: QuickEdit for the name, a menu for the rest. | Dropped |
| **Filter the board** (Jira quick filters) | Filter bar's job (a Place of its own); the board shows what it is given. | Dropped |
| **Card details, cover images, labels** (Trello) | The host's Card (media, title, footer badges). | Covered |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| lift | a copy of the card rises on the overlay layer to `lift.scale` with the raised plate and floating shadow fading in; its slot becomes the recess | surface |
| make room | cards that move glide from where they were, across columns as well as down (FLIP over the whole board); the recess with them | settle |
| drop | the copy travels from the hand into the recess and lands; the plate fades; the card shows | object |
| cancel | the board goes back and the copy travels home | settle |
| rollback | every card glides back to where it was before the move | settle |
| refuse (disabled) | the card shakes once | refusal |
| column lift | the column rises on its grip and follows the hand; the others step aside | Sortable's |
| collapse | the cards slide under the header | Collapsible's |
| count | the badge's digits turn | the drum |

## Decide

- **Layer?** A Place: it has area and holds the person's things; the cards are the host's Objects and the drag is Sortable's Instrument.
- **An overlay, or the card itself following the hand?** An overlay. Columns scroll on their own, so a card moved by `translate` is clipped by its column the moment it leaves, and a card that changes column is a new node in React (the old one is gone mid-drag). A copy on a layer above the board survives both; the card itself stays as the recess, so the board always shows where it lands. Keys move the card itself (it doesn't leave the board's flow, and focus stays on it).
- **Where does Sortable grow?** `useSortableLists` beside `useSortable` in the same module: one value of lists (`Record<list, keys>`), any number of lists marked with `listProps(id)` under one root. `useSortable` keeps its API; its press handling (threshold, still press, cancel, the drag's click) is shared by both.
- **Soft or hard WIP limits?** Soft: the card lands and the column says it's over. A hard limit refuses a move the person's work already made true; a host that wants one returns a rejection from `onValueCommit`, and the board rolls back.
- **Does a collapsed column take cards?** No: the recess would be inside what's hidden. Spring-loading it open is Later.
- **Where does a card go on Left and Right?** The same position in the next column that takes cards, or its end: the eye stays on the same row.
- **One commit for cards and one for columns?** Yes: `onValueCommit(next, previous)` for cards and `onColumnsCommit(next, previous)` for the columns; they're different saves on every backend we read (status vs. board layout).
- **Is the count's limit in the Badge?** No: the Badge counts (the drum), the limit is words beside it ("max 3", "Over by 1"), so the number never has two meanings.
- **Swift: one binding or two?** One: `[MetalKanbanColumn<Card>]` (id, title, limit, cards), so column order and cards move in one value and one `onCommit(next, previous)`. VoiceOver gets "Move to <column>" for each other column, plus Move up and Move down; macOS takes the same keys as the web.

## Tiers

**Must**: cards between columns with the overlay and a live recess; order inside a column; columns by a grip; disabled cards; `onValueChange`, `onValueCommit(next, previous)` with rollback; Escape; the keyboard path across columns, announced; counts; WIP limits (amber LED + words); empty columns; collapsing a column; auto-scroll both ways; touch; Reduce Motion; `useSortableLists`; SwiftUI `MetalKanban`.

**Should**: disabled columns; `moveCard` and a "Move to" menu on the docs board; haptics on touch.

**Later**: spring-loading a collapsed column; swimlanes; several at once; virtual rows; lists that run sideways in `useSortableLists`; SwiftUI column drag on iOS (macOS only builds today).
