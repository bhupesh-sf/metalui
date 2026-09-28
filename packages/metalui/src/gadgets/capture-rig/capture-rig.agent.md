# Capture rig

A rig: each picture the shutter lens takes counts one more for today, and today's count, scaled, lights another cell of memory. A first run raises the grid. React: `<Rig spec={capture} catalog={catalog} values={...} states={...} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/capture.rig.json`. An Object: it stands for how these things affect each other, and is never a control.

## Cables

- `take.taken → today.count` (count)
- `today.count → memory.fill` (scale)

It proves: count +1 and scale (0..20 → 0..1).

## Driving it

Set inputs with `values` (instance → port → value) and states with `states` (instance → state). A change travels the cables: a bead of light runs along each cord and the gadget at the far end answers when it arrives. A state port sets a gadget's state; a pulse plays its act; a switch that names no state holds its act's state.
