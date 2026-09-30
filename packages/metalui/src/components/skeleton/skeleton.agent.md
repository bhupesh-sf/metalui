# Skeleton

Where content will be, before it arrives. React: `Skeleton` from `@unlocalhosted/metalui`. SwiftUI: `MetalSkeleton` (work in progress). A part: its shapes are the `well` recipe's field look; the `skeleton` recipe adds the sizes, the sheen and the timing.

## Use it for

- A list, a card or a panel whose shape you know while its data loads (over about 300 ms).

## Don't use it for

- Work in a control (use a spinner), a task with an end you can show (use progress), or content whose shape you cannot guess.

## Anatomy

- `Skeleton`: a block (`width`, `height`), radius 8.
- `Skeleton.Text`: `lines` pill lines 12 tall, 8 apart; the last is 62 % wide.
- `Skeleton.Circle`: `size`, for an avatar or a glyph.
- `Skeleton.Swap`: shows the shapes while `loading`, then the content in the same place.

## States and motion

| State | Look | Motion |
|---|---|---|
| mounted | nothing | waits 300 ms, so a fast load never flashes it |
| waiting | the shapes in the sunk well | fade in on the settle spring; a soft light passes across (1.6 s, linear) |
| arrived | the content | the content fades in on the settle spring, in the same place |

Reduce Motion: no sheen; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `Skeleton` `width`, `height` | `MetalSkeleton(width:height:)` |
| `Skeleton.Text` `lines`, `width` | `.redacted(reason: .placeholder)` |
| `Skeleton.Circle` `size` | – |
| `Skeleton.Swap` `loading`, `fallback`, `label` | – |

## Keyboard and accessibility

- The shapes are hidden from assistive tech; `Skeleton.Swap` marks the region busy (a `status` named by `label`, "Loading" by default) until the content arrives.

## Rules

- Draw the shape of what is coming, not a generic grey box: the content should land where the shapes stood.
- One sheen for the whole screen's shapes; never pulse them.
