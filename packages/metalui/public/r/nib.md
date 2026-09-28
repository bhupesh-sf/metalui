# Nib

A pen nib seen from above. React: `Nib` from `@unlocalhosted/metalui`. SwiftUI: `MetalNib`. A part: it has a look and no job of its own.

## Use it for

- Making: drawing, writing, the draw tools' emblem.

## Don't use it for

- Editing or picking: that's a cursor or a selection frame (Instruments).
- A pen a person holds on the canvas: that's the brush cursor.

## Anatomy

A nib 70 × 20 at the Part's size, its origin at its tip, lying back along its length and turned by `angle` (−30° to 30°). Its outline narrows from its shoulders (62 % of the way back) to the tip; a slit runs from the tip to a breather hole just past the middle. It is brass, lit along a stripe; the last fifth of it, at the tip, is wet with ink in the accent. It casts a small shadow. Tokens: `gadgets.nib`.

## States

- **Ready.** At rest over its well.
- **Writing.** In a gadget the `dip` mechanism dips it 10 units into its well and it springs back up, tapping the well; writing, it rests 6 units down.

## API

`Nib angle? ink? size?` (ink: OKLCH, the accent by default).

SwiftUI: `MetalNib(angle: -12, size: 160)`.
