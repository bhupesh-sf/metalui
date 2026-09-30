# Slider

A value on a track. React: `Slider` with parts `Slider.Root` (value, min, max, step, largeStep, onValueChange), `Slider.Track`, `Slider.Marks` (fractions), `Slider.Ticks` (labelled), `Slider.Knob`. SwiftUI: `MetalSlider(value:in:step:largeStep:marks:ticks:tickStyle:label:valueText:)`.

## Anatomy

- The track: a 10 tall track well; the fill: the green intent gradient at full strength up to the knob, deeper on bone so it stands at least 2:1 from the pale groove, with an inset hairline edge.
- Marks: notches cut across the groove (2 wide, the groove's full height), for steps, detents or moments. Only where there is a step or an event: never loose decoration.
- Ticks: a short line a gap under the groove and its label under that, in the meta type (11) at ink2, so labels read at 4.5:1 or better on the surface in both colorways. A host that engraves its own scale (the time scrubber) passes its own `Label` node, and in SwiftUI `tickStyle: .engraved`.
- Put the slider on a plain surface (a panel, a card) or give it clear space: a busy or dotted backdrop never runs through its labels.
- The knob: 22, a knurled conic finish with a bright inner ring and a small drop shadow.
- One travel: the groove is the full width; the knob's centre travels half a knob in from each end, so at the minimum and the maximum the knob sits flush inside the groove's rounded ends, never past them. The fill runs to the knob's centre, and marks and ticks (fractions 0…1) sit on the same travel, so a tick, the fill's end and the knob line up at every value.

## Keyboard and motion

- Arrows step (`step`), Shift + arrows step large (`largeStep`); Home / End go to the ends.
- A jump (a click on the track, a key) rides the part spring; a drag follows the pointer exactly. The knob and the fill ride one animated fraction, clamped to the travel, so a spring that overshoots stops flush at an end. Under Reduce Motion a jump lands at once.
- SwiftUI `onDragChange` reports drag start before the first value change and drag end after release. `isExternallyDragging` lets an offscreen host or controlled gesture suppress the jump spring during a scrub.
- Name the knob (`aria-label`) and give it a value text (`getAriaValueText`) a person reads ("THU 24 SEP · 14:10").
