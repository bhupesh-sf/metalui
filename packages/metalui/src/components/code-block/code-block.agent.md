# Code block

Code to read and copy in the flow: a docs page, a README, an AI reply. React: `CodeBlock` (and `splitFences`, `splitHtmlLines`, `tintLine`) from `@unlocalhosted/metalui`. SwiftUI: `MetalCodeBlock`. A component: you copy it, pick its lines, take a fix. The code card is the canvas object (a fence placed on the canvas); it takes this block's tint and diff classes.

## Use it for

- Code in a page or a reply: `<CodeBlock code={src} lang="ts" label="poster.ts" />`.
- An AI reply while it streams: split the Markdown with `splitFences` and render each fence; a fence still `open` is `streaming`.
- Pointing at lines in a chat: `selectable` and `onReference`.
- A change (`lang="diff"`) and a problem (`diagnostics`).

## Don't use it for

- Inline code in a sentence (a `<code>` in the prose).
- Editing code. It shows code; an editor is its own thing.
- A fence placed on the canvas: that is the code card.

## Anatomy

- **framed** (default): a stage plate at the plate radius. A 40 head (the label in readout ink3, or `head`, a node such as tabs) over a hairline, the keys at its end. Then the lines, padded 14 / 16.
- **ghost**: no plate and no head; the lines on a faint sunk tint at radius 12. The keys float in the top corner on a stage pill, pinned over the scroll, shown while the pointer or focus is in the block (always on touch).
- **lines**: the code role (12 / 19 mono) on the colorway's syntax inks. `numbers` in syn-line, tabular, from `start`. `wrap` continues a long line under its own start; off, the body scrolls sideways. `maxLines` stops the body there and it scrolls inside itself.
- **highlight**: a quiet band and a 2 rail in ink3. **focus**: the other lines fall to .42 until the pointer or focus enters the block (settle spring).
- **picked** (`selectable`): the select tint (Table's quiet green).
- **diff**: added lines on a faint green band with a green `+`, removed on a faint red band with a red `−`; context plain. With hunks (`@@ -9,5 +9,4 @@`) and `numbers`, two gutters (old, new), each blank where its side has no line; the hunk header in ink3.
- **diagnostics**: a lamp column in the gutter (red `error`, amber steady `warning`, none for `note`) and a note row under the line: the word (Error, Warning, Note) in ink, the message in ink2 (meta type), an optional compact action.
- **streaming**: rows fade up a nest on the settle spring as they land; a caret blinks after the last character; the body follows the end unless you scrolled up.

## Behaviour

- **Copy** (ghost key): copies the code, or the picked lines only ("Copy lines 4–7"). The copy glyph turns to the check on the drum for `copy.hold` (1400 ms), then back; "Copied" is said once in a status. While `streaming` the key is disabled and named "Still writing".
- **Pick lines** (`selectable`, turns `numbers` on): the numbers are one roving tab stop. ↑ ↓ Home End move; Space or ↩ picks a line (again clears it); ⇧ with a move or a click extends from the first pick; Esc clears. Each number is a toggle (`aria-pressed`, "Line 4"). The head's label turns on the drum to `poster.ts · 4–7`. Controlled with `selection` / `onSelect`, or `defaultSelection`. A patch's two gutters are not selectable.
- **Reference** (`onReference`): while lines are picked, an `attach` key beside copy: "Reference lines 4–7".
- **Diagnostics' action**: a compact button; the host does the fix and drops the diagnostic.
- Copy text, `textContent` and the system selection hold only code: numbers, lamps and notes are `user-select: none` and the notes are `role="note"`.

## Highlighting

The host highlights; the package ships no highlighter. Pass `html`, the highlighted HTML of the whole code without its `<pre>` (Shiki's `codeToHtml` inner, twinkleplop, highlight.js): the block splits it into rows, closing spans that cross a newline and reopening them on the next line. Its classes are the host's to colour (the docs map twinkleplop's to the syntax inks); Shiki's inline colours work as they are. `html` is set as HTML: pass only what your highlighter produced. Without `html`, the built-in tint (strings, comments, keywords, types, numbers; the code card's) colours each line on its own, so a streaming line never re-tints the lines before it.

## Streaming

```tsx
{splitFences(markdown).map((part, i) => part.kind === 'code'
  ? <CodeBlock key={i} look="ghost" code={part.code} lang={part.lang} streaming={part.open} />
  : <Markdown key={i} text={part.text} />)}
```

`splitFences` reads ``` and ~~~ fences of any length ≥ 3 (a fence closes on the same character, at least as long); the info string's first word is `lang`. Rows are memoised by content: a new chunk renders only the rows that changed.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `code` | `code` | |
| `lang` | `lang:` | `diff` classes each line |
| `look` | `look:` | `framed` / `ghost` (`.framed`, `.ghost`) |
| `label` | `label:` | default the language, or "Code" |
| `head` | — | a node in the head instead of the label (tabs) |
| `html` | — | the host's highlighted HTML |
| `numbers`, `start` | `numbers:`, `start:` | |
| `wrap` | `wrap:` | |
| `maxLines` | `maxLines:` | |
| `highlight`, `focus` | `highlight:`, `focus:` | `[3, [5, 7]]` / `[3...3, 5...7]`, by shown number |
| `diff` | `diff:` | the host's class per line |
| `diagnostics` | `diagnostics:` | `{ line, severity, message, action? }` |
| `selectable`, `selection`, `onSelect`, `defaultSelection` | `selection:` (a binding turns picking on) | `{ start, end }` in shown numbers / `ClosedRange<Int>?` |
| `onReference` | `onReference:` | |
| `streaming` | `streaming:` | |

## Tokens

The code-block recipe (head, body, gutter, sign, ghost, mark, pick, focus dim, diff, note, copy hold, caret), the colorway's syntax inks, `material-stage`, the status LEDs and the settle spring.

## Reduce Motion

Rows land at once, the caret holds steady, the drum swaps without travel, focus dimming returns without a fade.
