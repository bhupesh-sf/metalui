# Branch picker

Which of a message's replies is showing, and the way to the others. React: `BranchPicker` from `@unlocalhosted/metalui`. SwiftUI: `MetalBranchPicker`. A component: you operate it to change something else (the reply the message shows). Every look is borrowed: ghost `IconButton`s with `Tooltip`s, the chevron turned back and forward, the drum (`SwapText`) for the count. The `branch-picker` recipe holds the gap and the count's padding.

## Use it for

- A reply written more than once (Retry keeps the earlier takes): "2 / 3" in the reply's footer, before `MessageActions`.
- The person's turn edited and sent again: the same picker under their turn.

## Don't use it for

- Pages of results (use `Pagination`), steps of a task (use `Stepper`), slides (use `Carousel`).

## Anatomy

- Previous key, the count, Next key, 2 apart. The count is "2 / 3" in meta type, tabular figures, ink2, 4 each side.

## States and motion

| State | Look | Motion |
|---|---|---|
| between | both keys on | – |
| first / last | Previous / Next disabled; focus moves to the other key if it was on the one turning off | – |
| moved | the new count | the number turns on the drum |
| one reply (`count` under 2) | nothing drawn | – |

Reduce Motion: the number crossfades in place.

## Rules

- The host keeps the takes and `index`; Retry adds a take and moves to it (`index = count`).
- Show it only once the reply has settled, in the same footer as the actions, so it fades in with them.
- While a take is writing, keep the picker out (the footer is the host's while it writes).

## API

| React | SwiftUI |
|---|---|
| `index` (from 1), `count`, `onIndexChange(index)` | `MetalBranchPicker(index: $index, count:)` |
| `label` ("Reply") | `label:` |

```tsx
<Message from="assistant" status="done" footer={<>
  <BranchPicker index={take + 1} count={takes.length} onIndexChange={(i) => setTake(i - 1)} />
  <MessageActions copy={takes[take]} onRetry={retry} />
</>}>
  <Markdown>{takes[take]}</Markdown>
</Message>
```

## Keyboard and accessibility

- A `group` named "Reply 2 of 3"; the keys are buttons named "Previous reply" and "Next reply" (with tooltips).
- After a move, a polite status says "Reply 3 of 3".
