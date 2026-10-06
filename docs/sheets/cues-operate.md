### Cues you can operate

From the backlog entry "Cues you can operate: the interface molds inside the text". Owner, on the Provenance tooltip page ("Send #poster tomorrow 4pm, slept 6h in #done by #coffee"): these should let the person change them in place. This sheet is the entry's "Survey first" item: every recognised kind, what changing it in place means, our form, its layer and its tier.

Now: the cue family (`Mark`, `components/mark`) draws what a recognizer understood (a glyph before the words, a line behind them, a chip on hover) and changes nothing. `MarkInferred` can be confirmed. Neighbours that already do part of the job and must not be duplicated:

- **`NumberField`** steps, scrubs and types a number in a well, with the drum, Alt / Shift steps and refusal at a limit. Its gestures and timing are the reference; its form (a well with keycaps, a textbox you type in) is wrong for a word inside a sentence, where the editor owns typing.
- **`SwapText`** (the drum) turns a changing word one step. Every operable cue's words turn on it.
- **`TimePicker`**, **`Calendar`**, **`Swatch`**, **`Combobox`** pick a time, a day, a colour, a person from a list. An operable cue opens one of them in a popover for the long jump; it doesn't rebuild them.

Read for jobs: Bret Victor's Tangle (scrubbable numbers in prose), Apple Numbers and Soulver (live values in text), Figma's and Blender's scrub fields, Fantastical's and Things' natural-language dates, Notion's inline dates and mentions, Linear's inline status, the WAI-ARIA APG spinbutton.

**Place (docs/COMPOSITION.md).** An operable cue is a **Component**: you operate it to change something else, the person's text (the value the words say). It is not the Mark (a Part: a look with no job), it stands for nothing the person could hold (Object fails), and it stays while you're not touching it (Instrument fails). What shows only while you drag (the engraved scale beside a number, the peeking states of an enum) is an **Instrument** by the test. It ships inside its component, since a component can't import a later layer, and it has no job apart from that component's gesture.

**One rule for every kind: the text stays the source.** A change rewrites the words in place ("6h" becomes "6.5h"); there's no hidden value beside the text. Only the part of the words that carries the value changes ("tomorrow 4pm" keeps "tomorrow" while its time turns). Live changes while you drag, then one commit per gesture, which is the host's one undo step. The caret and layout never jump, and the line keeps its width while you drag (the drum's footprint rule).

**Jobs by kind**

| Kind | Changing it in place means | Our form | Tier |
|---|---|---|---|
| amount ("$40") | more or less of it | `MarkScrub` (number): drag up or down on the words, one step per detent, the digits turn on the drum, ↑ ↓ when focused | Must |
| measurement ("6h" slept, "8k steps") | correct what was logged | `MarkScrub` (number), the host's step (0.5 for sleep, 1 for steps in thousands) | Must |
| duration ("1h30", "45 min") | longer or shorter | `MarkScrub` (duration): 5-minute detents, the words keep their form ("1h" → "1h05", "45 min" → "50 min") | Must |
| time of day ("4pm", "16:00", inside "tomorrow 4pm") | earlier or later | `MarkScrub` (clock): 15-minute detents with a haptic tick each, wrapping round midnight; 12- or 24-hour as written; only the time in the words turns | Must |
| a unit ("h" ↔ "min") | the same amount, said another way | a horizontal drag or a key (U) converts the value and rewrites its unit | Should |
| a currency ("$" ↔ "€") | a different currency | needs a rate the library doesn't have; the host would pass one | Later |
| relative date ("tomorrow") | another day | a spinbutton over day offsets: yesterday, today, tomorrow, the weekdays, then real dates ("Fri 3 Oct"); the resolved chip rides along; a long press opens `Calendar` in a popover; a picked day writes back as words when it can ("next Friday") | Should |
| status tag ("#done") | move it on | rotates through its enum (todo → doing → done → dropped) like a rotary switch: Space or a drag steps, the next state peeks above and below while held, colour and glyph follow; a listbox-like picker for readers | Should |
| colour ("#FF6B3D") | a different colour | the swatch opens a `Swatch` well in a popover; dragging on the swatch shifts hue, the hex rewrites live | Should |
| person ("Sam") | someone else | the avatar opens a small `Combobox` of people; the name rewrites | Should |
| tag ("#poster") | a different tag | the tags you've used, in a `Combobox` from the tag (the typing demo's list, made a control). Not scroll to cycle (below) | Should |
| derived tag ("#studio", dashed) | accept or reject it | covered: `MarkInferred` and the derived tag confirm on click or Tab; rejecting is deleting words, which is writing | covered |
| link (the host pill) | a different address | dropped: editing a URL is writing; the pill steps aside while writing and shows the raw URL | dropped |
| inferred value (`MarkInferred`, "fri") | confirm it | covered by `onConfirm`; changing it first is the relative-date job | covered |

**For every kind**

