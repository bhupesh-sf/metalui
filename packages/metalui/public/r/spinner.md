# Spinner

Steady work that will be done soon, in a small space. React: `Spinner` from `@unlocalhosted/metalui`. SwiftUI: `MetalSpinner` (work in progress). The well is the `switch` recipe's sunk track; the `spinner` recipe adds the arc and its motion.

## Use it for

- Inside or beside the control that started the work: a Save button while saving, a row while its preview loads.

## Don't use it for

- Work whose amount you can show (use progress), or whole-page loading (show the page's shape and fill it in).

## Anatomy

- Well: a sunk circle, 16 (small 12), the switch track's look.
- Arc: a green ring 2.5 thick, lit at its head and fading into a tail over 72 % of the turn.

## States and motion

| State | Look | Motion |
|---|---|---|
| mounted | invisible | waits 400 ms, so quick work never flashes it |
| working | the well and the turning arc | fades in (160 ms); turns at 900 ms a turn, linear |
| done | – | the host unmounts it; the result is the news, so there is no exit |

Reduce Motion: the arc stands still and breathes (opacity).

## API

| React | SwiftUI |
|---|---|
| `size` (`regular`, `small`) | `size:` |
| `label` ("Loading") | `label:` |

## Keyboard and accessibility

- A `status` named by `label`; it takes no focus. Mark the busy region with `aria-busy` while it shows, and announce the result when the work ends.

## Rules

- Put it where the work is, not in a corner.
- Constant speed: never ease or spring the turn.
- Say what is working in the label: "Saving", "Loading preview".
