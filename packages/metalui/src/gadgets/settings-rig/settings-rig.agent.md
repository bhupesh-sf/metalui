# Settings rig

A rig: the rocker sets the mood of the fader bank, a low mix off and a high one on, with the keycap chord beside them. React: `<Rig spec={settings} catalog={catalog} values={...} states={...} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/settings.rig.json`. An Object: it stands for how these things affect each other, and is never a control.

## Cables

- `sound.on → prefs.mix` (select)

It proves: select (a switch into a number).

## Driving it

Set inputs with `values` (instance → port → value) and states with `states` (instance → state). A change travels the cables: a bead of light runs along each cord and the gadget at the far end answers when it arrives. A state port sets a gadget's state; a pulse plays its act; a switch that names no state holds its act's state.
