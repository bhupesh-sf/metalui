# Progress

How far a task has come. React: `Progress` from `@unlocalhosted/metalui`, on Base UI Progress. SwiftUI: `MetalProgress` (work in progress). The track and fill are the `switch` recipe's sunk track and green on look; the `progress` recipe adds the size, text and motion.

## Use it for

- A task that takes more than a moment and whose end you can see or estimate: an upload, an export, a sync.
- `value={null}` when the amount is unknown but something is happening.

## Don't use it for

- A level or a measurement that is not a task (use a meter), or a wait under a second (show nothing).

## Anatomy

- Head (optional): the label at the left (ui type), the value at the right (meta type, tabular), 6 above the track.
- Track: 8 tall, a pill, the switch's sunk well, at least 160 wide.
- Fill: the switch's green on look, from the start to the value.

## States and motion

| State | Look | Motion |
|---|---|---|
| known | the fill reaches the value | its edge moves on the settle spring, never past the value |
| unknown (`value={null}`) | a short lit segment (32 % of the track) | sweeps across and loops, 1.4 s ease-in-out |
| complete | full, 100 % | – |

Reduce Motion: the edge snaps to each value; the unknown segment sits in the middle and breathes (opacity) instead of sweeping.

## API

| React | SwiftUI |
|---|---|
| `value` (number or `null`), `min`, `max` (100) | `value:` (`Double?`), `total:` |
| `label`, `showValue` | `label:` |
| `format` (Intl.NumberFormat options for the value) | – |
| `Progress.Root` with your own `Progress.Label`, `Progress.Value`, `Progress.Track` | slots |

## Keyboard and accessibility

- A `progressbar` with aria-valuenow (absent when unknown). The label names it; give `aria-label` when there is no visible label.
- It takes no focus. Say when it is done somewhere that is announced (a toast).

## Rules

- The fill never moves backward unless the task really did.
- Say what is in progress in the label, not "Loading…".
