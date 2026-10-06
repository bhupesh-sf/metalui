# Plan

The agent's to-do list: what it said it would do and how far it has got. React: `Plan` from `@unlocalhosted/metalui`. SwiftUI: `MetalPlan`. An object: it stands for the work the agent took on and stays as the record of how it went. Every look is borrowed: the head is a compact `Progress`, the lamps are the LED with its meanings, the running ring is the `Spinner` on the wait timing (`useWait`), done is the check glyph, the words turn on the drum (`SwapText`), the nesting rule is the engraved rule. The states are `ToolCall`'s, so a plan and the calls that carry it out never disagree. The `plan` recipe holds only sizes.

## Use it for

- An agent's plan in an assistant's `Message`: the steps it will take, ticking off as it goes.
- What is waiting to run: steps marked `queued` (next up, or held on a `Confirmation`).
- Tasks under a step: give the step its own `tasks`.

## Don't use it for

- A story of what happened, with times: use a `Timeline` (in `Reasoning` for an agent's working).
- One tool call with inputs and a result: use `ToolCall`.
- A wizard the person walks through: use `Stepper`.
- The person's own to-do list they tick: use `Checkbox`es (a plan's ticks are the agent's, not operated).

## Anatomy

- Head, 10 above the list: a compact `Progress`, its label the `title` ("Plan"), its detail "3 of 5" on the drum, its track filling as steps finish. Any failed step turns it failed (the fill stops in the failed ink); every step done completes it.
- A task, 4 above and below: a 16 slot with the mark, 8, the title in ui type, then the state's word in meta type, ink3.
- `description`: a line under the title, meta type, ink2, lined up with the title.
- `tasks`: under the step, an engraved rule down the mark's column and the tasks 8 in, their marks under the step's words. The head counts steps (the top level) only.

## States and motion

| `state` | Look | Motion |
|---|---|---|
| pending (default) | the off lamp; the title in ink | – |
| queued | the amber lamp, "Queued" | – |
| running | after the show delay the small ring, "Running"; the list is busy | the ring turns; its tick when it ends |
| done | the check glyph; the title in ink3 | – |
| failed | the red lamp, "Failed" | blinks twice when it turns failed on screen, never on load |

Reduce Motion: the lamp holds steady; the drum changes in place.

## Rules

- One step runs at a time unless the agent really runs them together; what is next is `queued`, the rest `pending`.
- A failed step says why in its `description`, in words a person reads.
- Status colour never stands alone: the word or the check goes with the lamp.
- Fold a long plan by putting it in a `Collapsible` or a `Reasoning`; the plan itself does not fold.

## API

| React | SwiftUI |
|---|---|
| `Plan` `tasks`, `title` ("Plan") | `MetalPlan(_ title:, tasks:)` |
| `PlanTask` `id`, `title`, `state`, `description`, `tasks` | `MetalPlanTask(id:, title:, state:, description:, tasks:)` |
| `PlanTaskState` `pending`, `queued`, `running`, `done`, `failed` | `MetalPlanTaskState` the same cases |

## Keyboard and accessibility

- Nothing takes focus. The head is a progressbar named by the title, its value said as "3 of 5 done".
- The tasks are an ordered list named by the title, `aria-busy` while a task runs; a done task says ", done" after its title, and queued, running and failed say their word.
