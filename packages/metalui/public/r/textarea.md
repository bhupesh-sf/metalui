# Textarea

Several lines of text. React: `Textarea` from `@unlocalhosted/metalui` (a native textarea; Base UI has no textarea part). SwiftUI: `MetalTextarea` (work in progress). Its well is the `well` recipe's field look; the `textarea` recipe adds the rows, the counter and the motion.

## Use it for

- A note, a description, a comment, a message: anything that may run past one line.

## Don't use it for

- One line (use a field), a number (use a number field), code (use a code card).

## Anatomy

- Well: the field well, radius 14, padding 11 × 14; text in the content type role (15 / 20).
- Counter (with `maxLength`): below the well at the right, meta type, `used/limit`.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the field well, 3 rows (`minRows`) | – |
| focus | the flush green ring | – |
| grow / shrink | the well fits its text, between `minRows` and `maxRows` (8) | height on the settle spring, no overshoot; the text stays pinned to the top |
| full | at `maxRows` it stops growing and scrolls | – |
| near the limit | the counter shows at 80 % of `maxLength` | its row grows open on the settle spring as it fades in (the form error's motion) |
| at the limit | the counter turns red | – |
| refused | typing or pasting past the limit leaves the text alone | only the counter shakes on the refusal spring (reach: one nest, 6) |
| invalid | a red hairline ring | – |
| disabled | 40 % | – |
| ghost (`suggestion`) | while focused with the caret at the end, the words that would come next after the text in the placeholder's ink, wrapping as the text will; the well grows to hold them | – (they are there or not; nothing slides) |
| ghost taken (Tab) | the words become text | the well keeps its height |

Reduce Motion: the height snaps and nothing shakes; the counter still turns red.

## API

| React | SwiftUI |
|---|---|
| `value`, `defaultValue`, `onChange` | `text:` |
| `size`: `large` (default, the content role), `regular`, `compact` (the ui role, Field's inset) | `size:` |
| `countFrom`: the share of `maxLength` where the counter shows (0 always, default 0.8) | – |
| `minRows`, `maxRows` | `minRows:`, `maxRows:` |
| `maxLength` | `limit:` |
| `invalid` | `invalid:` |
| `suggestion`, `onSuggestionDismiss` | `suggestion:`, `onSuggestionDismiss:` |
| `disabled`, `readOnly`, `placeholder`, and every textarea attribute | `.disabled()` |

`className` goes on the well; `style` and the rest go on the textarea.

## Keyboard and accessibility

- A native textarea: every editing key works as the platform expects. Tab leaves it, except while a suggestion shows: then Tab takes it (inserted as typed, so ⌘Z takes it back) and Escape lets it go (`onSuggestionDismiss`). Typing the suggestion's next letters eats them; typing anything else hides it.
- A suggestion is said once through a polite status: "Suggestion: … Tab to accept."
- Give it a label: a visible `<label htmlFor>` or `aria-label`. The counter is linked by `aria-describedby`; reaching the limit is announced once ("Limit reached, N characters"), not on every keystroke.
- `invalid` sets `aria-invalid`; say what is wrong in text near it.

## Rules

- The well grows; the page never jumps. Growing is the settle spring, never a bounce.
- A refusal is local: only the counter moves, and the text is never trimmed or changed.
- Show the counter only when it helps (near the limit), or from the start (`countFrom={0}`) when the form states its limit.
- In a form of regular or compact Fields, give the textarea the same `size`.
- A suggestion is the host's: fetch it after a pause in typing, pass the words that would follow the text (not the whole text), and clear it when the text moves on. Only suggest at the end of the text.
