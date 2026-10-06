### Rating

From "Components other libraries ship that we don't" § 2: stars; half stars from decimals; the number beside them; editable or read-only; `max`; sizes.

Now: nothing. Three neighbours do part of the job and must not be duplicated:

- **`Meter`** shows a level in a range as a row of lamps, coloured by where each sits (green, amber, red). It measures; nothing in it can be pressed, and its colours say "this is getting to be a problem", which a rating never means.
- **`Slider`** sets a value on a continuous groove. A rating has five or ten named places, not a continuum, and you pick one with one press.
- **`Radio group`** picks one of a short list. A rating *is* one choice from a short ordered list; what Radio lacks is the reading: the run of filled places that says "four of five" at a glance.

Read for jobs: ReUI Rating, MUI Rating, Ant Design Rate, Chakra Rating, React Aria (no rating; its docs build one from a radio group), the WAI-ARIA APG's two rating examples (a radio group, and a slider), Apple's App Store and Music ratings, Amazon and Google Maps review summaries, Letterboxd's half stars, Lightroom's 0–5 rating keys.

**Place (docs/COMPOSITION.md): a Component.** You operate it to change something else: the rating stored for an item. It stands for nothing of the person's (Object fails: the item rated is the object, not its score), it stays while you work (Instrument fails) and holds nothing (Place fails). The read-only form is the same component with nothing to press, as Stepper's unreachable steps are still Stepper.

