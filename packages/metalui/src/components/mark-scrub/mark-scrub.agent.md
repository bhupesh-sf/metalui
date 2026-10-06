# Mark scrub

A recognised number, duration, time of day, day, state or colour that the person changes in place, inside their own text. React: `MarkScrub` and `markScrubRead` from `@unlocalhosted/metalui`. SwiftUI: `MetalMarkScrub` and `MetalMarkScrubScale`. It composes `Mark` (the cue family) for its look; at rest it is that Mark exactly.

## Use it for

- An amount, a measurement, a duration or a time a recognizer found in a person's writing: "$40", "slept 6h", "1h30", "tomorrow 4pm". The person drags it up or down, or focuses it and presses the arrows.
- A relative day ("tomorrow", "Friday", "Fri 16 Oct"): `scale="day"`, with the host's Calendar for the long jump (`onPick`).
- A status tag ("#doing") that moves through a fixed list: `scale="enum"` with `options`.
- A colour ("#FF6B3D") to turn round the wheel: `scale="hue"`.

## Don't use it for

- A number in a form or a panel: that's `NumberField` (a well, keycaps, typing).
- A tag picked from many, or a person: that's `MarkPick` (a combobox, not a step). Recent tags have no order to step through.
- Two values in one cue: "tomorrow 4pm" is a day cue and a clock cue side by side, each with its own words.
- Anything the person didn't write. An inferred value is a `MarkInferred` until confirmed.

## The words are the value

There's no value beside the text. `children` is the words as written; the `scale` reads the value from them and writes a new value back into the same words, changing only the part that carries it. The host splices the new words into its string.

| `scale` | Reads | Writes | Steps (step / Alt / Shift) |
|---|---|---|---|
| `number` (default) | the first number: "$40", "6.5h", "1,200 words", "-3°" | the number only, keeping its grouping; fixed places stay fixed ("$40.00" → "$41.00"), otherwise as few as the value needs ("6.5h" → "7h") | 1 / 0.1 / 10 |
| `duration` | "1h30", "2h", "2h 15m", "45 min", "45m" (minutes) | hours as "1h05" (minutes alone under an hour: "30min"); minutes-only words stay minutes ("45 min" → "50 min") | 5 / 1 / 30 |
| `clock` | "4pm", "4:15 PM", "16:00", "9:30" (minutes after midnight) | the same clock and case: "4pm" → "4:15pm" → "4pm"; "16:00" → "16:15"; wraps at midnight | 15 / 5 / 60 |
| `day` | "yesterday", "today", "tomorrow", "Friday", "next Friday", "Fri 16 Oct" (days from `today`) | words while words say it: −1…1 "yesterday" … "tomorrow" (keeping a capital), 2–6 the weekday, 7–13 "next" and the weekday, then "Fri 16 Oct"; no limits unless set | 1 / 1 / 7 |
| `enum` | the first of `options` in the words, whole-word, any case ("#done") | the option as given; wraps round; `aria-valuemin` 0, `aria-valuemax` the last | 1 / 1 / 1 |
| `hue` | the first hex, "#FF6B3D" or "#f63" (degrees round the wheel) | six digits in the case written; saturation and lightness kept; wraps | 5 / 1 / 30 |

The steps are the recipe's (`mark-scrub` `number.*`, `duration.*`, `clock.*`, `day.*`, `enum.*`, `hue.*`); `step`, `smallStep` and `largeStep` override them. A duration never goes below 0; a clock, an enum and a hue wrap and ignore `min` and `max`. A day and an enum take a detent per `day.pixels` (8) and `enum.pixels` (16): a word is a bigger step than a digit.

A duration has a second unit: U, or a sideways drag of `unit.pixels` (24), says the same amount the other way ("1h30" ↔ "90 min"); the value doesn't change, so neither do the limits. Only durations have one: hours and minutes are one quantity; a measurement's unit (steps, kg) is the host's. Words with nothing to read render as a plain `Mark`.

`markScrubRead(words, scale, { options, today })` returns `{ value, write(v), wrap?, cycle? }` (or null) for a host that needs the value: to resolve "4:15pm" into the chip, say.

## Gestures

| Input | Does |
|---|---|
| press | focuses it; no text selection starts |
| drag up / down | one detent per `scrub.pixels` (4) of travel: up raises, down lowers. Shift takes the large step and Alt the small, read at each detent, so a modifier can change mid-drag |
| release | one `onWordsCommit` if the words changed: the host's one undo step |
| ↑ ↓ | a step (Shift large, Alt small) |
| Page Up / Page Down | a large step |
| Home / End | to `min` / `max` when set (an enum's first and last) |
| Space | an enum's next state, wrapping |
| U | a duration in its other unit |
| drag sideways | a duration in its other unit, per `unit.pixels` |
| hold (`press.hold`, 500 ms) with no detent, or Enter | calls `onPick` (the host opens its popover at the words); the drag ends there |

Every change calls `onWordsChange(words, value)` (live while dragging); a key press or a pick also commits at once.

## Picker

The long jump (a Calendar for a day) is the host's, popover and all, so the cue never ships one. A held press or Enter calls `onPick({ anchor, value, words, choose })`, and `aria-keyshortcuts` names Enter while `onPick` is set (ARIA doesn't allow `aria-haspopup` on a spinbutton). The host opens its own `Popover` at `anchor` (the words; `Popover.Content` takes an `anchor` for a popover with no Trigger) and returns focus there on close. `choose(value)` writes the value back as words through the scale (a day picked in a Calendar becomes "next Friday" when words can say it, else "Fri 16 Oct") and commits once; the host closes its popover. Esc leaves the words.

