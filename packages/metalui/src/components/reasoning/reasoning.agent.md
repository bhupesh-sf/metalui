# Reasoning

The assistant's thinking inside its reply: open while it streams, folded to "Thought for 4 s" when the answer starts. React: `Reasoning` from `@unlocalhosted/metalui`. SwiftUI: `MetalReasoning`. An object: it stands for something the assistant produced and stays in the turn. Every look is borrowed: the fold is `Collapsible` (its row, reveal and travel), the lamp is the LED with its meanings, the words turn on the drum (`SwapText`), the margin is the engraved rule. The `reasoning` recipe holds the row's gap and the thought's indent.

## Use it for

- A reasoning model's thinking, in a `Message` body above the answer.
- An agent's steps (chain of thought): a `Timeline` as the children, with `label` for the row ("Worked for 12 s · 4 steps").

## Don't use it for

- The answer itself: that is the message body.
- One tool the agent ran: use `ToolCall`.
- A section the person opens in a form or a panel: use `Collapsible`.

## Anatomy

- The row (Collapsible's 32 row, its hover hung past the column): the lamp (small), 8, the words in ui type, ink2; the chevron at the end.
- The panel: an engraved rule at the start, 12, the thought in body type, ink2, wrapping (pre-wrap), 6 above and below.

## States and motion

| State | Look | Motion |
|---|---|---|
| `streaming` | the amber lamp, "Thinking", open | the lamp breathes; the thought arrives in the open fold |
| streaming turns off | the off lamp, "Thought for 4 s" ("Thought for a moment" under a second, "Thought for 1:12" past a minute) | the fold shuts on the release spring; the words turn on the drum |
| the person presses the row | open or shut as they chose | Collapsible's reveal; `streaming` no longer opens or shuts it |
| `duration` given | its seconds, not the measured ones | – |
| `label` given | its words once done | – |

Reduce Motion: the fold crossfades; the lamp holds steady; the drum changes in place.

## Rules

- Pass `streaming` while the model thinks and turn it off when the answer's first words arrive; the seconds are measured between the two (nothing ticks while it thinks).
- Restored history passes `duration` (ms): there was no streaming to measure.
- Put consecutive reasoning parts in one `Reasoning`: one fold per reply.
- Steps go in as a `Timeline` with `state` planned, running, done or failed and a `description` for detail; the timeline keeps its own lamps and words.
- Don't control `open` to follow streaming: it already does, and gives way to the person.

## API

| React | SwiftUI |
|---|---|
| `Reasoning` `streaming`, `duration` (ms), `label`, `open`, `defaultOpen`, `onOpenChange`, `children` | `MetalReasoning(streaming:, duration: (s), label:) { thought }` |

## Keyboard and accessibility

- The row is Collapsible's button: Enter or Space opens and shuts it; `aria-expanded`; named by its words ("Thinking", "Thought for 4 s").
- `aria-busy` on the root while it streams, so the thought is read once it settles.
- The lamp and the rule are decorative; the words say the state.
