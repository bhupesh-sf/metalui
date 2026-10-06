### Signature pad

From "Components other libraries ship that we don't" § 2: a form field that captures a signature. Undo and redo; draw or type the name; stylus with pressure and palm rejection (`sizing`: auto, pressure, velocity); smoothing and min/max width; export PNG, JPEG, SVG or the strokes as JSON; `name`, `required` and validation in a form; in a dialog, on an agreement card, initials per clause, proof of delivery.

Now: nothing that is a field. Three neighbours draw and must not be confused with it:

- **`BrushCursor`** and **`DrawPicks`** are a canvas's tools: the pen's ring under the pointer, and the ink and width trays. They pick how you draw on a board; they hold no value and live on no form.
- **The draw tools and ink assist** (the Brush cursor page's lab, `apps/docs/src/lib/ink-assist.ts`) settle a board's strokes. They are a docs prototype, not a package export, and are tuned for writing on an endless canvas, not for one mark in a box.
- **`Field`** takes text. The typed path of the pad is a field's input, but the value is a mark, not the text.

Read for jobs: ReUI Signature Pad, `signature_pad` (szimek), `react-signature-canvas`, `perfect-freehand`, DocuSign's and Adobe Acrobat Sign's adopt-a-signature dialogs (draw, type, upload), Apple's Preview and Markup signatures, PencilKit, courier proof-of-delivery apps (a finger on a phone, in the rain), US ESIGN / EU eIDAS plain-language guidance on what an electronic signature is (a mark plus intent plus a record, not a picture).

**Place (docs/COMPOSITION.md): a Component.** You operate it to change something else: the value a form will send. It is not an Object: the signature stands for the person's consent, but what you hold is the signed document; the pad is the line you sign on, and it is the same in any app. It is not an Instrument (it stays, and holds its value when you let go) or a Place (it has area, but holds no objects and you don't go in).

**Our form: a sunk well as the paper.** The field's well (the `well` field recipe), wide and tall like a line on a form, with an engraved baseline across its lower third (the `Rule`'s groove) and "Sign here" engraved under its left end. Ink is the text's ink (`ink`), so it reads as the person's own hand on both colorways. While the pen is down the line follows it exactly, raw, with no lag; when it lifts, the stroke **settles**: the levelled line cross-fades in over the raw one on the settle spring, so a shaky mouse line visibly calms without ever moving away from where the hand put it. Width follows the pen: pressure from a stylus, speed from a mouse or finger (a fast flick thins, a slow turn swells), tapered at both ends like a nib. Under the well, a row of keys: "Type instead" (a link cap) on the left, and on the right Undo and Redo (ghost glyph keys) and Clear (a compact cap).

**The keyboard and screen-reader path is "Type your name".** Drawing has no keyboard equivalent, and a screen-reader user cannot see the mark they make. So the pad has a second mode on the same paper: the well holds a text input sitting on the baseline, in the display type, ink on the line. The person types their name; the value is that name, marked as typed. "Type instead" is the first Tab stop in the pad, so a keyboard user reaches the typed path before anything else; when a form refuses an empty pad, focus goes there too. The drawing surface itself is not a Tab stop (it has nothing a key can do) and is one image to assistive tech: "Signature, empty" or "Signature, drawn, 3 strokes".

