# Sync health rig

A rig: the patch bay's health selects a number for a health gauge, and each finished sync counts one off the pending drum. Fail it and the needle drops; finish it and it rises and the pending count rolls back. React: `<Rig spec={sync_health} catalog={catalog} values={...} states={...} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/sync-health.rig.json`. An Object: it stands for how these things affect each other, and is never a control.

## Cables

- `sync.healthy → health.value` (select)
- `sync.done → pending.count` (count)

It proves: select (a switch into a number) and count −1.

## Driving it

Set inputs with `values` (instance → port → value) and states with `states` (instance → state). A change travels the cables: a bead of light runs along each cord and the gadget at the far end answers when it arrives. A state port sets a gadget's state; a pulse plays its act; a switch that names no state holds its act's state.
