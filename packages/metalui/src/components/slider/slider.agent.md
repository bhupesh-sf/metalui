# Slider

A value on a track. React: `Slider` from `@unlocalhosted/metalui`, on Base UI Slider. Give it props and it draws itself; or compose its parts `Slider.Track`, `Slider.Marks` (fractions), `Slider.Ticks` (labelled fractions) and `Slider.Knob` inside it for a host that draws its own scale (the time scrubber). SwiftUI: `MetalSlider`.

## Use it for

- A value in a known range that a person sets by feel: zoom, volume, brightness, a quality level, a position in time.
- A span in a range (a price band, a time window): a range, `value={[lo, hi]}`.
- A level in a tall, narrow place (a mixer channel): `orientation="vertical"`.
- One of a few stops you can feel (a grid size, a zoom step): `detents`.
- An amount either side of zero (balance, pan, an exposure offset): `origin={0}`.

## Kinds

| Kind | How | What changes |
|---|---|---|
| range | `value={[lo, hi]}`, `onValueChange([lo, hi])` | two knobs, each its own tab stop ("…, minimum", "…, maximum"); the fill between them; they push, never cross; the readout says "lo–hi" |
| vertical | `orientation="vertical"`, `height` (160) | the minimum at the bottom, ↑ increases; the end glyph on top, the value above it; ticks hang to its right (the slider keeps `vertical.label` of room there); the bubble stands to its left |
| detents | `detents` (with `step`) | a notch at every step inside the ends (up to 24); the knob clicks stop to stop on the part spring, even while dragged; each stop plays `haptic('detent')` where a device has one |
| centred | `origin={0}` | a notch at the origin; the fill grows from it to the knob, either side |
| ink | `tone="ink"` | the fill in ink (deep on bone, pale on graphite), for a slider that is not an amount someone set (a place in a song); green stays the default |
| bubble | `bubble` | while a knob is dragged, its value (through `format`) on the tooltip's chip over it, fading and growing in on the settle spring; only the knob being dragged; plain text, not the drum (a drag changes it every frame) |
| right to left | `dir="rtl"` on the page and `DirectionProvider direction="rtl"` (exported) around it | the groove, fill, notches and ticks mirror; ← raises it; a push past the maximum nudges left |

## Don't use it for

- An exact number someone types (use a number field), a level nobody sets (use a meter), or one of a few named options (use a switcher).

## Anatomy

