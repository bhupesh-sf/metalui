# Kanban

A board of the person's cards in columns, moved between columns by hand or by keys. React: `Kanban` from `@unlocalhosted/metalui`. SwiftUI: `MetalKanban`. It is a **place**: it has area and holds the person's things. The cards are the host's objects (a compact `Card`, a `Row`); the drag is Sortable's instrument (`useSortableLists` for the cards, `useSortable` by handle for the columns). The `kanban` recipe holds the board's numbers; the lift, recess, grip and overlay are Sortable's.

## Use it for

- Work that moves through stages: orders, tasks, hiring, a content calendar, a sales pipeline.
- Anything the person sorts into a few named piles and orders inside each.

## Don't use it for

- One list in an order: `Sortable`.
- Moving a thing **into** another (a file into a folder): a drop target (Tree's, Later).
- Records you compare across fields: `Table` (sort, filter, columns).
- Rows by person or epic (swimlanes): Later.

## Anatomy

- The board: `Kanban.Root`, a `list` of columns side by side, `self.gap` (12) apart inside `self.pad` (8), scrolling sideways. Give it a height (`className="h-[480px]"`) and the columns scroll on their own; without one they grow with their cards.
- A column: `Kanban.Column`, a sunk tray (the well's field), 272 wide, its radius the card's plus 6 so the cards sit concentric. Its header: Sortable's grip (when the columns reorder), the name (label type, ink2), the count in a compact Badge on the drum, the limit in words ("max 3"), over it a compact Badge with the amber LED and "Over by 1", and the Collapsible's key when `collapsible`.
- The cards: `Kanban.Cards`, a `list` named by the column, 6 apart inside 6, scrolling on its own. Empty, it keeps 72 of height and says "No cards" (`empty`) in ink3.
- A card: `Kanban.Card`, a `listitem` with the drag around the host's look. Put a compact `Card` inside; the item takes the card's radius for the plate and the recess.
- After `Kanban.Cards`, anything of the host's: `Card.EmptySlot` ("New order") to add one.

## States and motion

| Moment | What happens | Spring |
|---|---|---|
| rest | the trays and their cards; a card shows the grab cursor | – |
| lift (move 4, a still 250 ms press on touch; or Space/Enter) | by hand: a copy rises on the overlay (1.025, the raised plate, the floating shadow) and follows the hand; the card's slot becomes the recess (the well's track). By keys: the card itself rises in place | surface |
| move | the column nearest the hand takes the recess: in its own column the card under the hand gives up its place; entering another, before the card under the hand (its upper half) or after it, at the end below the last; every card that moves glides from where it was, across columns too; near the board's or a column's edge (48) it scrolls, up to 18 a frame | settle |
| drop (release; or Space/Enter, or Tab) | the copy travels into the recess and lands; the card shows | object |
| cancel (Escape, or the system cancels the pointer) | the board goes back to how it was at the lift; the copy travels home | settle |
| saving (`onValueCommit` returned a promise) | `aria-busy`; nothing lifts | – |
| failed (the promise rejected) | every card glides back to where it was; announced; the host's toast says so | settle |
| disabled card | it can't be lifted: it shakes once and says so; the others flow around it | refusal |
| disabled column | nothing lifts from it and nothing lands in it | – |
| over the limit | the amber LED and "Over by 1" beside the count; the card still lands (soft) | the LED's flicker |
| collapsed | the header alone; its cards slide under it; it takes no cards | the Collapsible's |
| column lift (its grip; or Space on the grip) | the column rises and follows the hand; the others step aside; left and right by keys | Sortable's |

Reduce Motion: no scale and no travel (the drop, the return and the others are at once); the hand is still followed and the plate still fades. Haptics where the platform has them: alignment on lift, detent on drop, refusal on a disabled card.

## API

| React `Kanban.Root` | SwiftUI `MetalKanban` |
|---|---|
| `value: Record<column, string[]>` | `columns: Binding<[MetalKanbanColumn<Card>]>` (id, title, limit, disabled, cards) |
| `onValueChange(next)`: live while moving, and on cancel or rollback | the binding |
| `onValueCommit(next, previous)`: once per drop that changed anything; return a promise; reject to roll back | `onCommit: ([Column], [Column]) async throws -> Void` (cards and column order in one value) |
| `columns`, `onColumnsChange(next)`, `onColumnsCommit(next, previous)`: the columns' order; grips appear with `onColumnsChange` | `reorderColumns: true` |
| `disabled`: nothing lifts | `disabled:` |
| `words`: what is said (Sortable's lists words, `count`, `limit`, `over`, `columns`) | – (VoiceOver actions) |
| `Kanban.Column` `value`, `label`, `limit`, `disabled`, `collapsible`, `collapsed`/`defaultCollapsed`/`onCollapsedChange` | `MetalKanbanColumn` `limit`, `disabled`; `collapsible: true` |
| `Kanban.Cards` `empty` | `empty:` |
| `Kanban.Card` `value`, `label` (its name when spoken; its text otherwise), `disabled` | `pinned:` (a closure) |

`moveBetween(value, key, column, index?)` (from Sortable) is the same move for hosts that move by other means: a "Move to" menu on the card, a status picker.

```tsx
const toast = useToast(); // under a ToastProvider
const [cards, setCards] = React.useState<KanbanValue>({ todo: ['a', 'b'], doing: ['c'], done: [] });
<Kanban.Root
  aria-label="Orders"
  value={cards}
  onValueChange={setCards}
  onValueCommit={async (next) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // throwing rolls back
  }}
>
  {columns.map((c) => (
    <Kanban.Column key={c.id} value={c.id} label={c.name} limit={c.limit} collapsible>
      <Kanban.Cards empty="No orders">
        {cards[c.id].map((id) => (
          <Kanban.Card key={id} value={id} label={byId[id].title} disabled={byId[id].locked}>
            <Card size="compact"><Card.Title>{byId[id].title}</Card.Title></Card>
          </Kanban.Card>
        ))}
      </Kanban.Cards>
    </Kanban.Column>
  ))}
</Kanban.Root>
```

```swift
MetalKanban($columns, onCommit: { next, previous in try await store.save(next) }) { order in
    MetalCard(size: .compact) { Text(order.title) }
}
```

## Keyboard and accessibility

- The board is a `list` of columns (named by `aria-label`); each column a `listitem` named by its label holding a `list` of cards named the same. Each card is focusable and described by the instructions: "Press Space to lift. Up and down move it, left and right to the next list, Space drops it, Escape puts it back."
- Space or Enter lifts; Up and Down move it one place; Left and Right to the next column that takes cards (same position, or its end; collapsed and disabled columns are passed over); Home and End to the column's ends; Space or Enter drops; Escape cancels; Tab drops it where it is.
- The live region says each step with the column's name: "Lifted Gig poster, A2. New, position 1 of 3." … "Dropped Gig poster, A2 in Proofing at position 3 of 3."
- The count is said as "3 cards, max 3"; over the limit the Badge's words say it.
- Links inside a card still lift it (press and move) and still open it (click); buttons and fields inside keep their presses. Give each card a "Move to" menu for a move without dragging (WCAG 2.5.7).
- SwiftUI: VoiceOver gets "Move up", "Move down" and "Move to <column>" as actions; on macOS the focused card takes the same keys as the web.

## Rules

- **Show where it lands.** The recess opens in the column under the hand; the others make room. No drop line.
- **The held card rides above.** By hand it is a copy on the overlay (no column clips it); the card itself is the recess until it lands.
- **Limits are words.** Amber LED with "Over by N", never colour alone; soft (a hard limit is a rejected `onValueCommit`).
- **A failed save goes back.** Reject from `onValueCommit`; the host says it in a toast; every card glides back.
- **Only transform and opacity move.** The copy follows by `translate`; cards glide by `transform`; plates fade.
