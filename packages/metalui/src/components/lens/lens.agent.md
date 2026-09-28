# Lens

A camera lens seen head-on. React: `Lens` from `@unlocalhosted/metalui`. SwiftUI: `MetalLens`. A part: it has a look and no job of its own.

## Use it for

- Taking something in: a capture, a photo, a scan.

## Don't use it for

- Searching or finding: that's the scope's glass.
- A dial a person sets: that's a knob cap.

## Anatomy

A ring 14 units wide at its rim (at the Part's 184 across) in the accent, lit from the top left and knurled with 12 to 36 grip lines; it turns. Inside, a thin metal bevel and the domed glass, dark at its centre and coated violet toward its rim. Behind the glass, six dark iris blades close to a hexagon whose opening runs from 22 % to 90 % of the glass's radius as `iris` runs from 0 to 1, their seams drawn where they overlap. A soft glare and a small glint sit on the dome, and it casts a shadow. Tokens: `gadgets.lens`.

## States

- **Ready.** At rest: the ring where it was left.
- **Taken.** In a gadget the `turn` mechanism turns the ring a detent (45°) and back, clicking at each.

## API

`Lens iris? turn? ticks? color? size?` (turn: degrees; color: the ring's OKLCH, the accent by default).

SwiftUI: `MetalLens(iris: 0.6, turn: 0, size: 160)`.
