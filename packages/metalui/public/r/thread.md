# Thread

A conversation that scrolls, newest at the foot: it stays with a reply while it writes, lets the person scroll up to read, and offers Jump to latest to come back. React: `Thread` from `@unlocalhosted/metalui`. SwiftUI: `MetalThread`. A place: it has area, holds `Message`s, and you look through it. Every look is borrowed: the scrolling is `ScrollArea`, the way back is a compact `Button` with the chevron, arrival is the rows' motion. The `thread` recipe holds the gutters, the gaps and the follow slop.

## Use it for

- A chat with an assistant: the person's turns and the replies, with a composer under it.
- Any log that grows at its foot and is read as it grows (an agent's run, a support chat).

## Don't use it for

- A record of events with states and a now marker: use `Timeline`.
- Rows you compare and sort that arrive at the top: use `Table` `live`.
- Scrolling that has no "newest" end: use `ScrollArea`.

## Anatomy

- Root (`Thread`): `children` (the messages, each with a stable `key`), `aria-label` ("Conversation"), `pinKey`, `jumpLabel` ("Jump to latest"), `className` (give it a height, or a flex parent that does).
- A `ScrollArea` holding a `log`; each child is wrapped in a row (`data-row`) the rows' motion moves.
- Gutters 20 (14 under 28rem) and 12 above and below; 20 between turns, 6 before a `grouped` message.
- Jump to latest: a compact button at the end edge, 8 above the foot, over the thread.

## States and motion

| State | Look | Motion |
|---|---|---|
| open | at the foot | – |
| pinned (within 24 of the foot) | follows its content as it grows (a ResizeObserver; nothing runs at rest) | – |
| away (scrolled up) | stays put; Jump to latest shows | the key rises one nest from below and fades in on settle |
| jump | back at the foot, pinned | a smooth scroll; under Reduce Motion a jump |
| `pinKey` changes | back at the foot, pinned | at once (the new message lands as it arrives) |
| a message arrives | – | rises one nest from below on the object spring, fading in (`useRowMotion`, from below); not on the first render |

Reduce Motion: messages appear in place; Jump to latest jumps and only fades.

## Rules

- Key every message by its id. A new key lands as an arrival; Retry that replaces a reply with a new id lands the new take.
- Pass `pinKey` = the id of the person's newest message, so sending always shows the reply even if they had scrolled up. Don't pin on replies: the person who scrolled up to read stays where they are.
- Give the thread a height (or `min-h-0 flex-1` in a column). It doesn't size itself to its content.
- The host draws a hairline under its own title from the scroll area's `data-overflow-y-start` (the AI composer block does).
- Set `grouped` on a `Message` that follows one from the same speaker; the thread closes the gap.

## API

| React | SwiftUI |
|---|---|
| `Thread` `children`, `aria-label`, `pinKey`, `jumpLabel`, `className` | `MetalThread(label:, pinKey:, jumpLabel:) { … }` |
| each child a `Message` with a `key` | each child a `MetalMessage` with an `.id` |

## Keyboard and accessibility

- The scroll area's viewport takes focus: arrows, Page Up/Down, Home and End scroll it.
- A `log` named by `aria-label`: what arrives at its end is said politely. A reply that is `aria-busy` while it writes is said once it settles.
- Jump to latest is a button in the tab order only while away; at the foot it is `inert` and hidden.
