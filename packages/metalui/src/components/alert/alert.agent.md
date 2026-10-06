# Alert

An inline message about this place: top of a form, inside a card, along the top of a page. React: `Alert` (`Alert.Root`, `Alert.Title`, `Alert.Description`, `Alert.Actions`) from `@unlocalhosted/metalui`. SwiftUI: `MetalAlert`. Sheet: `docs/sheets/alert.md`.

## Use it for

- A form that couldn't save, said above its first field (each field still carries its own error).
- A card or panel whose source is offline, or whose import is under way.
- One banner along the top of a page: a plan running out, a read-only copy.

## Don't use it for

- The result of the person's own action ("Moved 3 notes"): a **toast** (floats, leaves by itself, carries Undo).
- A lasting system state in three words with nothing to do: a **status badge**.
- A question the page can't go on without: an **alert dialog**.
- An empty place: an **empty state**.

## Kinds

Each kind is carried by the glyph's shape, the title's words and the lamp's gesture; colour is never the only cue.

| `kind` | Means | Glyph | Lamp | Read out |
|---|---|---|---|---|
| `note` (default) | worth knowing, nothing is wrong | info | none | politely (`status`) |
| `done` | finished well | check | green, steady | politely |
| `waiting` | under way; it will update | clock | amber, breathing | politely |
| `urgent` | act soon or something goes wrong | warning | amber, steady | at once (`alert`) |
| `failed` | failed or refused | sync-error | red, two blinks, then lit | at once |

No blue: blue is a link's kind.

## Tones and placement

| | Look | Use it |
|---|---|---|
| `tone="plate"` (default) | the status badge's raised plate, radius 16 | top of a form, on the page |
| `tone="quiet"` | no plate | inside a card or panel (one plate is enough) |
| `tone="strong"` | the plate tinted in the kind's ink; title and glyph in its deep ink | one alert per view that must be seen |
| `banner` | square ends, spanning its container, padding 20 at the sides | one per page, along its top |
| `solid` | the badge's 1 pt keyline round the plate | on frost, glass or an image; Reduce Transparency turns it on, and a quiet alert takes its plate back |

Strong on `note` is a plate.

## Anatomy

A 28 sunk window (the field well, radius 9) holding the 16 glyph, the kind's LED seated in its top right corner; 12 to the words; a title (title type, 13.5 / 600) and a description (body type, ink2), 2 apart, the title centred on the window's middle line; actions (compact Buttons, 8 apart) beside the words from 480 wide (a container query on the alert, not the viewport) and 10 under them when narrower; the close key (ghost IconButton, 28) at the end. Padding 14.

## Over time

- **Arrives** rising one nest from below, fading in, on the settle spring (T9).
- **Updates in place**: change `kind` and the glyph morphs (clock → check) while the new lamp plays its gesture from the start; change the words where they are. A count that ticks ("3 of 12") goes in `SwapText`, so it turns on the drum.
- **Resolves**: the host turns `waiting` into `done` or `failed`; the alert stays where the person was looking.
- **Dismissed**: with `onDismiss`, the close key or Esc inside the alert plays the leave (one nest down, fading, release spring), then calls `onDismiss`; remove it there. Without `onDismiss` it can't be dismissed: an error that's still true stays.
- It never leaves by itself: a message in the flow that vanishes moves the page under the reader.
- Reduce Motion: it fades in without travel, goes at once, and the glyph changes in place.

## API

| React | SwiftUI |
|---|---|
| `Alert.Root kind tone banner solid onDismiss dismissLabel` | `MetalAlert(kind:tone:banner:solid:title:description:onDismiss:actions:)` |
| `Alert.Title` | `title:` |
| `Alert.Description` | `description:` |
| `Alert.Actions` | `actions:` (`@ViewBuilder`) |

`Alert` itself is `Alert.Root`.

## Rules

- The title says the kind in words ("Couldn't save the plan", not "Error").
- The fix is an action in the alert, the one that fixes it first; at most two.
- One strong alert per view; one banner per page.
- When a dismissed alert held focus, move focus somewhere sensible in `onDismiss` (the field it was about, or the form).

## Accessibility

- `failed` and `urgent` are `role="alert"`; the others `role="status"`. The glyph and lamp are decorative (`aria-hidden`); the title carries the meaning.
- The close key is a real button named "Dismiss" (`dismissLabel`); Esc anywhere inside the alert does the same.

## Tokens

`recipes.alert` (`p-alert-pad`, `gap-x-alert-gap`, `size-alert-window-size`, `alert-body`, `alert-arrive`), the status recipe's plates and inks (`recipe-status-badge`, `recipe-status-badge-strong-<kind>`, `text-status-strong-ink-<kind>`, `outline-status-badge-keyline`), `recipe-well-field`. Swift: `MetalRecipes.alert`, `MetalRecipes.status`.
