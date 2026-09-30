# Checkbox group

Several independent choices in a form. React: `CheckboxGroup` from `@unlocalhosted/metalui`, on Base UI CheckboxGroup, using the row-size `Checkbox`. SwiftUI: `MetalCheckboxGroup` (work in progress). The checkboxes are the `checkbox` recipe; the `checkbox-group` recipe adds the rows and the cascade.

## Use it for

- Choices that can each be on or off together: "Include notes · photos · links".
- A parent row ("All") when people often want everything or nothing.

## Don't use it for

- Tasks in text (use the margin checkbox), one choice of several (use a radio group), or settings that apply at once (use switches).

## Anatomy

- Row: the 14 checkbox and its label 8 apart, at least 28 tall; the whole row is the hit area.
- Parent (optional): the first row; items under it are indented 22.
- Rows 2 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| unticked / ticked | the checkbox's well / dark key with a tick | the checkbox's own: 160 ms fade; a pen draws the tick (a 40 ms beat, the short leg, a dwell at the corner, the long leg on the part spring) and draws it back before the key goes light |
| parent, some ticked | the dark key with a white dash (mixed) | the dash draws left to right on the part spring; mixed ↔ all bends the dash into the tick (and back) on the settle spring |
| parent ticked | every row ticks | a cascade from the top, one row every 30 ms; each tick draws a beat after its own key goes dark |
| parent cleared | every row clears | together: every tick withdraws at once, then the keys go light |
| disabled | the row at 40 % | – |

Reduce Motion: no cascade; ticks and the dash are whole, or gone, at once.

## API

| React | SwiftUI |
|---|---|
| `CheckboxGroup` `value`, `defaultValue`, `onValueChange`, `allValues` (needed for a parent; sets the cascade order) | `selection:` |
| `CheckboxGroup.Parent` (children: its label) | `all:` |
| `CheckboxGroup.Item` `value`, `disabled`, children (the label) | `options:` |

## Keyboard and accessibility

- Each checkbox is its own tab stop; Space ticks. The parent announces mixed when some are ticked. Wrap the group in a fieldset with a legend (or give it `aria-labelledby`) so the choices have a name together.

## Rules

- Labels say what is included, in the same form: "Notes", "Photos", "Links".
- A parent only when "all" is a real, common choice.
