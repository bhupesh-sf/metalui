# Ink well

A gadget for making, drawn from a spec. React: `<Gadget spec={inkWell} value={drawing ? 1 : 0} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/ink-well.gadget.json`. An Object (an emblem): it stands for the drawing tools, and is never a control.

## Use it for

- The draw tools' emblem; the moment drawing starts.

## Don't use it for

- The pen a person draws with on the canvas: that's the brush cursor (an Instrument).
- Anything a person picks from: that's the draw picks.

## How it moves

The `dip` mechanism, momentary (about 320 ms): the nib drops 10 units into the ink on the accelerate curve, taps the well softly in ceramic at 110 ms, and springs back up on the release spring. Writing, it rests 6 units down. Its act plays as writing starts, or on its own (`act`). With reduced motion the dip is only its tap.

## States

`writing` (a boolean) decides.

| State | Nib | Lamp | News |
|---|---|---|---|
| rest | ready over the ink | off | none |
| writing | dips, then rests in the ink | green, steady | a soft tap |

It says: "Draw, writing".

In a rig: `writing` (boolean) in.
