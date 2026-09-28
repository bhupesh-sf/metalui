# Shutter lens

A gadget for capture, drawn from a spec. React: `<Gadget spec={shutterLens} state={justTaken ? 'taken' : undefined} value={zoom} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/shutter-lens.gadget.json`. An Object (an emblem): it stands for taking something in, and is never a control.

## Use it for

- Capture: a screenshot, a photo, a scan; the capture toolbar's emblem.
- Showing a capture happened: set `taken` for a moment.

## Don't use it for

- Searching: that's the scope.
- Counting captures: wire it to a counter drum in a rig (`taken → count`).

## How it moves

The `turn` mechanism, held, on the part spring: `zoom` (0 to 1) is the ring's angle over a whole turn, with a click at every eighth. Entering `taken` turns the ring one detent round and back (600 ms). It clicks, and never scrapes. With reduced motion the ring goes straight to its angle and the capture is only its lamp and flash.

## States

| State | Glass | Lamp | News |
|---|---|---|---|
| rest | faintly lit | off | none |
| taken | flashes | green, rising | the ring's click |

It says: "Capture: taken".

In a rig: `zoom` (number 0 to 1) and `take` (pulse) in, `taken` (pulse) out.
