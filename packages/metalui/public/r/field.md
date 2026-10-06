# Field and search field

React: `Field` with parts `Field.Root`, `Field.Icon`, `Field.Prefix`, `Field.Input`, `Field.Suffix`, `Field.Trail`, `Field.Key`, `Field.Clear`, `Field.Copy`, `Field.Reveal`, `Field.Shortcut`, `Field.Check`; `SearchField`. SwiftUI: `MetalField("Website", text: $url, size: .regular, prefix: "https://", clear: true) { MetalFieldKey(…) }`, `MetalFieldKey`, `MetalSearchField`.

## Field

- Three sizes (`size`): `large` (the default: 44 tall, radius 17, a 15 glyph, the input in 15 pt; the palette's field), and the form sizes `regular` (32, radius 11, 14 glyph, ui type) and `compact` (28, radius 9, 12 glyph), which line up with the select.
- A hint in ink3, a green caret.
- `invalid`: the foundation's invalid ring on the well, and `aria-invalid` on the input. `disabled`: 40 %, and the input is disabled. Inside a `FormField` both come from the field.
- `Field.Input` is Base UI's field control; pass it as a Base UI combobox input's `render` to join a listbox.

## Fixed parts of the value

- `Field.Prefix` / `Field.Suffix`: "https://", "$", "kg", ".com". Engraved in ink3 (with the lip) on the well's floor, in the input's type so they sit on its baseline. Not selectable and not part of the value: the input holds only what was typed.
- Pressing one puts the caret in the input, at the start for a prefix and at the end for a suffix, without blurring it (a blur would check the value).
- They describe the input (`aria-describedby`), so a screen reader hears "Website, https://, .metalui.dev".
- A suffix sits at the well's end, before the counter and the keys, whatever order it is written in.

## Keys inside the field

`Field.Trail` holds mini keys and takes any node (a keycap, a working ring). The documented set:

| Key | React | Does |
|---|---|---|
| clear | `<Field.Clear icon={<Icon name="close" />} />` | shows while there is text; empties it (a controlled host hears `onChange` with "") and keeps the caret |
| shortcut | `<Field.Shortcut keys="⌘K" />` | a keycap that focuses the field from anywhere (⌘ also answers to Ctrl; `bind={false}` when the host binds it); it turns on the drum to "Esc" while the field is active; Esc clears the text, or leaves the field when it is empty. The input gets `aria-keyshortcuts` |
| check | `<Field.Check shown={free} label="Name available"><Icon name="check" act /></Field.Check>` | a remote check that passed: the tick arrives acting, in the deep green, and is said once (`role="status"`). Ordinary valid fields show nothing |
| any | `<Field.Key label="…" icon={…} onClick={…} />` | a mini key of your own; `shown` makes it come and go |
| copy | `<Field.Copy icon={<Icon name="copy" />} copiedIcon={<Icon name="check" />} />` | shows while there is text (or always, with `value`); copies the value, and its glyph turns on the drum to the check for the recipe's `copy.hold` (1400 ms, Table's), then back. Not a morph: copy → check strains 2.38, past the family's limit. "Copied" is said once (`role="status"`, `copiedLabel`) |
| show password | `<Field.Reveal icon={<MorphIcon name="eye" />} hideIcon={<MorphIcon name="eye-off" />} />` | makes the input `type="password"`; pressing it shows the text (`type="text"`) and back. It is a toggle named "Show password" (`label`) with `aria-pressed`, so assistive tech says whether the text shows. Pass the same component for both glyphs: React keeps the element and `MorphIcon` morphs eye ↔ eye-off |

- A key is a compact button cap, 20 round with a 12 glyph and a 24 hit area, as far from the well's edge as from its top and bottom in every size. Pressing one keeps focus in the input. Glyphs come from the host (`@unlocalhosted/metalui/icons`), so `Field` never ships the icon catalogue.
- A key that comes and goes pops in from 60 % on the settle spring and leaves on the release spring, keeping its place so the trail never shifts. A field that loads with text shows its clear key at rest (no pop on load).

## How much to type

- `maxLength` on `Field.Input`: Textarea's counter, in the trail (meta type, tabular, ink3). It fades in at Textarea's share of the limit (`countFrom`, 0.8), turns red at the limit, and typing or pasting past it shakes only the counter on the refusal spring; a screen reader hears "Limit reached" once. It describes the input.
- `chars` on the root: the input is that many characters wide in its own font (plus 2 for the caret) and the well hugs it. Use it for short values of a known length: a postcode (8), a year (4), a card check (3). Prefer it to a width class: it follows the size's type and says what goes in the box.

## Search field

- A button, not an input: it opens search (a palette). 38 tall (radius 15) with a 14 glyph, the placeholder and a keycap (`⌘K`); graphite in a dark strip, light elsewhere.

## Keyboard and accessibility

- Field: the input takes focus. At the large size (a palette, where the field always has focus) the caret is the focus; the form sizes show the flush green ring. Name the input with a visible label (`FormField.Label`) or `aria-label`; say why a value is invalid in text near it. Keys are buttons with names; Tab reaches them after the input. Search field: a button with `aria-keyshortcuts`, the green ring on focus.

## Reduce Motion

Keys fade without the pop, the shortcut's drum crossfades, and the counter does not shake (it still turns red).

## SwiftUI

`MetalField` draws the same well, sizes, caret, prefix and suffix, counter (trimming past `limit` and shaking), `chars`, `clear`, `copy` (the pasteboard; the glyph replaces to the check for `copy.hold` and "Copied" is announced), `secure` (a `SecureField` with a show-password key whose eye replaces to eye-off; the key's value says "Shown" or "Hidden"), `shortcut` (a key equivalent; Esc clears or leaves), `check`, and any `MetalFieldKey` in `trail`. Inside a `MetalFormField` with an error it draws the invalid ring.
