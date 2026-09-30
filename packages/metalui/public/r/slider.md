# Slider

A value on a track. React: `Slider` from `@unlocalhosted/metalui`, on Base UI Slider. Give it props and it draws itself; or compose its parts `Slider.Track`, `Slider.Marks` (fractions), `Slider.Ticks` (labelled fractions) and `Slider.Knob` inside it for a host that draws its own scale (the time scrubber). SwiftUI: `MetalSlider`.

## Use it for

- A value in a known range that a person sets by feel: zoom, volume, brightness, a quality level, a position in time.

## Don't use it for

- An exact number someone types (use a number field), a level nobody sets (use a meter), or one of a few named options (use a switcher).

## Anatomy

- The track: a track well, 6 / 10 / 14 tall for `compact` / `regular` / `large`; the fill: the green intent gradient at full strength up to the knob, deeper on bone so it stands at least 2:1 from the pale groove, with an inset hairline edge.
- The knob: 16 / 22 / 28, a knurled conic finish with a bright inner ring and a small drop shadow. Size sets the groove and the knob together.
- One travel: the groove is the full width; the knob's centre travels half a knob in from each end, so at the minimum and the maximum the knob sits flush inside the groove's rounded ends, never past them. The fill runs to the knob's centre, and marks and ticks sit on the same travel, so a tick, the fill's end and the knob line up at every value.
- Marks: notches cut across the groove (2 wide, the groove's full height), for steps, detents or moments. Only where there is a step or an event: never loose decoration.
- Ticks: a short line a gap under the groove and its label under that, in the meta type (11) at ink2, so labels read at 4.5:1 or better on the surface in both colorways. A host that engraves its own scale (the time scrubber) passes its own `Label` node, and in SwiftUI `tickStyle: .engraved`. With `ticks`, the slider reserves room for them below.
- Glyphs (optional): `startIcon` and `endIcon` at ink2, 14 / 16 / 18, a gap from the groove. Each plays its act when the value arrives at its end. They are decorative; the knob carries the name and value.
- Value (optional): `showValue` writes the value beside the groove in the figure type with `format`. It keeps the width of its widest value (every step when there are 24 or fewer, else the two ends), so the groove never moves as it changes; the digits turn on the drum.
- Width: full width of its container by default; `width` sets it (a number is px, a string any CSS length). SwiftUI: frame it as any view; it fills the width it is given.
- Put the slider on a plain surface (a panel, a card) or give it clear space: a busy or dotted backdrop never runs through its labels.

## API

| React | SwiftUI |
|---|---|
| `value`, `min`, `max`, `onValueChange` | `value:` (a binding), `in:` |
| `step` (1), `largeStep` (10) | `step:`, `largeStep:` |
| `size` (`compact`, `regular`, `large`) | `size:` (`.compact`, `.regular`, `.large`) |
| `startIcon`, `endIcon` (a glyph node) | `startIcon:`, `endIcon:` (`MetalIconName`) |
| `showValue`, `format` | `showsValue:`, `valueText:` |
| `marks` (values), `ticks` (`{ value, label }[]`) | `marks:`, `ticks:` (fractions), `tickStyle:` |
| `width` (full by default) | `.frame(width:)` |
| `aria-label` | `label:` |
| parts: `Slider.Track`, `Slider.Marks`, `Slider.Ticks`, `Slider.Knob` | `onFocusChange:`, `onDragChange:`, `isExternallyDragging:` |

## Keyboard and motion

- Arrows step (`step`), Shift + arrows step large (`largeStep`); Home / End go to the ends.
- A jump (a click on the track, a key) rides the part spring; a drag follows the pointer exactly. The knob and the fill ride one animated fraction, clamped to the travel, so a spring that overshoots stops flush at an end. Under Reduce Motion a jump lands at once and the readout crossfades.
- SwiftUI `onDragChange` reports drag start before the first value change and drag end after release. `isExternallyDragging` lets an offscreen host or controlled gesture suppress the jump spring during a scrub.
- Name the knob (`aria-label`) and give it a value text a person reads: `format` does both ("40%"); with parts, `getAriaValueText` on `Slider.Knob` ("THU 24 SEP · 14:10").

## Rules

- A jump springs, a drag does not.
- Marks and ticks mean something: a step, an event, a labelled value.
- Keep labels plain and readable, on a plain surface.
