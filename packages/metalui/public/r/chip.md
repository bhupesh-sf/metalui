# Chip

A small pill. React: `Chip` with parts `Chip.Root`, `Chip.Lead`, `Chip.Text`, `Chip.Actions`. SwiftUI: `MetalChip { lead: … text: … actions: … }`.

## Variants

- `suggestion`: 20 tall, frosted, a green hairline and a small raise; a question in `Chip.Text`, a confidence `Label`, and `IconButton variant="mini"` actions (✓ accept, × dismiss).
- `glass`: an 18 tall tag on a glass screen in the colorway (light on Bone, dark on Graphite), backdrop-blurred; `Chip.Lead led` for its LED: the LED part's lamp (socket, glow) at 5 pt, in one of its kinds (`link` for a link's kind, `off` for a kind with no state, as the code card's tag). No other colours.
- `glass-action`: an 18 tall light cap on glass (`as="a"` for a link out), brighter on hover.
- `tag`: a 15 tall engraved mono tag in a hairline pill (a derived #tag); no fill.

## Behaviour

- The chip itself is not a control; its actions are. A `glass-action` rendered `as="a"` is a link: give it `href`, `target="_blank"` and `rel="noopener noreferrer"`.

## Waiting

- `waiting` (useWait's `busy`): the chip is held and dims except the part holding a `Spinner`; put `<Spinner size="small" phase={wait.phase}>` around its glyph as a direct child (not inside `Chip.Lead`, which is hidden from assistive tech, so the ring's status is heard).