| Job | Our form | Tier |
|---|---|---|
| Nothing at rest | at rest the cue reads exactly as the Mark: no handle, no box, no hint | Must |
| Say it can move | the cursor says how (ns-resize over a number); the focus ring on keyboard focus | Must |
| A first-time hint | a tooltip "Drag to change" once per host | Should |
| The thicker line on hover | the cue's line thickens on hover | Should |
| A name and a value for readers | `role="spinbutton"` with a name ("Sleep") and the words as its value text; `aria-valuenow`, min and max when set | Must |
| Keyboard does all the pointer does | ↑ ↓ step, Shift ×large, Alt ×small, Page Up / Down large steps, Home / End to the limits | Must |
| One undo step per gesture | live `onWordsChange` while dragging; `onWordsCommit` once on release (and once per key press) | Must |
| A limit says no | at min or max a push shakes only the words, once (the refusal spring) | Must |
| Reduce Motion | the words change without the drum's travel (a crossfade); the scale appears and goes at once | Must |
| SwiftUI | `MetalMarkScrub`: the same scales, steps, keys (arrows, ⌥, ⇧, and the accessibility adjustable action), the scale while dragging, the alignment haptic per detent on a trackpad | Must |

Not doing: **scroll to change a value.** The wheel over inline text belongs to the page; a sentence that eats the wheel traps the reader. `NumberField` takes the wheel only while focused; an operable cue doesn't take it at all. Not doing: pointer lock while scrubbing. A cue sits in text the eye is reading, and hiding the cursor there loses its place; a drag holds pointer capture instead.

**Decide**

- **Enums: spinbutton or listbox?** A spinbutton over the states (name, the state as its value text, min and max). It gives readers what a listbox-like picker would with the same keys, matches SwiftUI's adjustable action, and keeps one control for every stepped kind.
- **Tags and people: a new component.** `MarkPick` (a button and a combobox), not a `MarkScrub` scale: tags you've used and people have no order to step through.
- **The picker is the host's.** `MarkScrub` owns the popover (anchored to the words, focus in and back) but not its content, so a cue that never opens a calendar doesn't ship one.

- **A new component, not a prop on `Mark`?** A component. Mark is a Part with no job; an operable cue has one (change the text) and carries a role, focus and keys. `MarkScrub` composes `Mark` for its look, so the look stays one recipe.
- **Base UI?** Base UI has no spinbutton: `NumberField.Input` is a textbox ("Number field"), and its `ScrubArea` locks the pointer and drives that textbox. In a sentence the editor owns typing, so the cue is a `span` with `role="spinbutton"` and its own small set of keys (APG spinbutton), which `NumberField` keeps for the well.
- **Where's the value?** In the words. The component reads the value from the words with its scale (number, duration, clock) and writes it back into the same words, so the host keeps one string and splices the new words into it.
- **How far is a step?** A detent every `scrub.pixels` (4 px) of vertical travel; Shift for large steps, Alt for small, read when each detent passes, so a modifier can change mid-drag. Defaults per scale, in the recipe: a number 1 / 0.1 / 10, a duration 5 / 1 / 30 minutes, a clock 15 / 5 / 60 minutes.
- **Width held.** While dragging the words hold the widest width they've had in that gesture, so the rest of the line doesn't jitter as "9h" becomes "10h" and back. The hold drops on release, once.
- **The scale.** An engraved ruler beside the words while dragging only: the groove's ink and lip (the mark recipe's groove), a tick per detent and a longer one every five, an index at the centre. It follows the hand detent by detent, so it moves only when the value does. It doesn't show for keys: the drum is enough there.
- **Times and durations ship with numbers.** They're the same component with another scale, so they fall out of the same code (the backlog lists them separately).

**Must**
- [x] React: `MarkScrub` (`kind`, `scale` number / duration / clock, `step`, `smallStep`, `largeStep`, `min`, `max`, `onWordsChange`, `onWordsCommit`, every `Mark` prop) on the cue family's look; `markScrubRead(words, scale)` for hosts that need the value.
- [x] Drag up / down in detents, the drum, width held, the engraved scale while dragging, the haptic per detent (`haptic('detent')`), refusal at a limit.
- [x] Keys: ↑ ↓, Shift, Alt, Page Up / Down, Home / End; `spinbutton` with a name; one commit per gesture or key.
- [x] Reduce Motion.
- [x] SwiftUI `MetalMarkScrub` in step.
- [x] Recipe props (`mark-scrub`), the agent guide, a section on the Cue family page with its DialKit panel, a Playwright slice.

**Should**
- [x] Relative dates slide, with the Calendar popover on a long press. (`MarkScrub` `scale="day"`: yesterday … tomorrow, the weekdays, "next Friday", then "Fri 16 Oct"; a held press (`press.hold`) or Enter opens the host's `picker` in a `Popover` anchored to the words; `choose` writes the day back as words when words can say it.)
- [x] Enums rotate (status tags), with the peeking states. (`scale="enum"` with `options`, wrapping; Space or a drag of `enum.pixels`; the neighbours peek above and below while held and the chip steps aside; the tag's hue follows the state's name.)
- [x] Unit cycling for durations (h ↔ min). (U or a sideways drag of `unit.pixels`; the value and limits don't change. Durations only: a measurement's unit is the host's.)
- [x] Colour: a hue drag. (`scale="hue"`: the hex turns round the wheel, saturation and lightness kept, the swatch glyph following. The swatch well in a popover is dropped for now: `Swatch` is a display chip with no picking; when a colour picker exists it goes in `picker`.)
- [x] Tags and people: a combobox from the cue. (`MarkPick`: a click, Enter or Space opens a small `Combobox` in a popover, every option under "Recent" at once; one commit per pick.)
- [x] The hover line and the first-time hint. (The line thickens by `hover.line` as a scale, so nothing reflows; the first hover on a host says "Drag to change" in the chip, once, remembered in `localStorage`.)

**Later**
- [ ] Currency conversion (needs a host rate).