**Wording.** The pad captures a mark. Whether that mark binds anyone is the host's law, flow and record, not the component's. Nothing in the pad, its guide or its page says "legally binding", "legal signature" or "valid"; the agreement example says what the person agrees to and leaves the rest to the host ("By signing, you agree to the terms above"). The guide tells hosts that a typed name and a drawn one are both just marks: intent and a record of who, when and what come from the flow around it.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Sign with a mouse, finger or pen | every pad | pointer events with capture; coalesced events, so a fast line keeps its curve; `touch-action: none` on the paper only | Must |
| See where to sign | an empty pad | the engraved baseline and "Sign here"; the hint fades once there is ink, the baseline stays | Must |
| Ink that looks like a hand, not a polyline | every stroke | a filled outline whose width follows the pen, tapered ends, curves through midpoints (no facets) | Must |
| A shaky line comes out calm (ReUI smoothing) | mouse, trackpad, a moving van | the stroke settles on lift: levelled with its ends pinned, cross-faded in over the raw line on the settle spring. Live ink is never smoothed, so it never lags the pen | Must |
| Width from pressure or speed (`sizing`: auto, pressure, velocity) | stylus, finger | `sizing="auto"`: pressure when the pointer reports it (a pen), speed otherwise; `pressure` and `velocity` force one | Must |
| Min and max width | thin pens, bold markers | `minWidth` / `maxWidth` (defaults from the recipe: 1.2 and 3.6) | Must |
| Take back the last stroke | every pad | Undo (⌘Z / Ctrl+Z while focus is in the pad, and a ghost key); Redo (⇧⌘Z / Ctrl+Y, and a key). Clear is one step of the same history, so Undo brings a cleared signature back | Must |
| Start again | every pad | Clear, a compact cap; disabled when the pad is empty | Must |
| Type the name instead of drawing (ReUI draw-or-type) | keyboard, screen readers, people who can't draw | "Type instead": the well holds an input on the baseline, display type in ink. Each mode keeps its own content, so switching back loses nothing; the value is the mode that shows | Must |
| Required, in a form | checkout, agreements | `required`, `name`; inside `FormField` the label, description and error are the form field's. Empty on submit: "Sign, or type your name" and focus goes to "Type instead" | Must |
| What the form sends | every form | `name` posts the signature as SVG markup (self-contained, scales, prints, a few KB). The app gets the whole value from `onValueChange`: `{ kind: 'drawn', strokes, width, height }` or `{ kind: 'typed', name, width, height }` | Must |
| Strokes as JSON (ReUI) | replay, re-render, analysis | the drawn value *is* the strokes: `[x, y, width]` points in the pad's own box, rounded to 0.1 | Must |
| Export SVG | documents, PDFs | `signatureToSvg(value, { ink })`: dark ink on nothing, whatever the colorway | Must |
| Export PNG or JPEG (ReUI) | older back ends | `signatureToImage(value, { type, scale, background })` → a Blob, drawn straight onto a canvas (typed names keep the page's font) | Should |
| Stylus palm rejection | a tablet with a pen | once a pen has touched the pad, touches are ignored until the pad is cleared; a second pointer never inks while one is drawing | Should |
| Show a signature already given (proof of delivery) | a receipt, a delivery record | `readOnly` with `defaultValue`: the mark on the paper, no keys, no hint; one image "Signature, drawn" | Should |
| Initials per clause | contracts | `size="compact"`: a short well (88) with the same keys; one per clause on the agreement card | Should |
| In a dialog | "Adopt your signature" | covered: the pad in `Dialog`, sized by its container; the page shows it on an agreement card, which is the common case | covered |
| Disabled | a form not yet open | `disabled`: 40 %, no ink, keys disabled | Must |
| Reduce Motion | every lift and hint | the settle swaps at once (no cross-fade); the hint hides at once | Must |
| Upload an image of a signature (DocuSign) | adopting a signature | Later: an Attachment in the pad's place; no host asks yet, and a scanned picture is the weakest kind of mark | Later |
| Pick a handwriting font for the typed name (DocuSign styles) | typed signatures | dropped: a script font makes a typed name pretend to be handwriting. A typed name is shown as typed, in the display type | dropped |
| Ink colours (blue pen, black pen) | some pads | dropped: ink is the text's ink on screen and dark on export; a colour carries nothing here | dropped |
| A "legally binding" badge or wording | marketing pads | dropped: the pad can't know; the host's flow and record decide | dropped |
| Canvas bitmap as the surface (`signature_pad`) | most libraries | not ours: an SVG path per stroke is crisp at any zoom, exports as SVG for free, and needs no resize handling | dropped |
| Replay the signature being drawn | demos | Later: the strokes carry no time; add `t` when a host needs it | Later |

**Decide**

- **Value: SVG, strokes, or a picture?** The form posts **SVG markup** (one string a plain form can send; scales and prints; a few KB). `onValueChange` gives the structured value (strokes JSON or the typed name, with the box), so an app can store strokes and re-render. PNG and JPEG are a helper, not the value: a bitmap is the export a back end asks for, not what the pad holds.
- **Controlled or not?** Uncontrolled: `defaultValue` and `onValueChange`, with `key` to reset from outside. Nobody writes strokes into a pad from code; a saved signature comes back once as `defaultValue`, and the history (undo, redo, clear) lives with the ink it records.
- **Smoothing: live or on lift?** On lift. A live filter either lags the pen (the past-only filters) or rewrites the line under the pen; the ink-assist lab measured both. So the live line is raw and exact, and the settled one replaces it with a cross-fade on the settle spring: a calm line, and never a line that moved away from the hand.
- **New dependency?** None. `signature_pad` and `perfect-freehand` do this in ~10 KB, but the outline (tapered, pressure-sized, midpoint curves) is ~40 lines and the library already draws ink this way on the Brush cursor page.
- **The typed name's font.** The display type, not a script font: a typed name should look typed.
- **Keyboard and screen reader.** "Type instead" first in Tab order; the paper is one image with its state in words; an empty required pad sends focus to "Type instead". Undo and Redo work from the keyboard anywhere in the pad.
- **Sizes.** Not the field ladder (a signature is not a line of text): regular (a 160 well) for a signature and compact (88) for initials, both as wide as their container.
- **Export ink.** Dark ink on transparent (or `background`), whatever the colorway on screen: a signature on a document is dark ink on paper.

**Must**
- [ ] React: `SignaturePad` (`defaultValue`, `onValueChange`, `mode` / `defaultMode` / `onModeChange`, `sizing`, `minWidth`, `maxWidth`, `name`, `required`, `disabled`, `readOnly`, `size`, `hint`, `aria-label`), inside `FormField` for its words and errors.
- [ ] The paper: field well, engraved baseline and "Sign here"; ink in the text's ink; strokes that settle on lift; width from pressure or speed.
- [ ] Undo, Redo, Clear (one history; keys and shortcuts); Type instead (the keyboard path).
- [ ] `signatureToSvg`; the form posts SVG; strokes JSON in the value.
- [ ] SwiftUI `MetalSignaturePad` (a Canvas with a DragGesture, width from speed, the settle, typed mode, Undo, Clear).
- [ ] Recipe `signature-pad`, agent guide, meta.json, the page with its DialKit panel (in a form, on an agreement card), the e2e slice.

**Should**
- [ ] `signatureToImage` (PNG, JPEG).
- [ ] Palm rejection.
- [ ] `readOnly` (proof of delivery); `size="compact"` (initials per clause).

**Later**
- [ ] Upload a picture of a signature.
- [ ] Time in the strokes, for replay.
- [ ] SwiftUI pressure (PencilKit is iOS only, and the package builds for macOS only today).
