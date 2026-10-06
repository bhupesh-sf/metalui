# LED

A tiny lamp in a small sunk socket, lit from the top left, that says one state by colour and by how it behaves. React: `Led` from `@unlocalhosted/metalui`. SwiftUI: `MetalLED`. A part: it has a look and no job of its own.

## Use it for

- One state, beside the words that name it: in a status badge, a size readout, a hover engraving, the lens bar, a latched key.

## Don't use it for

- A state on its own, with no words: colour alone is not enough.
- Something pressable: the LED is decorative (`aria-hidden`).
- A new colour. There are five kinds and no others.

## Anatomy

- **Lens**: a radial gradient lit at 40 % / 35 % (a hot spot, the ink, a deep edge), 6 pt (4 small).
- **Socket**: a 1 pt dark bezel and a light lip under it, drawn outside the layout box (8 pt and 6 pt in all). The socket is the lamp's own ground, so it reads on bone, graphite, frost and images without help.
- **Halo**: a lit lamp glows in its own ink. An off lamp has no halo: it is a dull, dark lens.

## Kinds and sizes

| Kind | Colour | Means |
|---|---|---|
| live | green (leaning blue) | on, working, latched |
| waiting | amber (leaning yellow) | in progress, or urgent |
| failed | red (deep) | stopped, needs you |
| link | blue | points somewhere else |
| off | a dark lens | idle |

The inks are tuned per colorway and chosen to stay apart for colour-blind readers: green leans blue, amber leans yellow and red is deep, so the four lit kinds differ in lightness where hue fails (every pair at least ΔE00 20 under simulated deuteranopia and protanopia; the Status page measures it). Sizes: 6 (default) and 4 (small, in dense readouts and keys).

## Gestures

How the lamp behaves over time (tokens `status.gestures`). A gesture dims and brightens the whole lamp (lens, socket and halo); it never fades it away.

| Gesture | Behaviour | Use it for |
|---|---|---|
| steady | holds | the default: a state that simply is |
| flicker | one burst of activity (0.8 s), then on | something just happened: a sync finished, a value arrived |
| breathe | a slow loop (2.4 s) | something in progress: syncing, searching |
| blink2 | two sharp flashes, then on | a failure, once; never repeat it |
| rise | comes on slowly (1.2 s) | a first start, a machine waking |

Reduced motion holds every lamp lit at its final level, so the colour still says the state. Changing the gesture, or the kind, plays it again. A status badge picks the state's own gesture for you (live steady, waiting breathe, failed blink2, off steady).

## API

`Led kind size ("default" | "small") gesture ("steady" | "flicker" | "breathe" | "blink2" | "rise")`

SwiftUI: `MetalLED(.live, gesture: .flicker)`.

## Tokens

`recipes.status` led layers (`recipe-status-led-<kind>`, per colorway), `--mu-led-*` (the Bone lamp faces, for dots), `status.gestures`.
