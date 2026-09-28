# Storage rig

A rig: how full the drawer is, scaled onto a used gauge; past its line the gauge arms the bin. Fill the drawer and the bin lifts its lid. React: `<Rig spec={storage} catalog={catalog} values={...} states={...} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/storage.rig.json`. An Object: it stands for how these things affect each other, and is never a control.

## Cables

- `local.fill → used.value` (scale)
- `used.above → trash.armed` (straight through)

It proves: scale (0..1 → 0..100) and a switch straight through.

## Driving it

Set inputs with `values` (instance → port → value) and states with `states` (instance → state). A change travels the cables: a bead of light runs along each cord and the gadget at the far end answers when it arrives. A state port sets a gadget's state; a pulse plays its act; a switch that names no state holds its act's state.