- The track: a track well, 6 / 10 / 14 tall for `compact` / `regular` / `large`; the fill: the green intent gradient at full strength up to the knob, deeper on bone so it stands at least 2:1 from the pale groove, with an inset hairline edge.
- The knob: 16 / 22 / 28, a knurled conic finish with a bright inner ring and a small drop shadow. Size sets the groove and the knob together.
- One travel: the groove is the full width; the knob's centre travels half a knob in from each end, so at the minimum and the maximum the knob sits flush inside the groove's rounded ends, never past them. The fill runs to the knob's centre, and marks and ticks sit on the same travel, so a tick, the fill's end and the knob line up at every value.
- Marks: notches cut across the groove (2 wide, the groove's full height), for steps, detents or moments. Only where there is a step or an event: never loose decoration.
- Ticks: a short line a gap under the groove and its label under that, in the meta type (11) at ink2, so labels read at 4.5:1 or better on the surface in both colorways. A host that engraves its own scale (the time scrubber) passes its own `Label` node, and in SwiftUI `tickStyle: .engraved`. With `ticks`, the slider reserves room for them below.
- Glyphs (optional): `startIcon` and `endIcon` at ink2, 14 / 16 / 18, a gap from the groove. Each plays its act when the value arrives at its end. For volume, `VolumeLowIcon` and `VolumeHighIcon` (`.volumeLow`, `.volumeHigh`); for brightness, `SunIcon` at the end. They are decorative; the knob carries the name and value.
- Value (optional): `showValue` writes the value beside the groove in the figure type with `format`. It keeps the width of its widest value (every step when there are 24 or fewer, else the two ends), so the groove never moves as it changes; the digits turn on the drum.
- Width: full width of its container by default; `width` sets it (a number is px, a string any CSS length). SwiftUI: frame it as any view; it fills the width it is given.
- Put the slider on a plain surface (a panel, a card) or give it clear space: a busy or dotted backdrop never runs through its labels.

## API

| React | SwiftUI |
|---|---|
| `value`, `min`, `max`, `onValueChange` | `value:` (a binding), `in:` |
| `value={[lo, hi]}` (a range) | `range:` (a `ClosedRange` binding) |
| `step` (1), `largeStep` (10) | `step:`, `largeStep:` |
| `size` (`compact`, `regular`, `large`) | `size:` (`.compact`, `.regular`, `.large`) |
| `orientation` (`horizontal`, `vertical`), `height` | `orientation:` (`.horizontal`, `.vertical`), `.frame(height:)` |
| `detents` | `detents:` |
| `origin` | `origin:` |
| `tone` (`green`, `ink`) | `tone:` (`.green`, `.ink`) |
| `bubble` | `bubble:` |
| `startIcon`, `endIcon` (a glyph node) | `startIcon:`, `endIcon:` (`MetalIconName`) |
| `showValue`, `format` | `showsValue:`, `valueText:` |
| `marks` (values), `ticks` (`{ value, label }[]`) | `marks:`, `ticks:` (fractions), `tickStyle:` |
| `width` (full by default) | `.frame(width:)` |
| `aria-label` | `label:` |
| `disabled` | `.disabled(true)` |
| parts: `Slider.Track`, `Slider.Marks`, `Slider.Ticks`, `Slider.Knob` | `onFocusChange:`, `onDragChange:`, `isExternallyDragging:` |

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the knurled face, a small drop shadow | – |
| hover (over the groove) | the knob lifts ×1.08, a longer shadow | settle spring |
| pressed, dragging | the knob presses ×0.94, a tight shadow; the fill follows the pointer 1:1 | settle spring; no spring on the value while dragging |
| focus (keyboard) | the green ring around the knob | – |
| disabled | the whole slider at 40 %; no pointer, no keys | – |
| refused (a key pushing past an end) | the groove and knob nudge one nest toward that end (left for the maximum in rtl, up when vertical) and ring back; the value stays | refusal spring |
| bubble (`bubble`, the knob being dragged) | the value on the tooltip's chip over the knob | settle spring in, and out on release |

- The knob's face grows away from the nearer end (its origin follows the value), so even lifted it never pokes past the groove; the refusal moves the groove with the knob, so the knob never leaves it.
- Reduce Motion: jumps land at once, the readout crossfades, the lift and press change at once, and nothing nudges.

## Keyboard and motion

- Arrows step (`step`), Shift + arrows step large (`largeStep`); Home / End go to the ends.
- A jump (a click on the track, a key) rides the part spring; a drag follows the pointer exactly. The knob and the fill ride one animated fraction, clamped to the travel, so a spring that overshoots stops flush at an end. Under Reduce Motion a jump lands at once and the readout crossfades.
- SwiftUI `onDragChange` reports drag start before the first value change and drag end after release. `isExternallyDragging` lets an offscreen host or controlled gesture suppress the jump spring during a scrub.
- Name the knob (`aria-label`) and give it a value text a person reads: `format` does both ("40%"); with parts, `getAriaValueText` on `Slider.Knob` ("THU 24 SEP · 14:10").

## Rules

- A jump springs, a drag does not (except with detents: the spring is the click).
- Green is an amount someone set; use `tone="ink"` for anything else.
- Detents are for a few stops you can feel (24 at most); with more, a plain slider.
- Give a bubbled vertical slider room on its left (its ticks keep their own room on its right).
- Marks and ticks mean something: a step, an event, a labelled value.
- Keep labels plain and readable, on a plain surface.
