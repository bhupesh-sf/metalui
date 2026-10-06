# Number field

A number you step, scrub or type. React: `NumberField` from `@unlocalhosted/metalui`, on Base UI NumberField. SwiftUI: `MetalNumberField`. The well is the `well` recipe's field look at the `field` recipe's sizes and radii, the keycaps are compact buttons concentric with it, and the `number-field` recipe adds the sizes, the unit and the inspector; the motion is the system's swap drum and refusal, and the changed mark, readback and error row are the form field's.

## Use it for

- A count or amount with small steps and a sensible range: copies, columns, a font size, minutes, an opacity.
- An inspector's numbers (X, Y, W, H, rotation): `kind="inspector"`.
- A value for several selected things at once: `mixed`.

## Don't use it for

- A value where the rough position matters more than the digits (use a slider), phone numbers or codes (use a field), or large free amounts (use a field with a unit).

## Anatomy

- Label (optional): ui type, ink, above, 6 apart; drag it sideways to scrub. The changed mark hangs 6 before it while the value is off its default.
- Group: the field well, at Field's sizes: large 44 (radius 17, pad 4, 168 wide), regular 32 (11, 3, 132), compact 28 (9, 3, 112).
- Keycaps: compact caps, square (36 / 26 / 22) with the well's radius less its pad, so they are concentric; − and + are the set's `minus` and `plus` glyphs without their tile (the keycap is the tile), and they play their act on press.
- Window: the value, centred, tabular figures (content type large, lead regular, ui compact), with the unit engraved 3 after it in ink3.
- Readback (while typing arithmetic): the form field's readback line under the group.
- Limit (soft limits): the form field's error ink in meta type under the group.
- Inspector: no keycaps; the letter or glyph engraved in ink3 at the well's start (pad 8, 6 to the value) is the scrub handle; 96 / 84 wide; the value starts at the left; the changed mark sits inside at the end.

## States and motion

| State | Look | Motion |
|---|---|---|
| step (+ / ↑) | the new value | the cap sinks and its glyph acts; the value turns one drum step up on the settle spring |
| step (− / ↓) | the new value | the drum turns down |
| hold | repeats | each step turns the drum |
| ⌥ or ⇧ held (over the field or in it) | the legends say the step: "−0.1" "+0.1", "−10" "+10" | the legends turn on the drum, and back when released |
| scrub | the label drags | the drum turns the way the value went |
| at a limit | that keycap disabled | – |
| past a limit (arrow or scrub) | unchanged | only the digits shake on the refusal spring |
| typing | the draft as typed | no drum; Enter or leaving commits, Esc puts the value back |
| arithmetic | "= 96 px" under the field | the readback row opens on settle; the result turns on its drum; on commit the value turns |
| not understood | unchanged | the digits shake |
| soft limit passed | the invalid ring; "Up to 100" under the field | the row opens on settle, closes on release once the value changes |
| off its default | the changed mark | pops in on settle, leaves on release |
| back to default | the default | the drum turns the way it went |
| mixed | "Mixed" in ink3, no unit | – |
| focus | the flush green ring on the group | – |
| invalid | the foundation's invalid ring; aria-invalid | – |
| disabled | 40 % | – |

Reduce Motion: the drum crossfades; nothing shakes; the rows snap.

## Typing

Typing is a draft the field reads itself; it commits on Enter or blur. It understands:

- a plain number in the field's locale ("1.200" in de-DE), with or without the format's own marks ("€", "%") or the `unit` ("12px", "50 %");
- arithmetic on the value: `+10`, `*2`, `/2` (a leading `-` is a negative number, not a subtraction);
- a new value worked out: `=8*12`, or just `8*12`; brackets work.

Arithmetic is read back under the field before it commits ("= 96 px", or "= 120 px · up to 100 px" when it will be clamped). Anything else is refused: the digits shake and the value stays. A percent `format` is read on its shown scale (typing 50 means 50 %).

## Variations

- **Sizes**: `size` large, regular (default), compact.
- **Fine and coarse**: ⌥ steps by `smallStep` (Base UI's default 0.1), ⇧ by `largeStep` (10), on the keycaps, arrows and scrub. Give a whole count `smallStep={1}`: a step equal to `step` shows no legend.
- **Unit**: `unit` ("px", "%", "°"); `format` and `locale` for currency and grouping.
- **Soft limits**: `allowOutOfRange`. A typed value past a limit is kept and invalid; the keys and the scrub still clamp.
- **Back to default**: give `defaultValue` (it is the reset target even when `value` is controlled). Double-click the label (or the inspector's letter), or ⌘-click (Ctrl-click) a keycap. The changed mark shows while the value differs; a screen reader hears "Font size off its default".
- **Mixed**: `mixed` with `value={null}`. A step calls `onStep(amount)` (signed, with the modifier's step); add it to each item from its own value and keep `mixed` while they still differ. Typing (or Home / End) calls `onValueChange` with one value for all.
- **Inspector**: `kind="inspector"` with a one-letter `label` and an `aria-label` ("W", "Width"). Regular or compact (large falls back to regular).
- **Wheel**: `allowWheelScrub`: the wheel steps the value only while the field has focus, so scrolling the page never changes it.

## API

| React | SwiftUI |
|---|---|
| `value`, `defaultValue`, `onValueChange`, `onValueCommitted` | `value:` (`Double?`), `default:` |
| `min`, `max`, `step`, `smallStep` (⌥), `largeStep` (⇧) | `in:`, `step:`, `smallStep:`, `largeStep:` |
| `size` | `size:` (`MetalFieldSize`) |
| `kind` | `kind:` (`.stepper`, `.inspector`) |
| `unit`, `format`, `locale` | `unit:`, `format:` (`FloatingPointFormatStyle<Double>`) |
| `allowOutOfRange` | `softLimits:` |
| `mixed`, `onStep` | `mixed:`, `onStep:` |
| `allowWheelScrub` | `wheel:` |
| `label`, `aria-label`, `decrementLabel`, `incrementLabel` | `label:`, `letter:` |
| `invalid`, `disabled`, `readOnly`, `required`, `name` | `invalid:`, `.disabled()` |

## Keyboard and accessibility

- The input is a text input described as "Number field" (Base UI): ↑ ↓ step, ⇧ by the large step, ⌥ by the small one, Home and End go to the limits; Enter commits a draft and Esc drops it. The keycaps are named "Decrease" and "Increase" and are skipped by Tab.
- `label` names the input (aria-labelledby); without it, or in the inspector, pass `aria-label`.
- The readback and the limit line describe the input (aria-describedby) while they show.
- Back to default has no key of its own: type the default, or use the label or a keycap.

## Thumbwheel: prototyped, not shipped

The docs page holds a thumbwheel prototype (a detented wheel standing out of the well's end, one detent per step, a heavier one per large step, a haptic per detent) beside a scrubbed field. It does not read better than scrubbing: the wheel is a second gesture (vertical) for the same job the label's scrub (horizontal) already does, it is 18 wide so it is hard to find and hit, its detents are only felt where there are haptics (not in a Mac or PC browser), and it gives up the keycaps' discoverable steps. It stays a prototype; revisit it only for a hardware-like block where a wheel is the whole control.

## Rules

- Give it a range. A number field without limits is a text field.
- The drum turns the way the number went: up for more, down for less.
- A refusal moves only the digits.
- A modifier that changes the step changes the legends while it is held.
- The unit is engraved in the well, never typed into the value and never printed outside it.