**Our form: detents, not stars.** The set has no star, and drawing one is not this component's job. More to the point, a star is the wrong shape for us: a star is a sticker, and a part-filled star (a 4.3) is hard to read, which is why every library rounds to halves. A rating is an amount on a short fixed scale, so it takes the language the library already has for an amount: the slider's groove, **cut into one detent per point** (the meter's segments: short pills with a gap between), and filled with **the slider's green**, the library's colour for "an amount someone set". A part-filled pill reads exactly (4.3 is a third of the fifth pill, cut square), so a decimal needs no rounding. Not the LED lamps: a lamp's green means *live*, and the meter's printed amber and red would call a low score a fault. The number beside the detents says the value in words, so the shape never carries it alone. If a product needs the star itself, `star` is a missing glyph (see "Glyphs the set lacks"); the detents stay the default either way.

**Semantics (WAI-ARIA).** The APG shows both a radio group and a slider. **A radio group**: each place is a named choice ("4 of 5, Very good"), a press sets exactly the detent under the finger (a slider rounds a position, so the left half of the fourth detent would give 3), ← → move and choose (Base UI RadioGroup already does it, with roving focus and a form `name`), and readers hear "4 of 5, radio, checked, 4 of 5". Clearing, which a radio can't do on its own, is a press on the chosen detent or Backspace / Delete. The read-only form is not a control at all: one `role="img"` named "Rated 4.3 out of 5, 1,284 ratings", its parts hidden.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See how good something is at a glance | a product card, a list row, an app's header | `readOnly`: the detents filled to the value, the value beside them in the figure type ("4.3"), so the shape and the number agree | Must |
| Know how many people said so | review summaries | `count`: "(1,284)" after the value in ink3, grouped by the locale; said to readers as "1,284 ratings" | Must |
| Half stars from decimals (ReUI) | an average | covered and bettered: any decimal fills that share of its detent, cut square; no rounding to halves. `precision` drops | covered |
| Give your own rating quickly | a review form, a song row | one press on the detent sets it: it dips on the part spring and latches lit | Must |
| See what a press would do before pressing | every editable rating | hover: the detents a press would change turn to a ghost of their lit look (the ones it would light, or the ones it would put out), and the readout turns on the drum (`SwapText`) to the value under the pointer | Must |
| Change your mind | after rating | press another detent; the run fills or drains to it, sweeping from the old edge one detent at a time (the meter's sweep: its stagger and fade) | Must |
| Clear it | "I didn't mean to rate this" | press the chosen detent again, or Backspace / Delete: the run drains and the readout says "Not rated" (`emptyLabel`) | Must |
| Rate with the keyboard | everywhere | one Tab stop; ← → (and ↑ ↓) move and choose; Home and End come from the radio group; focus shows the green ring on the detent | Must |
| Words for the places (MUI labels, Ant tooltips) | "Poor … Excellent" | `labels`: one word per place; the readout says the word instead of the number, and readers hear it with the number | Must |
| `max` (ReUI, Ant `count`) | 5, 10 | `max` (5): one detent each. Above 10 detents stop being countable at a glance; the guide says use a Slider | Must |
| Sizes (ReUI sm, default, lg) | dense rows, forms, a hero | `size` compact 28 / regular 32 / large 44: the row's height is the hit area's height, and each detent's hit area runs into its neighbour's (no dead gap) | Must |
| Disabled | a form not yet open | `disabled`: 40 %, no hover, no press | Must |
| In a form | a review form | `name` posts the value (Base UI's hidden input); `required` | Must |
| Reduce Motion | every change | detents light and go out at once; the press doesn't dip; the drum crossfades | Must |
| Controlled or not | every host | `value` / `defaultValue` / `onValueChange(value \| null)` | Must |
| Half points when rating (Ant `allowHalf`, MUI `precision`) | film sites | Later: a press on a detent's left half sets x.5, and ← → step by halves. Needs a second hit area per detent; no host asks yet | Later |
| Slide to rate | touch | Later: drag across the detents and let go on one. A tap already sets; sliding is the slider's job | Later |
| Custom shapes (MUI `icon`, Ant `character`: hearts, faces, emoji) | "How did it go? 😞 … 😀" | dropped: faces are a choice between moods, not an amount; that is a radio group or a segmented control with glyphs | dropped |
| Colour by value (red for 1, green for 5) | some survey tools | dropped: colour would put a fault on a low score, and LED colours keep their meanings | dropped |
| Tooltip per star (Ant) | | covered by the readout: the word for the place under the pointer turns on the drum beside the detents, where the eye already is | covered |
| A rating histogram (Amazon's 5★ … 1★ bars) | review pages | dropped here: a block of Meters and counts; build it when a page needs it | dropped |

Not doing: stars drawn from parts (a star built from strokes is a glyph made outside the set); an LED per point (lamps mean live, waiting, failed, link); a continuous slider underneath (a press must set the detent under the finger).

**Decide**

- **Stars or our own form?** Detents in the slider's groove and green. They read "how much" at a glance, part-fill exactly, and use looks the library already has; `star` is listed as a missing glyph for a product that insists.
- **Radio group or slider?** Radio group: discrete named places, exact presses, Base UI's roving focus and form value. Clearing is added (press the chosen one again, Backspace / Delete).
- **How is a decimal shown?** The exact share of the detent, cut square (a clip, not a scale, so the rounded end isn't squashed), and the value to one decimal beside it. No rounding to halves: the detent can show 4.3 honestly, so it does.
- **What does hover show?** Only what a press would change, as a ghost of the lit look; nothing else moves. The readout follows the pointer on the drum.
- **Lit colour?** The slider's fill green, not an LED: an amount someone set. One colour for every value.
- **Read-only semantics?** One `role="img"` with the whole sentence; its parts hidden, so a reader hears it once.

**Must**
- [x] React: `Rating` (`value`, `defaultValue`, `onValueChange`, `max`, `readOnly`, `count`, `labels`, `emptyLabel`, `showValue`, `size`, `disabled`, `name`, `required`, `aria-label`).
- [x] Detents: lit, part-lit (read-only decimals), ghost (hover preview), off; the press dip; the meter's sweep; clear by pressing again or Backspace / Delete.
- [x] The readout on the drum; the count in ink3.
- [x] SwiftUI `MetalRating` (editable and read-only, the same detents, readout and keys).
- [x] Recipe `rating`, agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Later**
- [ ] Half points when rating.
- [ ] Slide to rate on touch.
- [ ] A `star` glyph, if a product needs one.

- Done (2026-10-06): Must. After a press the preview stops until the pointer moves to another detent, so what you pressed is what shows (not the "clear" ghost of the detent still under the pointer). The editable readout keeps the width of its widest word, so the detents never move as it turns. Fixed on the way: `SwapText` could stay cut to a shorter word when its value went A → B → A within the shrink delay (sweeping the pointer across the detents did it). Left: the Later tier; no x-ray card; SwiftUI focus is the whole rating (the ring on the chosen detent) and its arrow keys are macOS only.
