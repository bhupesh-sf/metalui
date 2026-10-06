# Signature pad

A form field that captures a signature. React: `SignaturePad` from `@unlocalhosted/metalui`; its value posts through Base UI Field, so `FormField` gives it a label, description and error. SwiftUI: `MetalSignaturePad`. The paper is the field's well with an engraved baseline (the rule's groove) and "Sign here"; ink is the text's ink, sized by the pen and settled on lift. The `signature-pad` recipe holds the sizes, the ink's width range and the settle. A component: you operate it to change the value a form sends.

## Use it for

- A signature or initials a flow asks for: a delivery, a receipt, an agreement, a consent form.
- Showing a signature already given (`readOnly`): proof of delivery on a record.

## Don't use it for

- Drawing or notes on a canvas: use the draw tools (`DrawPicks`, `BrushCursor`).
- Proving who someone is. The pad captures a mark; identity, intent and the record of who, when and what come from the flow around it. Never label a pad, or its result, "legally binding" or "valid": the component can't know.

## Anatomy

- Paper: the field well, as wide as its container; regular 160 tall (a signature), compact 88 (initials, `size="compact"`).
- Baseline: an engraved groove across the lower part (46 from the bottom, 26 compact), inset by the side pad (22, 14).
- Hint: "Sign here" (`hint`) engraved under the baseline's left end; it fades once there is ink.
- Ink: one filled outline per stroke, its width from `minWidth` to `maxWidth` (1.2 to 3.6), tapered at both ends.
- Typed: in type mode, an input on the baseline in the typed font (500 26 sans), ink on the line; placeholder "Type your full name".
- Keys, under the paper: Type instead / Draw instead (a link cap), Undo and Redo (ghost glyph keys, draw mode only), Clear (a compact cap). Compact: glyph keys only (text or pen, Undo, Clear as the eraser; Redo by keyboard). Read-only has none.
- Invalid: the paper wears the invalid ring while the form field refuses it.

## States and motion

| State | Look | Motion |
|---|---|---|
| empty | baseline and hint; Clear and Undo off | – |
| drawing | the raw line under the pen, width from pressure (a pen) or speed | none: the ink is exactly under the pen |
| lift | the levelled stroke replaces the raw one | cross-fade on the settle spring |
| inked | the hint gone; Clear and Undo on | hint fades on the settle spring |
| typed | the name on the baseline | – |
| invalid | the form field's error under the pad | the error's own row |
| read-only | the mark; no hint, no keys | – |
| disabled | 40 %, no ink, keys off | – |

Reduce Motion: the settle and the hint swap at once.

## API

| React | SwiftUI |
|---|---|
| `defaultValue` (`Signature` or null), `onValueChange(Signature \| null)`; reset with `key` | `MetalSignaturePad(signature: Binding<MetalSignature?>, …)` |
| `mode` / `defaultMode` (`draw`, `type`) / `onModeChange` | `mode:` (draw, type) |
| `sizing` (`auto`, `pressure`, `velocity`), `minWidth`, `maxWidth` | `minWidth:`, `maxWidth:` (width from speed: SwiftUI's drag has no pressure) |
| `name`, `required`, `disabled`, `readOnly` | `.disabled(_:)`, `readOnly:` |
| `size` (`regular`, `compact`), `hint`, `aria-label` | `size:`, `hint:`, `label:` |
| `signatureToSvg(value, { ink })`, `signatureToImage(value, { type, scale, background, quality })`, `strokeOutline(points)` | `MetalSignature.svg(ink:)` |

The value:

- Drawn: `{ kind: 'drawn', strokes, width, height }`. `strokes` is the strokes as JSON: each a list of `[x, y, width]` in the pad's box (`width` × `height`, the paper's size when the first mark was made), rounded to 0.1.
- Typed: `{ kind: 'typed', name, width, height, x, y, font }`: the name set on the baseline at (x, y) in `font`.
- The form posts SVG markup under `name` (dark ink, the pad's box as its viewBox). Export a PNG or JPEG with `signatureToImage`; it draws on a canvas, so a typed name keeps the page's loaded font.

## Keyboard and accessibility

- The paper is one image, said with its state: "Signature, empty", "Signature, drawn, 3 strokes", "Signature, typed: Ana Ribeiro". It is not a Tab stop: drawing has no keyboard equivalent.
- Type instead is the first Tab stop: a keyboard or screen-reader user types their name, which is the signature. Then Undo, Redo, Clear.
- Required and empty on submit: the error shows and focus goes to Type instead. Pass the words: `<FormField.Error match="valueMissing">Sign, or type your name.</FormField.Error>`.
- ⌘Z / Ctrl+Z undo and ⇧⌘Z / Ctrl+Y redo while focus is in the pad (draw mode). Clear is one step of the same history, so Undo brings a cleared signature back.
- Palm rejection: once a pen has touched the pad, touches don't ink until it is cleared; only one pointer inks at a time.

## Rules

- Say what signing means next to the pad ("By signing, you agree to the terms above"), in the host's words; the pad says nothing about validity.
- Keep the typed path: never hide Type instead, and never require drawing.
- Exports are dark ink on paper whatever the colorway; pass `ink` only for a document that needs another.
- Store the structured value (strokes or typed name) when you will show it again; the SVG is for documents and forms.
