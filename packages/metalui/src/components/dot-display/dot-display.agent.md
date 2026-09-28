# Dot display

Square dots on one pitch, printed into a well. React: `DotDisplay` and `useDotTick`. SwiftUI: `MetalDotDisplay` and `MetalDotClock`.

## Use it for

- A picture made of dots inside an object: a weather sky, a sticker, a small readout. Put it in a `Well`; the object around it carries the label.

## Props

- `cols`, `rows`: the grid. A tile's sky is 21 × 21, a wide sky 46 × 28.
- `dots`: one ink index per dot, row by row. An index with no ink is unlit.
- `inks`: index → a px colour (`off`, `hz`, `hill`, `sun`, `moon`, `star`, `cloud`, `cloud-dark`, `rain`, `snow`), or `[colour, alpha]` for a dimmer dot. Index 0 is always drawn unlit.

## Behaviour

- Pitch 8, dot 6 (recipe `dot-display`). The SVG draws cells; the `dot-display` utility masks them to squares.
- `useDotTick(ref)` gives a frame number that steps every 167 ms. It holds still under reduced motion, in a hidden tab and off screen. Draw the next picture from the tick; never tween between frames.
- Decorative (`aria-hidden`): describe the picture on the object ("Rain, 14°").

## Don't

- Don't round the dots, add glow or draw on black: the dots are printed into the colorway's well.
- Don't pick colours outside the px set; the set is what makes every display read as one family.
