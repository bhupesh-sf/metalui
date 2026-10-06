# Mark scrub

A recognised number, duration or time of day that the person changes in place, inside their own text. React: `MarkScrub` and `markScrubRead` from `@unlocalhosted/metalui`. SwiftUI: `MetalMarkScrub` and `MetalMarkScrubScale`. It composes `Mark` (the cue family) for its look; at rest it is that Mark exactly.

## Use it for

- An amount, a measurement, a duration or a time a recognizer found in a person's writing: "$40", "slept 6h", "1h30", "tomorrow 4pm". The person drags it up or down, or focuses it and presses the arrows.

## Don't use it for

- A number in a form or a panel: that's `NumberField` (a well, keycaps, typing).
- Dates as days ("tomorrow" → "Fri"), status tags, colours, tags or people: other operable cues (`docs/sheets/cues-operate.md`). Inside "tomorrow 4pm" only the time turns.
- Anything the person didn't write. An inferred value is a `MarkInferred` until confirmed.

## The words are the value

There's no value beside the text. `children` is the words as written; the `scale` reads the value from them and writes a new value back into the same words, changing only the part that carries it. The host splices the new words into its string.

| `scale` | Reads | Writes | Steps (step / Alt / Shift) |
|---|---|---|---|
| `number` (default) | the first number: "$40", "6.5h", "1,200 words", "-3°" | the number only, keeping its grouping; fixed places stay fixed ("$40.00" → "$41.00"), otherwise as few as the value needs ("6.5h" → "7h") | 1 / 0.1 / 10 |
| `duration` | "1h30", "2h", "2h 15m", "45 min", "45m" (minutes) | hours as "1h05" (minutes alone under an hour: "30min"); minutes-only words stay minutes ("45 min" → "50 min") | 5 / 1 / 30 |
| `clock` | "4pm", "4:15 PM", "16:00", "9:30" (minutes after midnight) | the same clock and case: "4pm" → "4:15pm" → "4pm"; "16:00" → "16:15"; wraps at midnight | 15 / 5 / 60 |

The steps are the recipe's (`mark-scrub` `number.*`, `duration.*`, `clock.*`); `step`, `smallStep` and `largeStep` override them. A duration never goes below 0; a clock wraps and ignores `min` and `max`. Words with nothing to read render as a plain `Mark`.

`markScrubRead(words, scale)` returns `{ value, write(v) }` (or null) for a host that needs the value: to resolve "4:15pm" into the chip, say.

## Gestures

| Input | Does |
|---|---|
| press | focuses it; no text selection starts |
| drag up / down | one detent per `scrub.pixels` (4) of travel: up raises, down lowers. Shift takes the large step and Alt the small, read at each detent, so a modifier can change mid-drag |
| release | one `onWordsCommit` if the words changed: the host's one undo step |
| ↑ ↓ | a step (Shift large, Alt small) |
| Page Up / Page Down | a large step |
| Home / End | to `min` / `max` when set |

Every change calls `onWordsChange(words, value)` (live while dragging); a key press also commits at once. The wheel is left to the page: inline text never eats the scroll. No pointer lock: the cursor stays where the eye is reading.

## Motion

Each detent, at once: the words are rewritten, the digits turn one step on the drum (`SwapText`; up when raising, down when lowering), the scale moves one tick with the hand, and `haptic('detent')` plays where the platform has one. While dragging, the words hold the widest width they've had in that gesture, so the rest of the line doesn't jitter as "9h" becomes "10h" and back; the hold drops on release. The scale (an engraved ruler beside the words: the mark's groove ink and lip, a tick a detent and a longer one every five, a centre index in ink, faded at both ends) shows only while dragging, fading in and out on the settle spring; keys don't show it. At a limit, a push shakes only the words, once per push (refusal). Reduce Motion: the drum crossfades and the scale comes and goes at once; the refusal doesn't move.

## API

```tsx
import { MarkScrub } from '@unlocalhosted/metalui';
import { MoonIcon } from '@unlocalhosted/metalui/icons';

slept <MarkScrub kind="measurement" label="Sleep" glyph={<MoonIcon size={14} />} step={0.5} min={0} max={24}
  onWordsChange={(w) => setSleep(w)} onWordsCommit={(w) => pushUndo(w)}>{sleep}</MarkScrub>
<MarkScrub kind="duration" scale="duration" label="Duration" onWordsChange={setDur}>{dur}</MarkScrub>
<MarkScrub kind="date" scale="clock" label="Time" resolved={chip} onWordsChange={setWhen}>{when}</MarkScrub>
```

| Prop | Notes |
|---|---|
| `children` | the words, a string |
| `scale` | `number` · `duration` · `clock` |
| `step`, `smallStep`, `largeStep` | override the recipe's steps |
| `min`, `max` | limits (number, duration) |
| `onWordsChange(words, value)` | every change |
| `onWordsCommit(words, value)` | once per gesture or key press |
| every `Mark` prop | `kind`, `label`, `glyph`, `resolved`, `inferred`, `raw`, `fresh` |

## Accessibility

- `role="spinbutton"`, one Tab stop. Its name is `aria-label`, else `label` ("Sleep"), else the scale's ("Number", "Duration", "Time"). `aria-valuetext` is the words; `aria-valuenow`, `aria-valuemin` and `aria-valuemax` the value and limits. Pass `aria-valuetext` for a fuller reading ("6 hours").
- Keyboard does all the pointer does. The focus ring shows on keyboard focus; the chip (the Mark's) shows on focus too.
- The glyph and the scale are hidden from readers.

## Rules

- The host owns the text: rewrite the words from `onWordsChange`, push one undo step from `onWordsCommit`, never one per detent.
- Only the part of the words that carries the value changes; the rest stays as the person wrote it.
- Nothing shows at rest that the Mark doesn't show. The scale is for the hand, only while it drags.

## Tokens

The `mark-scrub` recipe's props: `scrub.pixels`, `number.*`, `duration.*`, `clock.*` (step, small, large), `scale.*` (gap, width, height, tick, minor, index); the mark recipe's `groove.*` for the scale's ink and lip; `--mu-swap-*`, `--mu-spring-settle`, `--mu-spring-refusal`. Swift: `MetalRecipes.markScrub`.
