# LED and status badge

A lamp for a state, and a badge that names it. React: `Led`, `StatusBadge` from `@unlocalhosted/metalui`. SwiftUI: `MetalLED`, `MetalStatusBadge`. Sheet reference: KAMUI-16.

## Use it for

- `Led`: beside words that name a state (a badge, a readout, an engraving, a glass tag). Green live or ok, amber waiting or urgent, red failed, blue a link kind, off idle.
- `StatusBadge`: a system state in a corner or a row: `SYNC LIVE`, `SYNCING`, `SYNC OFFLINE · ADD KEY TO KEYCHAIN`, with the command that fixes it as its hint.

## Don't use it for

- Buttons or toggles. A badge is not pressable; a latched tool has its own LED inside the tool button.
- Colour alone. An LED always sits beside words.
- Success or warning banners. Use a toast (success always carries a check) or a notice.

## Not colour alone

Each state has three cues: the lamp's colour, its gesture and the words. The badge plays the state's own gesture unless you pass one: live steady, waiting breathe (while it lasts), failed blink2 (once, then lit), link steady, off steady and dark. Amber that means urgent rather than in progress passes `gesture="steady"`.

## Tones

| Tone | Look | Use it for |
|---|---|---|
| plate (default) | a raised pill with a defined edge (hairline and contact shadow) | most places |
| quiet | the lamp and the words, no plate | dense places on an opaque ground: tables, lists |
| strong | a plate tinted in the state's ink, the words in a deep ink of the same hue | one alert that has to be seen |

Strong on `off` is a plate.

## Transparent mode

A status part on a ground that lets what is behind show through: frost, glass, an image, a video. The lamp needs nothing (its socket is its ground). The badge is `solid`: its plate stays opaque with a 1 pt keyline round the edge, and a quiet badge takes its plate back. Pass `solid` on such grounds; Reduce Transparency (and low power) turns it on everywhere.

## Anatomy

- **LED**: a 6 pt lens (4 small) in a 1 pt dark socket with a light lip; a lit lamp has a halo in its ink.
- **Badge**: 26 tall pill, padding 11 at the ends, gap 7: the LED, then the state in mono 10.5 / 500, tracking .06em, uppercase, ink2 (strong: the state's deep ink).

## API

| React | SwiftUI |
|---|---|
| `Led kind size gesture` | `MetalLED(_:size:gesture:)` |
| `StatusBadge led hint tone solid gesture` + children | `MetalStatusBadge(_:led:hint:tone:solid:gesture:)` |

## Rules

- One LED per object. Its colour means what the list above says, nothing else; no new colours.
- The badge text is the state, short, uppercase; the fix is the hint, never the label.
- On a see-through ground the badge is solid; a quiet badge never sits there without its plate.
- One strong badge in a view.

## Accessibility

- The badge is a `status` region (announced when it changes). With a hint it is focusable, and the hint is its description and a tooltip on hover and focus.
- LEDs are decorative (`aria-hidden`): the words carry the state. The lit inks stay apart under simulated deuteranopia and protanopia (ΔE00 ≥ 20 for every pair).
- Reduce Motion holds every lamp lit; Reduce Transparency makes every badge solid.

## Tokens

`recipes.status` (`recipe-status-led-<kind>`, `recipe-status-badge`, `recipe-status-badge-strong-<kind>`, `text-status-strong-ink-<kind>`, `outline-status-badge-keyline`), `type-status-badge`, `status.gestures`. Swift: `MetalRecipes.status`.
