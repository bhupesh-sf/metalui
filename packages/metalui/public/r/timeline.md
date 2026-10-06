# Timeline

A record of what happened and what is planned, read top to bottom: an order's status, a pipeline's steps, an activity feed, a deploy history, a roadmap. React: `Timeline` from `@unlocalhosted/metalui` (an ordered list). SwiftUI: `MetalTimeline`. Every look is borrowed: the rail is the rule's engraved groove, the nodes are LEDs with their meanings and gestures, a glyph sits in the switch's sunk well, a running event waits with the Spinner's ring. The `timeline` recipe holds the sizes and the rail's layout. An object: it stands for the person's order, run or history and stays; nothing in it is operated.

## Use it for

- What happened to one thing, in order: an order (placed, packed, shipped, out for delivery), a build (checkout, install, test, deploy), an issue's history.
- What is planned after now: a roadmap, an expected delivery. The now marker shows where the past meets the plan.
- A feed of who did what, with the host's glyphs on the rail.

## Don't use it for

- A flow the person moves through (pick a step, Back, Continue): use `Stepper`.
- Records you compare across columns, sort or filter: use `Table` (`live` for rows that arrive).
- Going back in time on the canvas: that is the time scrubber.
- How far a task has come, as a bar: use `Progress`.

## Anatomy

- Root (`Timeline`): `events`, `aria-label` (required), `format` (relative, date, time, datetime), `now`, `timeSide` (end, start).
- An event (`TimelineEvent`): `id` (stable), `title`, `description` (a node: may hold a link), `time` (Date, ISO string or ms), `duration` (ms), `state`, `glyph` (an element).
- Each event: a node in a 12 column (24 when any event has a glyph) on the rail, the title (ui type) and a line under it (meta type), set down so the title's first line centres on the node, and on the title's line the state's word, the duration and the time (meta type, tabular figures, ink2), joined by `·`.
- The rail: the rule's 1 groove down the node column, from under each node to the next; the node's box (18, or 32 with glyphs) keeps it clear of the lamp.
- The now marker: on top of the first event whose planned-ness differs from the one before it (in either order), a tick across the rail, NOW in the readout type and an engraved rule to the end of the row.

## States and motion

| State | Look | Motion |
|---|---|---|
| done (default) | the off lamp; title ink, line ink2 | – |
| live | the green lamp; "Live" with the time | flickers once when an event turns live on screen |
| running | the lamp gives way to the Spinner's ring after the show delay; "Running" | `useWait`: nothing for fast work, a minimum once shown, the tick when it ends |
| waiting | the amber lamp, steady; "Waiting" | – |
| failed | the red lamp; "Failed" | blinks twice when an event turns failed on screen; never on load |
| planned | the off lamp; title, line and time in ink3; said "planned" | – |
| with a glyph | the glyph (ink2) in a 24 sunk well; live, running, waiting and failed put their small lamp on its corner | the same |
| arriving | – | lands one nest from above on the object spring, the rest glide on settle (`useRowMotion`) |
| narrow | under 360 px (a container query) the time moves under the title | – |

Reduce Motion: events appear in place; the lamps hold steady; the ring breathes in place.

## Rules

- Pass events in the order they should be read: oldest first for an order or a build, newest first for a feed. The now marker follows the states, never an index.
- Every state but done and planned carries its word on screen; colour never says it alone. Put what went wrong in `description` ("3 tests failed").
- `waiting` is held on someone else (an approval, a queue, customs); `running` is work in progress. Don't use one for the other.
- Glyphs are elements (`<UploadIcon />`, a small `Avatar`), never names: a name ships the whole catalog.
- Relative times count from `now`; nothing ticks at rest. A host that keeps a clock (a live feed) passes `now` from it.
- Keep ids stable: a new id lands as an arrival; a changed id would land again.

## API

| React | SwiftUI |
|---|---|
| `Timeline` `events`, `aria-label`, `format`, `now`, `timeSide` | `MetalTimeline(_ events:, label:, format:, now:, timeSide:)` |
| `TimelineEvent` `{ id, title, description, time, duration, state, glyph }` | `MetalTimelineEvent(id:, _ title:, description:, time:, duration:, state:, glyph:)` (`glyph` a `MetalIconName`) |
| `TimelineState` `done`, `live`, `running`, `waiting`, `failed`, `planned` | `MetalTimelineState` the same cases |
| `format` `relative`, `date`, `time`, `datetime` | `MetalTimelineFormat` the same cases |
| `timeSide` `end`, `start` | `MetalTimelineTimeSide` `.end`, `.start` |

## Keyboard and accessibility

- An ordered list named by `aria-label`. Nothing is focusable unless the host puts a link or a button in an event.
- Each event reads: its title, its line, its state's word, its duration and the exact time (the relative words are for the eye; the tooltip shows the exact time on hover). Planned events add "planned".
- The lamps, the rail and the now marker are hidden from assistive tech; the words say the same.
- Events that arrive after the first render are said once by a polite status ("Delivered, Live"). A running event says "Build, running" when its ring shows and "Build, done" when it ends.
