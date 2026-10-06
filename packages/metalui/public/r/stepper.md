# Stepper

The steps of a wizard: where you are, what's done, what's left, which step has a problem and which one waits. React: `Stepper` from `@unlocalhosted/metalui` (an ordered list with `aria-current="step"`; Base UI has no stepper). SwiftUI: `MetalStepper`. Every look is borrowed: the switch's sunk well (upcoming) and on look (the groove's fill), the switcher's thumb (current), the checkbox's on look (done), the field's invalid ring, the Spinner's ring. The `stepper` recipe holds the sizes and the motion. A component: you operate it to change which panel of the flow is shown.

## Use it for

- A task split into ordered steps that each hold part of a form: a checkout, a setup, an import.
- Showing a step with a problem (`error`) or a step that is working (`waiting`) where people look.

## Don't use it for

- Peers you switch between in any order with nothing ever "done": use `Tabs`.
- How far a task has come when the steps can't be visited: use `Progress` with `steps` ("Step 2 of 4").
- Pages of results: use `Pagination`.

## Anatomy

- Root (`Stepper`): `steps`, `value` / `defaultValue` / `onValueChange` (an index), `linear` (default true), `orientation` (horizontal, vertical).
- A step (`StepperStep`): `title`, `description`, `error`, `waiting`, `complete`, `disabled`.
- List (`Stepper.List`): `aria-label` (required), `layout` (stacked: titles under the indicators; inline: titles beside). Each step is a 24 round indicator (meta type, tabular) with its title (ui type) and a line (meta, ink3), padded 6 with a 10 radius; a step you can go to is a button. Grooves 3 thick run between the indicators, 6 clear of each. Vertical: the indicators in a column, the groove standing beside the titles; `Stepper.Panel`s placed in the list open under their step's title, the groove running beside them.
- Panel (`Stepper.Panel` `index`): one step's content; always mounted, `hidden` unless current; a `group` named by the step's title.
- Back (`Stepper.Back`) and Next (`Stepper.Next`): Buttons. Back is off on the first step. Next is primary; its words ("Continue", `children`) turn on the drum to `finish` ("Finish") on the last step, where it never advances: the host submits. Both take every Button prop (`state="waiting"` while a step works).

## States and motion

| State | Look | Motion |
|---|---|---|
| upcoming | the switch's sunk well, number in ink3, title in ink2 | – |
| current | under the switcher's raised thumb, number and title in ink | the thumb glides from step to step on the part spring (may overshoot) |
| done | the checkbox's on look with the set's `check`; the groove after it green | the groove fills on settle, drains on release (translate) |
| error | the invalid hairline ring on the indicator; the words under the title in the form error's ink; not done | – |
| waiting | the number gives way to the Spinner's ring after the show delay; its tick when done | `useWait`: nothing for fast work, a minimum on screen |
| unreachable | text, not a button; ink3 | – |
| disabled | 40 %, not a button | – |
| hover | a step you can go to lifts (the row's list hover) | the row's fade |
| focus | the green ring | – |
| panel arriving | – | drifts one nest from the way you went (trailing going forward) and fades, settle spring; the old one leaves at once; the first shows still |
| narrow | under 480 px (a container query on the list) a horizontal list keeps its titles for readers only and shows "Step 2 of 4 · Shipping" under the row | the line turns on the drum |

Reduce Motion: the thumb, the fill and the panel move at once; the panel fades.

## Rules

- A step is done once you've passed it, unless `complete` says otherwise; `error` always wins over done.
- `linear` (default): only steps up to the furthest you've reached are buttons. `linear={false}` for flows whose steps don't depend on each other.
- Refuse Continue by calling `event.preventDefault()` in `Stepper.Next`'s `onClick`, then set the step's `error` and the field's own error. Never refuse silently.
- Every `error` is words ("Add an address"); colour never says it alone.
- A step that works for more than a moment: set its `waiting` and `Stepper.Next`'s `state="waiting"` together, so the key and the step agree.
- Keep titles to one or two words; the description carries the rest.

## API

| React | SwiftUI |
|---|---|
| `Stepper` `steps`, `value`, `defaultValue`, `onValueChange`, `linear`, `orientation` | `MetalStepper(_ steps:, current:, linear:, orientation:, layout:, panel:)` |
| `StepperStep` `{ title, description, error, waiting, complete, disabled }` | `MetalStep(_ title:, description:, error:, waiting:, complete:, disabled:)` |
| `Stepper.List` `aria-label`, `layout` | the list is the view itself; `layout: .stacked / .inline` |
| `Stepper.Panel` `index` | `panel: { index in … }` |
| `Stepper.Back`, `Stepper.Next` `finish` | the host's `MetalButton`s on the `current` binding |

## Keyboard and accessibility

- An ordered list named by `aria-label`; the current step has `aria-current="step"`. Each step's name is "Step 2: Shipping" with its state in words ("completed", "has a problem: Add an address", "not available yet").
- Tab moves through the steps you can go to, then into the panel; there is no roving focus and no arrow keys (they would skip ahead).
- After Back or Continue, focus moves to the new panel (`tabIndex=-1`), so a reader hears where it landed; pressing a step keeps focus on the step.
- A waiting step is `aria-busy`; the Spinner says "Payment, working" when its ring shows and "Done" when it ends.
