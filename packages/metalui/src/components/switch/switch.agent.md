# Switch

A setting that is on or off and takes effect at once. React: `Switch` from `@unlocalhosted/metalui` (Base UI Switch). SwiftUI: `MetalSwitch`. Its look is the `switch` recipe.

## Use it for

- Settings that apply immediately: "Sync this canvas", "Share usage data", "Show the grid".

## Don't use it for

- A choice that needs Save (use a checkbox in a form), one of several options (use a switcher), or a task (use the checkbox in the margin).

## Anatomy

- Track: a sunk pill, 40 × 24 (small 32 × 20), padding 2, the track well; on, a soft green gradient with an inner shadow.
- Thumb: a raised round cap, 20 (small 16), the switcher thumb's material.

## States and motion

| State | Look |
|---|---|
| off | thumb left, plain well |
| on | thumb right (travel 16, small 12) on the part spring; track green, fading on settle |
| pressed | the thumb stretches 4 pt toward where it is going |
| focus | the green ring at offset 2, keyboard only |
| disabled | 40 % |

Reduce Motion: the thumb moves at once; the colour still fades.

## API

| React | SwiftUI |
|---|---|
| `checked`, `defaultChecked`, `onCheckedChange` | `isOn:` |
| `size` (`regular`, `small`) | `size:` |
| `disabled` | `.disabled()` |
| `label`, `description` (a row: the words toggle it; the description is read as its description) | the title (`MetalSwitch("Sync", isOn:)`) |
| `labelSide` (`end`: after the switch; `start`: a settings row, words left, switch right) | – |
| `aria-label` (no visible label) | `.accessibilityLabel` |

## Keyboard and accessibility

- A button with the switch role; Space toggles. Give it a visible `label` (the row is a native label, so the words toggle it), or `aria-label` when nothing visible names it. Never wire a click on its words by hand.

## Rules

- A switch acts at once. If the change needs confirming, it is not a switch.
- The label says what is on, not "Enable …": "Sync this canvas".
