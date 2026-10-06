# Draw picks

The ink and width choices beside the drawing tools. React: `InkPicks`, `WidthPicks` from `@unlocalhosted/metalui`. SwiftUI: `MetalInkPicks`, `MetalWidthPicks` with `Binding<MetalInk>` and `Binding<MetalInkWidth>`.

## Use it for

- Choosing the ink (ink, red, blue, green, amber) and width (fine, regular, bold) of the pen, pencil, marker, line, arrow, rectangle and ellipse.

## Don't use it for

- A free colour picker. The set is fixed on purpose.
- Anything outside a `Toolbar`: the picks are toolbar buttons.

## Anatomy

A 28 round cap. Ink: a 14 bead in its colour with a gloss. Width: a 20 stroke, slanted 40°, 3, 6 or 10 thick in the current ink (as the pen will draw it). Picks sit 2 apart. Each pick is named with its group, in its tooltip and accessible name: "Ink: plain", "Ink: red", "Width: fine"; each group is named ("Ink", "Width"). `InkStroke` is the stroke alone, for a cap that shows the pen as it is set (the Fan's Ink tray).

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | bead or dot at 1.14 | part spring |
| press | .88 | 80 ms |
| chosen | sunk well (the latched tool's; on a graphite strip, its own dark well) | at once |
| focus | 1.5 ring, no offset | – |
| disabled | 40 % (eraser latched) | – |

## API

| React | Notes |
|---|---|
| `InkPicks value onValueChange disabled` | `Ink`: `'ink' \| 'red' \| 'blue' \| 'green' \| 'amber'` |
| `WidthPicks value onValueChange ink disabled` | `InkWidth`: `'fine' \| 'regular' \| 'bold'` |
| `InkStroke ink width` | the stroke alone, decorative |
| `inkColor(ink)` | the CSS colour to draw with |
