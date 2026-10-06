# Mark

Recognition made visible on the text. React: `Mark`, `MarkUrl`, `MarkInferred`, `MarkUrgency`, `MarkLife` from `@unlocalhosted/metalui` (earlier `Cue`, `CueUrl`, `CueInferred`, `CueUrgency`, `CueLife`); the checkbox is `Checkbox`. SwiftUI: `MetalCueMark`, `MetalCueTag`, `MetalCueInferred`, `MetalCueLife`, `MetalCueURLPill`, `MetalCueUrgency`, `Text.metalCue(_:colorway:)`.

## Use it for

- Marking what a recognizer understood in a person's own writing: a date, a duration, an amount, a measurement, a tag, a colour, a person, a link.
- A task's checkbox in the margin (`Checkbox`), a task the model inferred (`Checkbox ghost`), and urgency (`MarkUrgency`).
- The one life glyph trailing a block for the kind of the whole line (`MarkLife` around a `Life*Icon` at 16, with a `label`).

## Don't use it for

- Changing the text. A cue never rewrites, reflows or recolours the words beyond its kind's ink.
- Anything the person did not write: a value the model read that is not in the text is a `MarkInferred` pill after the words, never an underline.
- Status, errors or calls to action. Cues are quiet and have no toast, badge or sound.

## One grammar of kinds

Each kind has one look. The glyph says what the chunk is, at full ink just before the words it explains; the line says it was understood; the chip (hover or focus) names the glyph, then the value: `DATE · WED 30 SEP · 16:00`.

| Kind | `kind` | Glyph | Line |
|---|---|---|---|
| time | `date`, `duration` | clock (default) | engraved groove: a dark hairline with a light lip under it |
| money | `amount` | coin: pass `<CoinIcon size={14} />` | quiet hairline; the formatted amount is in the chip (mono, tabular) |
| body | `measurement` | pass `<MoonIcon size={14} />` for sleep, `<LifeStepsIcon size={14} />` for steps; `label="Sleep"` | soft green, 1.5 |
| colour | `hex` | the live swatch (default) | 3 pt in the colour |
| tag | `tag` | none: the tag is its shape | a luggage tag: paper in the tag's own hue (`markTagHue(name)`, a stable hash into a 6-hue palette), the point and a punched hole on the left, the hash a quiet mark |
| person | `person` | pass `<Avatar name size="small" label="" />` | none |
| link | `MarkUrl` | the link glyph at 11 | the host pill |
| match | `match` | none | a search's matched words: weight 650, green .55 underline (result rows only) |

A derived tag (`derived-tag`) is a tag the model inferred: the same luggage tag, dashed and hollow, until confirmed.

## Anatomy

- `.mu-cue` (nowrap: a chunk never splits) holds `.mu-cue-glyph` (14, gap 3; a person 17) and `.mu-cue-words`.
- The line and the tag's paper are drawn behind the words (`.mu-cue-words::before`; the tag's paper is `::after` over its edge), so the words keep their exact advance. The tag's paper overhangs by 4.5 / 4 into the spaces around it.
- The chip is `.mu-cue::after`.

## States

| State | Prop | Look |
|---|---|---|
| rest | – | glyph, line or tag |
| fresh | `fresh` | the moment of recognition plays once (below) |
| inferred | `inferred` (default on `derived-tag`) | the line dashes, a tag goes hollow and dashed, the words step to ink2 |
| confirmed | `inferred` true → false | a small press (stamp .94 on the part spring) and one green sparkle |
| raw | `raw` | the drawing and the glyph fade on settle; the glyph keeps its slot, so nothing moves |

`MarkInferred`: dashed ink3 ring and ink2 until `confirmed`, then solid green and ink with the stamp and sparkle; with `onConfirm` it is a button ("Confirm fri, FRI 2 OCT · RECOGNIZER 0.82"). The host also confirms on Tab while the caret is in the line.

## Motion

Recognition (`fresh`), once, never looping:

