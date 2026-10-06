# Markdown

An answer's text, set as it arrives. React: `Markdown` from `@unlocalhosted/metalui`. SwiftUI: `MetalMarkdown`. A component: you read it, follow its links and copy its code; it hands every fence to `CodeBlock`. It renders real elements and never sets the source as HTML. The `markdown` recipe holds the gaps, the list indent, the quote rail, the inline code's padding, the table's cells, the caret and the phrase time under Reduce Motion.

## Use it for

- The body of an assistant's `Message`, while it streams and after.
- Any Markdown from a model or a person: release notes, a README in a panel.

## Don't use it for

- Code alone: use `CodeBlock`.
- Rich text someone edits: that is an editor.
- Words that change in place (a count, a state): use `SwapText`.

## Anatomy

- Blocks, 12 apart: paragraphs (content type, ink); `#` and `##` as `h2`/`h3` in the display role, `###` and `####` as `h4`/`h5` in the doc subheading role (`####` in ink2), 8 more room above each heading.
- Lists: bullets (`-`, `*`, `+`) and numbers (`1.`, `1)`, from their start), indented 22, 4 apart, nested by indent; markers in ink3.
- A quote: a 2 rail in the rule ink, 12 from its words in ink2. A rule: the engraved rule.
- Tables (GFM pipes): body type with tabular figures; the head in ui type, ink2, over a hairline; cells padded 12 × 6; `:--`, `:-:`, `--:` align columns; a wide table scrolls sideways inside itself.
- Inline: **bold**, *italic*, ~~struck~~, `code` (the code block's type on its ghost tint, padded 4, radius 4), links (ink, an ink3 underline that darkens on hover; http and https open in a new tab). Only http, https, mailto, `#` and relative links become links; anything else stays text.
- Fences: a framed `CodeBlock`, the fence's language as its label.

## States and motion

| State | Look | Motion |
|---|---|---|
| `streaming` | a green 2 × 16 pill after the last word; an open fence's `CodeBlock` streams (its rows land, its own caret); a half-arrived `**`, `*` or `` ` `` in the last paragraph is closed for the render | – |
| `pace` while streaming | what has arrived shows a word at a time, `pace` words a second, until it has caught up | a timer only while behind; nothing runs once caught up |
| streaming ends | everything that arrived shows at once; the caret goes | – |

Reduce Motion: a phrase (10 words) every `stream.phrase-every` (450 ms), and no caret.

## Rules

- Pass what has arrived so far as `children`; keep `streaming` true until the reply is done or stopped.
- Use `pace` when chunks arrive in bursts (a network stream); leave it out when the host already paces the words.
- Put it in `Message` as the body; `Message` says the state ("Writing") with its status word, so Markdown doesn't say it again.
- Highlighting is `CodeBlock`'s (its tint, or a host's `html` when you render fences yourself).

## API

| React | SwiftUI |
|---|---|
| `Markdown` `children` (the Markdown), `streaming`, `pace` | `MetalMarkdown(_ source:, streaming:, pace:)` |

## Keyboard and accessibility

- Headings are real headings (`h2`–`h5`), lists real lists, tables real tables with a header row.
- `aria-busy` while streaming, so a reader isn't read each word; the caret is hidden.
- Links and each code block's copy key are the only stops.
