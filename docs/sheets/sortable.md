# Variation sheet: Sortable

Bhupesh Gupta, in "Components other libraries ship that we don't" § 2: "Sortable: drag to reorder, with a keyboard path. Nothing in the library reorders today." (2026-10-05)

Now: nothing reorders. `useRowMotion` (`motion/rows.ts`) makes rows travel from where they were when their order changes, vertically only. Tree, Kanban, Table columns and the file-upload layouts all wait on a drag that reorders.

How this was made: ReUI's Sortable page, dnd-kit's sortable preset and its accessibility guide, React Aria's `useDraggableCollection` and its drop indicators, Apple's HIG (drag and drop; `onMove` in `List`), Things (dragging a to-do: it lifts and the others part) and Trello (cards tilt and cast a deeper shadow) were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Where it sits (docs/COMPOSITION.md)

- **The drag is an Instrument.** The lifted item, the recess where it will land, and the announcements exist only while a hand (or a key) is moving something; when you let go, nothing of Sortable is left on the page. "Shows up only while you act; gone when you stop."
- **It is hosted by any list.** The items are the host's (a `Row`, a `Card`, an `Attachment`, a `Chip`); Sortable paints none of them at rest. That is why it is not a Component (you don't operate it to change something else) or an Object (it isn't the person's thing).
- **The engine is a hook.** `useSortable` holds the whole behaviour (pointer, touch, keys, auto-scroll, announcements, rollback) over any element whose children are marked `data-row`; `Sortable` is the hook with a `div` list, its recess and its live region. Tree, Kanban, a Table header row and the upload gallery use the hook with their own markup.

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **Reorder a list top to bottom** (ReUI vertical, every library) | `orientation="vertical"`. Others make room by actually moving (live reorder), each gliding from where it was on the settle spring (FLIP, `useRowMotion`), so the list always shows the order you'd get if you let go now. | Must |
| **Reorder a row of things** (ReUI horizontal: tabs, chips, toolbar keys) | `orientation="horizontal"`: the same, left to right; Left and Right keys. Needs `useRowMotion` in 2D (an additive change: rows that move sideways now glide too). | Must |
| **Reorder a grid, sizes mixed** (ReUI grid, an upload gallery, a dashboard) | `orientation="grid"`: the item under the pointer is the target, measured from each item's own slot, so a wide tile and a small one trade places without the list flickering. Arrow keys go to the nearest item in that direction. | Must |
| **Grab by a handle, or the whole item** (ReUI) | `handle` puts the grab on `Sortable.Handle`, a grip of six engraved dimples (*ours*: a knurl, the slider knob's language, not three lines); without it the whole item is the grab. Items that hold controls (a checkbox, a field) take a handle. | Must |
| **Something that can't move** (ReUI disabled) | `disabled` on an item pins it: it can't be lifted, and the others pass around it without taking its place (Inbox stays first). Trying to lift it shakes it once (refusal) and says why. | Must |
| **Save, and undo a failed save** (ReUI `onValueCommit` with the previous order) | `onValueChange(next)` while moving, `onValueCommit(next, previous)` on drop. Return a promise: while it is out the list says `aria-busy` and can't be lifted; a rejection glides everything back to `previous` and announces it. The host says it in a toast (red, "Couldn't save the order"), because the toast is the host's. | Must |
| **Change your mind** (dnd-kit, HIG) | Escape (or the pointer cancelled by the system) returns the item home on the settle spring and the others glide back. | Must |
| **Do it without a pointer** (dnd-kit a11y, React Aria, WCAG 2.5.7 Dragging Movements) | Focus the item (or its grip): Space or Enter lifts it, arrows move it one place, Space or Enter drops, Escape cancels. Each step is announced in a live region: "Lifted Trip notes, position 2 of 5", "Moved to 3 of 5", "Dropped at 3 of 5", "Cancelled. Back at 2 of 5". Instructions ride on `aria-describedby`. Leaving the item with Tab drops it where it is. | Must |
| **Long lists** (everyone) | Auto-scroll: within the recipe's edge band of the scroller (the list's own, or the window), it scrolls toward that edge, faster the closer you are. Only while dragging; nothing runs at rest. | Must |
| **Phones and tablets** (dnd-kit sensors, HIG) | Touch: on a grip the drag starts at once (`touch-action: none`); on a whole item it starts after a still press (the recipe's hold), so a swipe still scrolls the page. A drag that starts plays the alignment haptic where the platform has one; the drop plays the detent. | Must |
| **Reduce Motion** | Following the pointer stays (it is direct manipulation). The lift does not scale, the drop and the return do not travel, the others jump; the plate and its shadow still cross-fade so you see what is held. | Must |
| **Nested levels, each reordering on its own** (ReUI nested) | A `Sortable` inside an item: each one only lifts its own children, so groups reorder and items reorder inside a group. | Should |
| **A different look for the held item** (dnd-kit `DragOverlay`, Trello's tilt) | Covered by the lift: the held item rises off the table on the surface spring onto a raised plate (the surface recipe's raise), scaled one hair, with the deeper floating shadow faded in on a layer (only opacity animates). No tilt: our objects don't wobble. | Covered |
| **Where it will land** (React Aria drop indicator) | *Ours*: the slot it left is a sunk recess (the well's track) the size of the item, gliding on the settle spring to wherever the item will land. A drop line is for moving *into* a level (Tree), not for reordering. | Must |
| **Between lists** (Kanban, ReUI multiple containers) | `useSortableLists`: one drag over several lists under a root, a copy on an overlay layer, the recess live in the nearest list, FLIP across lists (built with Kanban, `docs/sheets/kanban.md`). | Must (done) |
| **Into a level** (Tree "drag to move with a drop line") | A drop line and "into" targets are Tree's; Tree uses `useSortable` for siblings and adds its own line. | Later (with Tree) |
| **Several at once** (Finder, React Aria) | Lifting a selection as a stack. Rare in lists; real on a canvas, where the selection frame already moves things. | Later |
| **Constrained axis, modifiers, collision strategies** (dnd-kit) | Not a person's job; the orientation sets the axis for keys and the pointer moves freely (a held thing follows the hand). | Dropped |
| **Drag preview image** (HTML5 drag and drop) | The native drag ghost is a translucent screenshot that can't take our materials, and it never fires on touch. Pointer events instead. | Dropped |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| lift | the item scales to `lift.scale`; its raised plate and floating shadow fade in on a layer; it follows the hand from where it was grabbed | surface (rising, no stop) |
| make room | the others glide from where they were (FLIP); the recess glides to the new slot | settle |
| drop | the item travels from the hand to its slot and lands with the small overshoot; plate and shadow fade | object (landing on the table) |
| cancel | the item travels home; the others glide back | settle (an arrival, no overshoot) |
| rollback | everything glides back to the previous order | settle |
| refuse (disabled) | the pinned item shakes once | refusal |

## Decide

- **Live reorder or a drop line?** Live reorder. The list always shows the order you'd get, a grid of mixed sizes stays honest (the target is a real slot), and keyboard and pointer share one model. A drop line is for "into", which is Tree's.
- **Which spring lands a drop, which returns a cancel?** Object for a drop (it lands on the table: the small overshoot says "set down"); settle for a cancel (it goes back where it was; nothing new happened, so no overshoot).
- **May a second drag start while a save is out?** No: the list says busy until the save settles. A rollback then always restores exactly the order before that move, never one the person made after it. Saves are short; the lock is invisible unless the network is slow, and then it's honest.
- **Does a disabled item hold its place or float with the rest?** It holds its place. The job is "this can't move" (a pinned row), and a pinned row pushed down by its neighbours has moved.
- **A grip glyph in the icon set, or a drawn knurl?** The knurl in the recipe for now: six dimples are a texture, not a meaning, and the icon set's grammar is for acts. A `grip` glyph is Later if a second component needs one.
- **What does Tab do while an item is lifted by keys?** It drops it where it is (what you see is what you get), and focus moves on.
- **Swift: `List.onMove` or our own gesture?** Our own `DragGesture` over a stack, because `List` imposes its own rows, insets and selection and can't take the recipe. VoiceOver gets "Move up" / "Move down" (and left/right) as accessibility actions, the HIG's keyboard-free path; macOS gets the same keys as the web.

## Tiers

**Must**: vertical, horizontal, grid with mixed sizes; handle or whole item; disabled (pinned); `onValueChange` live and `onValueCommit(next, previous)` with rollback; Escape; the keyboard path with announcements; auto-scroll; touch with a still press; Reduce Motion; the recess; the `useSortable` hook; `useRowMotion` in 2D; SwiftUI `MetalSortable`.

**Should**: nested levels (independent); haptics on touch.

**Later**: into a level with a drop line (Tree); several at once; a `grip` glyph in the set; SwiftUI grid keyboard moves by nearest neighbour (Swift moves by index today).
