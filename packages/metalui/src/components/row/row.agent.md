# Row

A row in a list. React: `Row` with parts `Row.Root`, `Row.Lead`, `Row.Text`, `Row.Trail`. SwiftUI: `MetalRow { lead: … text: … trail: … }`.

## Variants

- `list`: a compact row of a pinned query: 5 / 8 padding, radius 12, 13 pt; hover and focus raise it.
- `panel`: a row of a gathered panel: 8 / 12 padding, radius 14, 14 pt; hover and focus raise it.
- `option`: a palette row, 36 tall, radius 12; the active row (`active`, or Base UI's `data-highlighted`) raises with a 2.5 green rail at its left edge.

## States

- `checked`: `Row.Text` is struck through in ink3. `maybe`: a weak match at 55 %.
- `selected` (any variant): a picked row, one of several (a task in a multi-select): the option's raised plate, held through hover. Visual only: set `aria-selected` yourself where the row's role allows it (`row`, `option`).
- `opened` (any variant): the row whose detail is showing: the 2.5 green rail at its left edge, without the raise.

## Keyboard and accessibility

- The host gives the row its role (`listitem`, `option`, `row`) and makes it focusable when it acts; focus shows the same raise as hover.

## Waiting

- `waiting` (useWait's `busy`): the row is held (aria-busy, no pointer) and every part but the one holding a `Spinner` dims. Put `<Spinner phase={wait.phase}>` around the row's glyph so the ring stands in for it after the show delay and draws a tick when done (spinner.agent.md, "On a small item").
