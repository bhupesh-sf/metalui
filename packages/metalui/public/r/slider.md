# Slider

A value on a track. React: `Slider` with parts `Slider.Root` (value, min, max, step, largeStep, onValueChange), `Slider.Track`, `Slider.Marks` (fractions), `Slider.Ticks` (labelled), `Slider.Knob`. SwiftUI: `MetalSlider(value:in:) { marks: … ticks: … }`.

## Anatomy

- The track: a 10 tall track well; the fill: the green intent gradient at 55 % up to the knob.
- Marks: 2 × 4 ticks along the track; ticks: labels under it with a short tick line each.
- The knob: 22, a knurled conic finish with a bright inner ring and a small drop shadow.
- One travel: the groove is the full width; the knob's centre travels half a knob in from each end, so at the minimum and the maximum the knob sits flush inside the groove's rounded ends, never past them. The fill runs to the knob's centre, and marks and ticks (fractions 0…1) sit on the same travel, so a tick, the fill's end and the knob line up at every value.

## Keyboard and motion

- Arrows step (`step`), Shift + arrows step large (`largeStep`); Home / End go to the ends.
- A jump (a click on the track, a key) rides the part spring; a drag follows the pointer exactly. The knob and the fill ride one animated fraction, clamped to the travel, so a spring that overshoots stops flush at an end. Under Reduce Motion a jump lands at once.
- SwiftUI `onDragChange` reports drag start before the first value change and drag end after release. `isExternallyDragging` lets an offscreen host or controlled gesture suppress the jump spring during a scrub.
- Name the knob (`aria-label`) and give it a value text (`getAriaValueText`) a person reads ("THU 24 SEP · 14:10").
