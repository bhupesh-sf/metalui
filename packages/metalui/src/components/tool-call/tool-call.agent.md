# Tool call

One thing an agent did: the tool, what it was given and what came back, folded by default. React: `ToolCall` (and `ToolCall.Group`) from `@unlocalhosted/metalui`. SwiftUI: `MetalToolCall`, `MetalToolCallGroup`. An object: it stands for the call and stays as its record. Every look is borrowed: the fold is `Collapsible`, the lamp is the LED with its meanings, the running ring is the `Spinner` on the wait timing (`useWait`), the input is compact `Properties`, the result sits in the field's sunk well, the words turn on the drum (`SwapText`). The `tool-call` recipe holds only sizes.

## Use it for

- Each tool call in an assistant's `Message`, between its words.
- Several calls in a row: wrap them in `ToolCall.Group`.

## Don't use it for

- A step of the agent's story with nothing inside to inspect: use a `Timeline` event (in `Reasoning`).
- Asking the person before a call runs: put a `Confirmation` beside it and keep the call `queued`.

## Anatomy

- The row (Collapsible's 32 row): a 16 slot with the small lamp (or the small ring), 8, the tool's `name` in code type, ink, then the state's word in meta type, ink3; the `summary` in ink3 and the chevron at the end.
- The panel, 6 above and below, sections 10 apart, each an engraved caption 4 over its content:
  - Input: `input`'s pairs as compact `Properties` (objects as one line of JSON in code type).
  - Result: `result` as text in the field well (10 × 8, the well's field radius), code type, pre-wrap, scrolling past 240 and focusable to scroll; objects pretty-printed; an element as it is.
  - Error: `error` in the error ink, in place of the result.
  - `children`, when given, replace all three: the tool's own UI.
- `ToolCall.Group`: the same row with the words ("4 tools", counted, or `label`) in ui type; the panel holds the calls beside an engraved rule, 12 in.

## States and motion

| `status` | Look | Motion |
|---|---|---|
| queued | the amber lamp, "Queued" | – |
| running | after the show delay the small ring, "Running"; busy | the ring turns; its tick when it ends; said twice |
| done (default) | the off lamp; "1.2 s" when `duration` is given | the word turns on the drum |
| failed | the red lamp, "Failed" | blinks twice when it turns failed on screen, never on load |
| open | the panel | Collapsible's reveal (settle) and close (release) |

Reduce Motion: the fold crossfades; the lamp holds steady; the drum changes in place.

## Rules

- Folded by default: the row says what ran and how it went; open is for inspecting.
- A summary is the call's main input in a few words ("‘springs’"), never the result.
- Give `duration` (ms) once done when you know it; a failed call gives `error` in words a person reads.
- A group's `status` is the host's: running while any call runs, failed when any failed, else done.
- Status colour never stands alone: the word goes with the lamp.

## API

| React | SwiftUI |
|---|---|
| `ToolCall` `name`, `status`, `summary`, `input`, `result`, `error`, `duration` (ms), `open`, `defaultOpen`, `onOpenChange`, `children` | `MetalToolCall(_ name:, status:, summary:, input: [(String, String)], result:, error:, duration: (s)) { own UI }` |
| `ToolCall.Group` `label`, `status`, `open`, `defaultOpen`, `onOpenChange`, `children` | `MetalToolCallGroup(label:, count:, status:) { calls }` |
| `ToolCallStatus` `queued`, `running`, `done`, `failed` | `MetalToolCallStatus` the same cases |

## Keyboard and accessibility

- The row is Collapsible's button: Enter or Space opens it; `aria-expanded`; named by the tool, its word and its summary.
- `aria-busy` while running; "search_docs, running" is said when the ring shows and "search_docs, done" when it ends (a polite status outside the button).
- The result's well is focusable when it scrolls, named "Result".