```tsx
const [pick, setPick] = React.useState<MarkScrubPick | null>(null);
const back = React.useRef<HTMLElement | null>(null); // focus returns here, kept past the close
if (pick) back.current = pick.anchor;

<MarkScrub kind="date" scale="day" label="Day" onPick={setPick} {...bind('day')} />
<Popover open={!!pick} onOpenChange={(open) => { if (!open) setPick(null); }}>
  <Popover.Content anchor={pick?.anchor} finalFocus={back} side="bottom" align="start" aria-label="Choose day">
    {pick && <Calendar value={addDays(today, pick.value)} autoFocus
      onValueChange={(d) => { pick.choose(daysBetween(today, d)); setPick(null); }} />}
  </Popover.Content>
</Popover>
```

The wheel is left to the page: inline text never eats the scroll. No pointer lock: the cursor stays where the eye is reading.

## Motion

Each detent, at once: the words are rewritten, the digits turn one step on the drum (`SwapText`; up when raising, down when lowering), the scale moves one tick with the hand, and `haptic('detent')` plays where the platform has one. While dragging, the words hold the widest width they've had in that gesture, so the rest of the line doesn't jitter as "9h" becomes "10h" and back; the hold drops on release. The scale (an engraved ruler beside the words: the mark's groove ink and lip, a tick a detent and a longer one every five, a centre index in ink, faded at both ends) shows only while dragging, fading in and out on the settle spring; keys don't show it. An enum shows no scale: its neighbouring states peek above and below the words while held (`peek.gap`, at `peek.opacity`), and the chip steps aside for them. At a limit, a push shakes only the words, once per push (refusal).

Affordance, never at rest: on hover the line thickens by `hover.line` (a `scale` of the line, so nothing reflows; tags, which have paper, not a line, don't). The first hover on a host says `hint` ("Drag to change") in the chip instead of the label, once: it's remembered in `localStorage` (`mu-cue-hint`) when the pointer leaves or a press begins; `hint={false}` for never. Reduce Motion: the drum crossfades and the scale comes and goes at once; the refusal doesn't move.

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
| `scale` | `number` · `duration` · `clock` · `day` · `enum` · `hue` |
| `options` | an enum's states, in order |
| `today` | a day's today (default now) |
| `onPick({ anchor, value, words, choose })` | the long jump: the host opens its own popover at `anchor` |
| `hint` | the first-hover chip, default "Drag to change"; `false` for none |
| `step`, `smallStep`, `largeStep` | override the recipe's steps |
| `min`, `max` | limits (number, duration) |
| `onWordsChange(words, value)` | every change |
| `onWordsCommit(words, value)` | once per gesture or key press |
| every `Mark` prop | `kind`, `label`, `glyph`, `resolved`, `inferred`, `raw`, `fresh` |

## Accessibility

- `role="spinbutton"`, one Tab stop, for every scale: an enum is a spinbutton over its states (name, the state as value text, min and max), which gives readers what a listbox-like picker would with the same keys, and matches SwiftUI's adjustable action. Its name is `aria-label`, else `label` ("Sleep"), else the scale's ("Number", "Duration", "Time", "Day", "State", "Colour"). `aria-keyshortcuts` lists the extra keys (Enter with `onPick`, U on a duration, Space on an enum). `aria-valuetext` is the words; `aria-valuenow`, `aria-valuemin` and `aria-valuemax` the value and limits. Pass `aria-valuetext` for a fuller reading ("6 hours").
- Keyboard does all the pointer does. The focus ring shows on keyboard focus; the chip (the Mark's) shows on focus too.
- The glyph and the scale are hidden from readers.

## Rules

- The host owns the text: rewrite the words from `onWordsChange`, push one undo step from `onWordsCommit`, never one per detent.
- Only the part of the words that carries the value changes; the rest stays as the person wrote it.
- Nothing shows at rest that the Mark doesn't show. The scale is for the hand, only while it drags.

## Tokens

The `mark-scrub` recipe's props: `scrub.pixels`, `number.*`, `duration.*`, `clock.*`, `day.*`, `enum.*`, `hue.*` (step, small, large; `day.pixels`, `enum.pixels`), `unit.pixels`, `press.hold`, `hover.line`, `peek.*`, `scale.*` (gap, width, height, tick, minor, index); the mark recipe's `groove.*` for the scale's ink and lip; `--mu-swap-*`, `--mu-spring-settle`, `--mu-spring-refusal`. Swift: `MetalRecipes.markScrub`.