1. 0 ms: the line draws in from the left (scaleX, settle spring); a tag's paper rises 3 and settles (object spring).
2. 83 ms (settle half): the glyph pops in from .35 with a small overshoot (object spring); a swatch blooms the same way.
3. Money: the figures turn one step on the drum (the drum's step, focus and spring). A box ends kerning at its edge, so the fresh amount may shift 0.66 pt; the glyph arriving hides it.
4. Date: the resolved value rises as the chip, holds (`motion.chip-hold`, 1800 ms) and fades.
5. The glyph's own act, once: the clock passes an hour; a life glyph plays its hover once (`motion.act`, 1200 ms; iteration count forced to 1).

Set `fresh` only once the caret has left the words; never while it's inside them. What is on screen when a page opens isn't news: don't set `fresh` for it. The resolved-value chip rises 3 on the part spring on hover. The dimple's tick is drawn by a pen (see Checkbox). Reduce Motion: everything is there at once; no chip-once, no act, no sparkle, no stamp.

## API

```tsx
import { Avatar, Cue, CueInferred, CueLife, CueUrl, Dimple } from '@unlocalhosted/metalui';
import { CoinIcon, LinkIcon, MoonIcon } from '@unlocalhosted/metalui/icons';
import { LifeCoffeeIcon } from '@unlocalhosted/metalui/icons/life';

Send <Cue kind="tag">#poster</Cue> <Cue kind="date" resolved="WED 30 SEP · 16:00" fresh={justRecognised}>tomorrow 4pm</Cue>
for <Cue kind="amount" resolved="$40.00" glyph={<CoinIcon size={14} />}>$40</Cue>,
slept <Cue kind="measurement" label="Sleep" resolved="6 H" glyph={<MoonIcon size={14} />}>6h</Cue>
to <Cue kind="person" glyph={<Avatar name="Sam Ito" size="small" label="" />}>Sam</Cue>
<CueInferred resolved="FRI 2 OCT · RECOGNIZER 0.82" confirmed={ok} onConfirm={confirm}>fri</CueInferred>
<CueLife label="A drink · coffee?" fresh={justRecognised}><LifeCoffeeIcon size={16} /></CueLife>
```

| Component | Props |
|---|---|
| `Cue` | `kind`, `resolved`, `glyph` (a node, `false` for none), `label`, `fresh`, `inferred`, `raw`, `color` (hex) |
| `CueUrl` | `host`, `glyph`, any anchor attribute |
| `CueInferred` | `resolved`, `confirmed`, `onConfirm` |
| `CueLife` | the glyph as children, `label`, `fresh`, `raw` |
| `CueUrgency` | – |
| `markTagHue(name)` | the tag's palette index (0–5) |

## Rules

- Metric-neutral words: every in-flow cue's words have the same advance as the plain text (measured width delta 0.00 pt). The glyph is the only advance a cue adds; raw keeps it.
- One look per kind; one life glyph per block, trailing, for the whole line only, with its label.
- Recognition plays once, after the caret leaves the words. Nothing loops.
- Ticking a dimple or picking a tag is a person's action: the host writes the text and offers Undo. Applying a cue never rewrites text.
- Hidden confidence is a bug: an inferred value shows where it came from (`RECOGNIZER 0.82`) in its chip and stays dashed until confirmed.
- Typing `#` in a host: list the tags already used, drawn as tags (the docs' demo shows them in a listbox; Tab picks the first).

## Accessibility

- The glyph is decorative (`aria-hidden`); its name is in the chip and the words carry the meaning. The chip also shows on keyboard focus (give a focusable cue `tabIndex={0}`).
- A confirmable `MarkInferred` is a real button with a name that says what confirming does.
- The urgency LED has the label "Due soon"; a labelled life glyph is an image with its label.
- Colour is never the only cue: each kind has its glyph or shape, inferred is dashed, tags are shapes.

## Tokens

The mark recipe's props: `glyph.*`, `groove.*` (per colorway), `line.*`, `tag.*` (pad, point, hole, saturation, lightness, edge and ink per colorway, `hue-0`…`hue-5`), `inferred.*`, `motion.*`; the foundation `--mu-cue-*`; `--mu-spring-settle`, `--mu-spring-object`, `--mu-spring-part`, `--mu-swap-*`. Swift: `MetalRecipes.mark`, `MetalCue`, `MetalTokens.<colorway>.cue*`.
