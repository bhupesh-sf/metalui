# Canvas status rig

A rig: what the scope finds is counted onto the blocks drum; rolling the thumbwheel back into the past turns the scope's query off, so it stops and dims. React: `<Rig spec={canvas_status} catalog={catalog} values={...} states={...} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/canvas-status.rig.json`. An Object: it stands for how these things affect each other, and is never a control.

## Cables

- `find.found → blocks.count` (straight through)
- `when.in-past → find.query` (select)

It proves: a count straight through and select (true → false).

## Driving it

Set inputs with `values` (instance → port → value) and states with `states` (instance → state). A change travels the cables: a bead of light runs along each cord and the gadget at the far end answers when it arrives. A state port sets a gadget's state; a pulse plays its act; a switch that names no state holds its act's state.
