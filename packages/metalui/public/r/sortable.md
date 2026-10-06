# Sortable

The drag that puts things in order, hosted by any list. React: `Sortable` (and the `useSortable` hook) from `@unlocalhosted/metalui`. SwiftUI: `MetalSortable`. It is an **instrument**: the items are the host's (rows, cards, tiles, attachments, chips), and Sortable draws only what shows while something is held: the lifted plate, the recess where it will land, and what the live region says. The `sortable` recipe holds the lift, the recess, the grip and the drag's numbers.

## Use it for

- A list, a row or a grid the person puts in their own order: today's plan, a packing list, a board of images, tabs, stops on a trip, columns of a table.
- Groups whose rows reorder inside them (a Sortable in an item).

## Don't use it for

- Moving a thing **into** another (a file into a folder, a row under a parent): that is a drop target with a drop line (Tree's, Later).
- Moving between lists (Kanban columns): Later, with Kanban.
- Sorting by a column (that's Table's sort), or objects on a canvas (they move freely with the selection frame).

## Anatomy

- The list: `Sortable.Root`, a `div role="list"` laid out by `orientation` (vertical: a column, 6 apart; horizontal: a wrapping row; grid: columns of at least 132). Override the layout with `className`.
- Each item: `Sortable.Item`, a `listitem` around the host's own look. Put the look on the item's child; the item's radius (`rounded-*` on it) is the radius of the lifted plate and the recess.
- The grip (with `handle`): `Sortable.Handle`, 20 by 28, six engraved dimples (ink3 with the colorway's lip) that darken on hover; a button named "Move <label>".
- While held: the lifted plate (the surface recipe's raise: its fill and the floating shadow) faded in behind the item, and the recess (the well's track) in the slot it will land in.

## States and motion

| Moment | What happens | Spring |
|---|---|---|
| rest | nothing of Sortable shows; a whole-item list has the grab cursor | – |
| lift (pointer moves 4, a still 250 ms press on touch, a grip at once; or Space/Enter) | the item grows to 1.025 and its plate and deeper shadow fade in; it follows the hand from where it was grabbed; the recess appears in its slot | surface |
| move | the order changes live (`onValueChange`); the others glide from where they were; the recess glides to the new slot; near the scroller's edge (48) it scrolls, up to 18 a frame | settle |
| drop (release; or Space/Enter, or Tab) | it travels from the hand into its slot and lands with the small overshoot; plate and shadow fade | object |
| cancel (Escape, or the system cancels the pointer) | it goes home and the others glide back | settle |
| saving (`onValueCommit` returned a promise) | `aria-busy`; nothing lifts (the grab cursor says progress) | – |
| failed (the promise rejected) | everything glides back to the previous order; announced; the host's toast says so | settle |
| pinned (`disabled` on an item) | it can't be lifted and nothing takes its place; trying shakes it once and says so | refusal |

Reduce Motion: no scale and no travel (drop, return and the others are at once); following the hand stays, and the plate still fades so you see what is held. Haptics where the platform has them: alignment on lift, detent on drop, refusal on a pinned item.

## API

| React `Sortable.Root` / `useSortable` | SwiftUI `MetalSortable` |
|---|---|
| `value: string[]` (keys in order) | `items: Binding<[Item]>` (`Identifiable`) |
| `onValueChange(next)`: live while moving, and on cancel or rollback | the binding |
| `onValueCommit(next, previous)`: once per drop that changed the order; return a promise; reject to roll back | `onCommit: ([Item], [Item]) async throws -> Void` |
| `orientation`: `vertical` (default), `horizontal`, `grid` | `orientation:` `.vertical`, `.horizontal`, `.grid(columns:)` |
| `handle`: lift by `Sortable.Handle` only | `handle: true`, and place the `grip` the content closure gets |
| `disabled`: nothing lifts | `disabled:` |
| `words`: what the live region says (`lifted`, `moved`, `dropped`, `cancelled`, `failed`, `pinned`, `handle`, `instructions`) | – (VoiceOver actions) |
| `Sortable.Item` `value`, `label` (its name in announcements; its text otherwise), `disabled` (pinned) | `pinned:` (a key path or closure) |

```tsx
const toast = useToast(); // under a ToastProvider
const [order, setOrder] = React.useState(tasks.map((t) => t.id));
<Sortable.Root
  aria-label="Today"
  value={order}
  onValueChange={setOrder}
  onValueCommit={async (next) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t save the order', tone: 'error' }); throw e; } // throwing rolls back
  }}
>
  {order.map((id) => (
    <Sortable.Item key={id} value={id} label={byId[id].title} disabled={byId[id].pinned} className="rounded-row">
      <TaskRow task={byId[id]} />
    </Sortable.Item>
  ))}
</Sortable.Root>
```

```swift
MetalSortable($tasks, onCommit: { next, previous in try await store.save(next) }) { task, grip in
    TaskRow(task)
}
```

## Reuse it: `useSortable`

The hook is the whole behaviour over any element whose direct children carry `itemProps(key, { label, disabled })` (they become `data-row` rows, so `useRowMotion` glides them). Spread `listProps` and `ref={listRef}` on the list; render `<div ref={slotRef} className="sortable-slot" />` inside it for the recess (skip it where a `div` can't go, like a `tbody`); render `<div ref={announcerRef} className="sr-only" aria-live="assertive" />` and `<span id={instructionsId} hidden>{instructions}</span>` anywhere. Give each item `sortable-item` (or your own lifted look keyed on `data-lifted`). A grip spreads `handleProps(label)` and needs `handle: true`. `moveTo(order, key, target, pinned)` is the same move, for hosts that move by other means.

- **Tree**: siblings of one level are a `useSortable` list (keys and announcements come free); moving into another level is Tree's own drop line on top.
- **Kanban**: each column's cards are a `useSortable` list and the columns are a horizontal `Sortable` by a handle; between columns is Later.
- **Table columns**: the header row's cells as items, `orientation: 'horizontal'`, `handle: true` with a grip in each header, `onValueChange` writes `TableColumnsState`'s order; no recess (a `tr` holds only cells).
- **Uploads**: a grid of attachment tiles, `orientation: 'grid'`; commit the order with the upload's own save.

## Keyboard and accessibility

- The item (or its grip, with `handle`) is focusable and described by the instructions: "Press Space to lift. Arrow keys move it, Space drops it, Escape puts it back."
- Space or Enter lifts; arrows move one place (vertical: up/down, horizontal: left/right; both pairs work in a list; grid: left/right one place, up/down the nearest tile); Home and End go to the ends; Space or Enter drops; Escape cancels (and doesn't close the dialog it is in); Tab drops it where it is.
- The live region says each step: "Lifted Book the framer. Position 3 of 5." … "Dropped Book the framer at position 2 of 5." A pinned item says "Standup can’t be moved."
- The list says `aria-busy` while a save is out. Controls inside a whole-item list (a link, a button, a field) still work; lifting starts only on the item's own surface. Items with controls take a grip.
- SwiftUI: VoiceOver gets "Move up" / "Move down" (left/right for a row) as accessibility actions; on macOS the focused item takes the same keys as the web.

## Rules

- **Show the order you'd get.** The others move while you hold; the recess marks the slot. No drop line for reordering.
- **Lift on surface, land on object, return on settle.** Never tune one alone; the recipe's `$use` is the reference.
- **A failed save goes back.** Reject from `onValueCommit`; the host says it in a toast (red, "Couldn’t save the order"), and the order glides back.
- **Pinned means pinned.** A disabled item keeps its index; the others pass around it.
- **Only transform and opacity move.** The held item follows by `translate`; the plate and shadow fade on a layer; the recess glides by `translate`.
