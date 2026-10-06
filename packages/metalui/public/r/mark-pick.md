# Mark pick

A recognised tag or person that the person swaps for another, in place, inside their own text. React: `MarkPick` from `@unlocalhosted/metalui`. SwiftUI: `MetalMarkPick`. It composes `Mark` (the cue family) for its look; at rest it is that Mark exactly.

## Use it for

- A tag the person wrote ("#poster"), to swap for another tag they use.
- A person they named ("Sam"), to swap for someone else.

## Don't use it for

- Anything with an order to step through (a status, a day, a number): that's `MarkScrub`. Recent tags have no order, so they are picked, never cycled (and never on the wheel: the wheel over text belongs to the page).
- A derived tag (dashed): confirm it with `MarkInferred` / the derived tag's own confirm; rejecting is deleting words.
- A link: editing an address is writing.

## The words are the value

`children` is the words. A pick replaces them whole with the chosen option's value; the host splices the new words into its string. There is no value beside the text. A pick is a jump, not a step, so the words change at once (the drum is for steps).

## Gestures

| Input | Does |
|---|---|
| click, Enter or Space on the words | opens a small `Combobox` in a `Popover` from the words; its field takes focus and every option stands under it at once, under "Recent" |
| type | narrows the rows (the combobox's own filtering) |
| ↑ ↓, ↩, or a click on a row | picks: `onWordsChange(words)` then `onWordsCommit(words)` once, the host's one undo step; the popover closes and focus returns to the words |
| Esc, a click outside | closes; nothing changes |

## API

```tsx
import { MarkPick, Avatar } from '@unlocalhosted/metalui';

Send <MarkPick kind="tag" options={usedTags} onWordsChange={setTag} onWordsCommit={pushUndo}>{tag}</MarkPick>
to <MarkPick kind="person" glyph={<Avatar name={who} size="small" label="" />}
  options={people.map((p) => ({ value: p.short, label: p.short, description: p.name, icon: <Avatar name={p.name} size="small" label="" /> }))}
  onWordsChange={setWho}>{who}</MarkPick>
```

| Prop | Notes |
|---|---|
| `children` | the words, a string |
| `options` | strings or `ComboboxItem`s (`value`, `label`, `description`, `icon`) |
| `onWordsChange(words)` | every pick |
| `onWordsCommit(words)` | once per pick |
| every `Mark` prop | `kind` (`tag`, `person`), `label`, `glyph`, `resolved` |

The host recomputes a person's `glyph` (their avatar) from the new words.

## Accessibility

- The words are a button (`aria-haspopup`, `aria-expanded` from the popover's trigger), named "Tag, #poster" / "Person, Sam" (`label` or the kind, then the words).
- The popover is a dialog named "Change tag" / "Change person"; the combobox is named by `label` or the kind.
- Keyboard does all the pointer does; the focus ring shows on keyboard focus.

## Rules

- The host owns the text: rewrite the words from `onWordsChange`, push one undo step from `onWordsCommit`.
- Nothing shows at rest that the Mark doesn't show; the cursor says pointer.

## Tokens

None of its own: the mark recipe for the look, the popover and combobox recipes for the plate. Swift: `MetalRecipes.mark`.
