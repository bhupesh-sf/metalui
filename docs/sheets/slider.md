### Slider: more kinds

From `docs/BACKLOG.md` "Slider: redesign", the open **More kinds** and **Follow-ups** items: a range (two knobs), a vertical slider, a stepped slider that clicks into detents, a centred slider, a neutral ink fill, a value bubble over the knob while dragging, the refusal's direction in right-to-left, the drum for the SwiftUI readout, volume and brightness glyphs, and a robust bounds test.

Now: one knob on a horizontal groove, a green fill from the start, a readout beside it on the drum (SwiftUI rolls its digits but never animates them), a refusal that always nudges right for the maximum.

Read for jobs: ReUI Slider, shadcn Slider, Base UI Slider (ranges, orientation, `minStepsBetweenValues`), Radix Slider, MUI Slider (`valueLabelDisplay`, `track="inverted"`, marks), Ant Design Slider (`range`, `vertical`, `included`), Apple's NSSlider and SwiftUI `Slider` (tick marks, `allowsTickMarkValuesOnly`), macOS Control Center (volume, brightness), Logic Pro's pan knobs and faders, Lightroom's Develop sliders (exposure and temperature from a centre).

**Place (docs/COMPOSITION.md): still a Component.** Every kind below is the same control you operate; none of them is an Object, an Instrument or a Place. They are props on `Slider`, not new components: they share the groove, the knob, the travel and the motion.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Choose a span: a price band, a date window, a frequency band | filters, trimming a clip | `value={[lo, hi]}`: two knobs on one groove, the fill between them (Base UI range). The knobs never cross (`minStepsBetweenValues`, push); each knob is its own tab stop named "…, minimum" / "…, maximum"; the readout says "20–80" | Must |
| A level in a tall, narrow place: a mixer channel, a side rail | audio, an inspector's edge | `orientation="vertical"`: the minimum at the bottom, ↑ increases; glyphs above and below, the value on top; ticks hang to the end side; `height` (the recipe's 160 by default) | Must |
| Choose one of a few stops by feel: quality, a zoom level, a grid size | export, view options | `detents`: a notch at every step, the knob clicks from stop to stop on the part spring even while dragged, and each stop plays `haptic('detent')` where there is one | Must |
| An amount either side of zero: balance, pan, exposure, temperature offset | audio, image adjust | `origin={0}`: the fill grows from the origin's notch toward the knob, either way | Must |
| A slider that isn't an amount you set: a position in time, a scrubber, a setting where green would claim "on" | media, settings next to switches | `tone="ink"`: the fill in ink, not green | Must |
| Read the exact value while the finger hides the readout | touch, a slider with no readout | `bubble`: the value on a small chip over the knob while it is dragged (the tooltip's plate), gone on release | Must |
| Right-to-left pages | Arabic, Hebrew | the groove, knob, fill, notches and ticks mirror (logical insets); the arrows follow Base UI's `DirectionProvider`; a push past the maximum nudges toward the left | Must |
| The readout changing on the drum in SwiftUI | macOS | the numeric content transition rides the settle spring (it had none, so it snapped); Reduce Motion crossfades | Must |
| Glyphs for volume at the ends | a volume slider | `volume-low`, `volume-high`: a speaker that throws one wave and two, each in the act format | Should |
| Brightness at the ends | a brightness slider | `sun` (the set's brightness) at the end; `moon` at the start reads as night, not dim, so the start is left empty or the host's choice | Should |
| Sizes | everywhere | large / regular / compact (28 / 22 / 16 knob; the groove with it), unchanged; every kind takes every size | Must |
| Marks under a range or a vertical slider | price bands, dB scales | covered: marks and ticks share the travel in every kind | covered |
| A knob that shows its value always (MUI `valueLabelDisplay="on"`) | | dropped: `showValue` already writes it beside the groove where it never covers anything | dropped |
| Inverted track (MUI `track="inverted"`) | "remove above" | dropped: an `origin` at the maximum does the same job | covered |
| Three or more knobs | gradient stops | Later: Base UI takes any number; no host needs it and the readout and names would need a design | Later |
| Dragging the fill to move a range | a timeline window | Later: Base UI has no handle on the indicator | Later |
| A circular knob (a pan pot) | audio | dropped here: a knob you turn is its own component, not a slider | dropped |

**Decide**

- **Range as a prop or a component?** A prop: `value` as `[lo, hi]`. The groove, travel, ticks and motion are the same; a second component would copy them. TypeScript ties `onValueChange` to the value's shape.
- **What the readout says for a range.** Both ends with an en dash, "20–80" (each through `format`), as wide as its widest pair so the groove never moves.
- **Detents while dragging.** A plain slider follows the hand 1:1. A detented one doesn't: the knob jumps stop to stop on the part spring, because a detent is felt as a click, and the spring is that click. Notches appear at every step (up to 24; past that a detent is too fine to feel and the guide says drop `detents`).
- **Centred: what the origin draws.** A notch at the origin, so zero is visible when the knob is far from it; the fill from that notch to the knob, either side.
- **Ink tone.** The fill in ink, deep on bone and pale on graphite, with the same inset edge; the knob is unchanged.
- **Bubble content.** The value written by `format`, in the figure type, plain (not on the drum): during a drag the value changes every frame and a drum would only blur it.
- **Vertical length.** The recipe's `vertical.length` (160), or `height`; vertical ignores `width`.
- **Volume glyphs.** Two glyphs, not one with a level: the slider's ends need a low and a high that read apart at 16 px.

**Must**
- [x] React: `value` as `[lo, hi]`, `orientation`, `height`, `detents`, `origin`, `tone`, `bubble`; RTL refusal direction; vertical refusal up and down.
- [x] SwiftUI: `MetalSlider(range:)`, `orientation:`, `detents:`, `origin:`, `tone:`, `bubble:`; RTL keys and refusal; the readout on the drum.
- [x] Recipe: the ink fill, the bubble, the vertical length and the travel utilities for both axes.
- [x] Agent guide and docs page with every kind and the DialKit panel; Playwright slices for range, vertical, detents, centred, ink, bubble and RTL.
- [x] `volume-low`, `volume-high` in the act format.
