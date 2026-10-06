# Properties

Label and value pairs. React: `Properties` from `@unlocalhosted/metalui`. SwiftUI: `MetalProperties`. A part: a `<dl>` with the `label`'s engraving and the `rule`'s hairline; the `properties` recipe adds the sizes and the narrow stack.

## Use it for

- One thing's details: a receipt, a details panel beside a table, a spec sheet, the fields of an opened row.

## Don't use it for

- Many things with the same fields (use `Table`), or values someone edits (use form fields).

## Anatomy

- `Properties.Root` (`Properties`): a `dl` in two columns: labels as wide as the longest (up to 200), values in the rest.
- `Properties.Item`: one pair: `label` (a `dt`, engraved) and its value (a `dd`, ui type, ink, tabular figures).
- Each pair is parted by a hairline; the last is open.
- Values: text, or a `TableCell` in its kind's look (status, person, code, currency, date), so a details panel reads like the table it came from. A missing value is "—" in ink3.

## Sizes

| Size | Pair height | Padding | Gap |
|---|---|---|---|
| regular | at least 32 | 6 | 16 |
| compact | at least 24 | 3 | 12 |

Under 280 wide (its own container, `@container/properties`) the label stands above its value.

## States and motion

None: it is still.

## API

| React | SwiftUI |
|---|---|
| `Properties` `size` | `MetalProperties(size:) { … }` |
| `Properties.Item` `label`, children | `MetalProperty(_ label:) { value }` |

## Keyboard and accessibility

- A real description list: assistive tech reads each label with its value. Nothing in it takes focus unless a value does (a copy key in a code value).

## Rules

- Labels are nouns, short ("Due", "Owner"); put a unit in the label ("Amount (€)") as a table does in its header.
- Keep the order the table uses for the same thing.
