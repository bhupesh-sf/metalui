# Rating

How good something is, on a short scale. React: `Rating` from `@unlocalhosted/metalui`, on Base UI RadioGroup. SwiftUI: `MetalRating`. Not stars: the slider's groove cut into one detent per point (the meter's segments), filled with the slider's green, the colour of an amount someone set. The `rating` recipe holds the sizes, the ghost and the press; the sweep's stagger and fade are the meter's. A component: you operate it to change the rating stored for an item.

## Use it for

- Showing an average at a glance: a product, an app, a place (`readOnly`, with `count`).
- Giving your own rating: a review form, a song or a photo in a list.

## Don't use it for

- More than 10 points, or a value you set by feel: use `Slider`.
- A choice between moods or kinds (faces, thumbs): use `RadioGroup` or `RadioKeys`.
- A level that can be a problem (storage, battery): use `Meter`.

## Anatomy

- Detents: `max` (5) short pills in the well's groove, the slider's green inside when lit. Sizes: compact (18 × 6 in a 28 row), regular (22 × 8 in 32), large (28 × 10 in 44). Each detent's hit area is the row's height and runs into its neighbour's: no dead gap.
- Readout (`showValue`, default true): the value beside the detents in the figure type; read-only to one decimal ("4.3"), editable the number or its word from `labels`, "Not rated" (`emptyLabel`) with none. It turns on the drum.
- Count (`count`, read-only): "(1,284)" in meta type, ink3, grouped by the locale.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | lit up to the value; a read-only decimal fills that share of its detent, cut square | – |
| hover (editable) | the detents a press would change at the ghost (38 %) of their lit look; the readout says the value under the pointer, or "Not rated" over the chosen one | the drum turns |
| press | the detent dips to 0.86 | part spring |
| change | the new run | one detent every 16 ms from the old edge, each fading 90 ms (the meter's sweep) |
| clear | the run goes dark; "Not rated" | the same sweep |
| focus | the green ring on the focused detent (keyboard only) | – |
| disabled | 40 %, no hover, no press | – |

Reduce Motion: detents change at once and don't dip; the drum crossfades.

## API

| React | SwiftUI |
|---|---|
| `value` / `defaultValue` (number or null) / `onValueChange` | `MetalRating(value: Binding<Int?>, …)` |
| `readOnly` (any decimal in `value`), `count` | `MetalRating(rating: Double, count:, …)` |
| `max` (5), `labels`, `emptyLabel`, `showValue`, `size` (compact, regular, large) | `max:`, `labels:`, `emptyLabel:`, `showsValue:`, `size:` |
| `disabled`, `name`, `required`, `aria-label` | `.disabled(_:)`, `label:` |

## Keyboard and accessibility

- Editable: a radio group (name it with `aria-label`); each detent is a radio said "4 of 5" (with its word: "4 of 5, Very good"). One Tab stop; ← → ↑ ↓ move and choose. Backspace or Delete clears; so does Space or a press on the chosen detent.
- Read-only: one `role="img"` with the whole sentence ("Average, 4.3 out of 5, 1,284 ratings"); its parts are hidden, so it is heard once.
- Colour never carries it alone: the readout says the value.

## Rules

- One colour for every value: a low rating is not a fault, so no amber or red.
- Keep the scale countable: 10 points at most.
- Show the count beside an average; an average of three ratings reads differently from one of three thousand.
