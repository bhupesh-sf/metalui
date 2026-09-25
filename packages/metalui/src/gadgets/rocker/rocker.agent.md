# Rocker

A gadget for one setting, drawn from a spec. React: `<Gadget spec={rocker} value={on ? 1 : 0} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/rocker.gadget.json`. An Object (an emblem): it stands for one setting that is on or off, and is never a control.

## Use it for

- One setting's emblem: sync on or off, sound on or off.
- Showing a setting changed: the rocker rocks and clicks.

## Don't use it for

- The switch a person flips: that is the Switch component.
- Several settings at once: that's the fader bank.

## How it moves

The `flip` mechanism, held, on the hinge spring: `on` (a boolean) rocks the rocker Cap from its lower end pressed (O, off) to its upper end pressed (I, on). The half that faces the light brightens, the fold between the halves deepens, and the shadow moves toward the raised end. It clicks in clay as it reaches either end. With reduced motion it goes straight there.

## States

`on` decides.

| State | Rocker | Lamp |
|---|---|---|
| rest | O pressed | off |
| on | I pressed | green, steady |

It says: "Sound, on".

In a rig: `on` (boolean) in and out.
