# Cap

The fader, knob or rocker cap a person moves. React: `Cap` from `@unlocalhosted/metalui`. SwiftUI: `MetalCap`. A part: it has a look and no job of its own.

## Use it for

- A fader's cap, travelling along a slot (the fader bank's `slide`).
- A knob, turning in place (`turn`).
- A rocker, tilting between off and on about its middle (the rocker's `flip`).
- The part a person would reach for: give that one the accent, and only that one.

## Don't use it for

- A key or a button: that's a Keycap, pressed straight down.
- A plug: a plug seats in a jack and never slides or turns.

## Anatomy

A face on its darker side wall, which shows 4 units below it. A fader is 60 × 44 with radius 13 and 2 to 5 grip ribs across it, each a dark groove with a lit lower edge. A knob is round, the fader's height across, with a pointer groove. A rocker is a paddle (96 × 144 at the Part's size) engraved I on its upper half and O on its lower; tilted by `tilt` from -1 (off, its lower end pressed) to 1 (on), the half facing the light brightens, the other darkens, the fold between them deepens and its shadow moves toward the raised end. Its shadow is its own layer (`cap.shadow`). Tokens: `gadgets.cap`.

## States

- **Rest.** Standing on the body, its shadow down and to the right.
- **Pressed.** The face sinks 2.5 units toward the body and its shadow draws in, on the `release` spring. Released, it comes back the same way. With reduced motion it goes at once.
- **Sound.** Pressed, it knocks softly in its own material (`parts.cap.strike`: face, 0.8).

## API

`Cap shape? ("fader" | "knob" | "rocker") tilt? (-1..1, a rocker) ribs? (2..5) accent? material? ("clay" | "ceramic") color? pressed? size? host?`

SwiftUI: `MetalCap(shape: .fader, accent: true, pressed: isPressed, size: 96)`.

In a gadget spec: `{ "part": "cap", "role": "actor", "material": "accent", "params": { "ribs": 3 } }`. The `slide` mechanism binds caps to its `caps` slot.
