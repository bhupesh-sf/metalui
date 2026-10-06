# Badge

One short fact about a thing: its kind, its version, its state, or how many are waiting. React: `Badge` and `Badge.Anchor` from `@unlocalhosted/metalui`. SwiftUI: `MetalBadge` and the `.metalBadge(count:)` modifier.

## Use it for

- A kind, a version or a role beside a name: `Beta`, `v2.4`, `Admin`, `Draft`.
- A thing's state in a row or a card, with its LED: `<Badge led="failed">Build failed</Badge>`.
- A count after a label: a tab's `Inbox 12`, a nav row, a group header.
- A count on another control's corner (a notification badge): `<Badge.Anchor count={3}><IconButton label="Inbox, 3 unread" … /></Badge.Anchor>`.

## Don't use it for

- The system's own state (sync, connection, a service): that is `StatusBadge`, which is announced when it changes and carries the fix as its hint.
- Something you remove or act on (a chosen value, a filter token, a suggestion): that is a `Chip` with `Chip.Actions` and `IconButton variant="mini"`.
- A link. A badge is not pressable; use `Link`.
- Colour for meaning. There are no tones: a state is the LED plus words.

## Badge, Chip or StatusBadge

Does it describe a thing (Badge), do you act on it (Chip), or is the system speaking (StatusBadge)?

## Anatomy

- **Stamp**: a pill cut shallow into the surface (the well's light at 18 tall: a 1 px inset shade, a .5 px hairline, a light lip under it). Never raised: raised at this size is a keycap or a status plate.
- **Words**: the engraved mono, uppercase, ink2 with the engraved lip. Regular 9.5 px / .08em; compact 8.5 px / .09em.
- **Lead** (one, optional): the LED part (6 regular, 4 compact) or a glyph (11 regular, 10 compact) in ink2.
- **Count**: the readout type, tabular (10.5 regular, 9 compact); min width equals the height, so one digit is a circle.
- **Sizes**: `regular` 18 tall (pad 7, gap 4) beside ui and body text; `compact` 15 (pad 5, gap 3) beside meta text, in dense rows and on corners. They follow the type, not the field ladder.
- **Corner cap** (`Badge.Anchor`): a compact count drawn in the other colorway (a graphite cap with light digits on Bone, a bone cap with dark digits on Graphite), ringed 1.5 in the surface colour, 5 past the control's top-right corner.

## Behaviour and motion

- A count turns on the drum (`SwapText`) when it changes: up as it grows, down as it shrinks; the footprint settles to the new width. Past `max` (99) it reads `99+`.
- The LED holds steady. When `led` changes after the first paint (queued → running → failed) it plays `flicker` once and settles lit; never on first paint, so a page of rows doesn't flicker on load.
- The corner cap comes in from 60 % on the object spring when the count leaves zero, and goes on the release spring at zero, keeping its last number as it leaves. It never shows `0`.
- Reduce Motion: the drum crossfades, the lamp changes at once, the cap fades without scaling.

## API

| React | SwiftUI |
|---|---|
| `Badge` children (words) | `MetalBadge(_ text:)` |
| `led` (`live`, `waiting`, `failed`, `link`, `off`) | `led:` (`MetalLEDKind`) |
| `glyph` (a node, usually `<Icon animate={false} />`) | `glyph:` (`MetalIconName`) |
| `count`, `max` (99), `label` | `MetalBadge(count:max:label:)` |
| `size` (`regular`, `compact`) | `size:` (`.regular`, `.compact`) |
| `Badge.Anchor count max` + children | `.metalBadge(count:max:)` |

## Rules

- Words are short: one to three words, a version, a role. A sentence is a `Label` or a notice.
- One lead: an LED or a glyph, not both.
- LED colours keep the library's meanings: green live, amber waiting or urgent, red failed, blue a link's kind, off idle; the words always say the state.
- In a table, a badge sits in its own column so the stamps line up.
- A corner count goes on a control whose label already says the number.

## Accessibility

- A plain `span`: read in place, not announced (fifty rows of live regions would talk over each other). For a state the person must hear about as it happens, use `StatusBadge`.
- The LED and the glyph are hidden; the words carry the state.
- A count reads `label` when given ("3 unread"), the number otherwise; the drum's faces are hidden so the number is read once.
- The corner cap is hidden from assistive tech: say the count in the control's own label ("Inbox, 3 unread"), because a "3" after a button names nothing.

## Tokens

`recipes.badge`: `recipe-badge` (the stamp), `recipe-badge-corner` (the cap), `type-badge-regular`, `type-badge-compact`, `type-badge-count`, `type-badge-count-compact`, `h-badge-*-height`, `badge-corner-ring`, `badge-corner-motion`, `text-badge-corner-ink`; the words' lip is `recipe-label-engraved`. Swift: `MetalRecipes.badge`.
