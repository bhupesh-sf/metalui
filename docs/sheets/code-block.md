# Code block: variation sheet

From `docs/BACKLOG.md`, "Components other libraries ship that we don't" § 3 ("Code block: `CodeCard` lives only in the docs; decide whether it ships in the package"), and the AI components that will need it (Streaming text and Markdown, Message actions, Tool call). Written in the format of the sheets under "Variation sheets: existing components".

Now, three things draw code, and none is the one a reader needs:

- **`CodeCard`** (the package, `blocks/code-card`, an Object): a fence placed on the canvas, a small dark glass card, at most 18 numbered and tinted lines under a `CODE · TS · 7 LINES` tag; a diff fence tints whole lines. It ships already (the backlog line is stale on that); what it lacks is everything a reader does: copy, scroll, select, wrap.
- **`Code`** (the docs only, `apps/docs/src/ui/doc.tsx`): the quiet code object every docs page uses for its sources and tokens: a stage plate, a file label, a copy button with the paste glyph and "Copied" on the drum, lines highlighted by twinkleplop, an optional head slot for tabs, a 440 max height with its own scroll.
- **`CodeScreen`** (the docs only): the dark glass usage snippet at the top of each page.

Read for jobs: shadcn and ReUI code blocks, AI Elements' Code Block and Artifact, prompt-kit's CodeBlock and Markdown, assistant-ui's code fences, Ant Design X, Shiki and its transformers (highlight, focus, diff notation, word highlight), Expressive Code (frames, text markers, line numbers from a start), GitHub's line links and unified diffs, VS Code's inline diagnostics and Error Lens, Xcode's issue annotations, Apple's HIG on text selection.

**Layer: Component.** You operate it (copy it, pick its lines, take a fix), it is the same in any app, and it stands for no one's thing on a canvas. The code card stays the **Object**: a fence a person placed, with a body and a tag. Objects may use components, so the card now takes the block's line tinting and diff classes instead of keeping its own (one source per fact).

## Jobs

| Job | Where | Our form | Tier |
|---|---|---|---|
| Read code in the flow | every docs page, a README, an AI reply | `CodeBlock`: a stage plate (`material-stage`, radius plate) with a head (the label, `api.ts` or the language, in readout ink3) over a hairline, then the lines in `type-doc-code` on the syntax inks of the colorway | Must |
| The same, without a frame | a reply bubble already on a plate, a tool call's result, a table cell's detail | `look="ghost"`: no plate, no head; the lines sit on a faint sunk tint (the well's top ink at low strength) and the copy key floats in the top corner, pinned over the scroll | Must |
| Copy it | every block | a ghost `IconButton` in the head: `copy` turns to `check` on the drum (`SwapIcon`, as Field.Copy) for the recipe's hold, "Copied" said once in a status. *ours*: with lines picked it copies only those, and its name says so ("Copy lines 4–7") | Must |
| Know where you are | long files, references in chat | `numbers` on a gutter in `syn-line` ink, tabular; `start` numbers from any line (`start={120}` for an excerpt) | Must |
| Long lines | narrow columns, phones, a chat bubble | `wrap`: a long line continues under the start of its text column; the gutter number stays on the first row. Off: the body scrolls sideways | Must |
| Long files | a 400-line source | `maxLines` (default none): the body stops at that many lines and scrolls inside itself; the head and the copy key stay put | Must |
| Point at lines | "see lines 3–5" in docs, a review | `highlight={[3, [5, 7]]}`: a quiet band in the row hover's ink with a 2 rail at the gutter edge in ink3 (never green: green says live or opened) | Must |
| Say what matters | a tutorial step, a long excerpt | `focus={[[4, 6]]}`: the other lines fall back to the recipe's dim opacity. *ours*: hovering or focusing the block brings them back on the settle spring, so focus never hides code from someone who wants it | Must |
| Reference lines in a chat | "ask about lines 4–7", attach code to a prompt | `selectable`: the gutter numbers become one roving tab stop (↑ ↓ move, Space or ↩ picks, ⇧ extends, Esc clears); click a number, ⇧-click to extend. Picked lines take the selected tint. `onSelect({ start, end })`. *ours*: the head's label turns on the drum to `api.ts · 4–7`, so the reference you'll send is visible before you send it | Must |
| Send the reference | the composer's "add to chat" | `onReference(range)`: a ghost key with the `attach` glyph appears beside copy while lines are picked ("Reference lines 4–7") | Should |
| See a change | a diff fence in a reply, a commit, a proposed edit | `lang="diff"` (or `diff` classes per line from the host): added lines a faint green band with a green `+`, removed a faint red band with a red `−`; the same classes and inks as the code card | Must |
| See a patch | a unified diff with hunks | *ours*: when a diff has `@@ -a,b +c,d @@` headers and `numbers` is on, two gutters (old, new), each blank where its side has no line; the hunk header is an engraved ink3 row | Should |
| See a problem | a type error in a snippet, a lint finding in a tool call | `diagnostics={[{ line, severity, message, action }]}`: a lamp column opens in the gutter beside the numbers (red for `error`, amber steady for `warning`, none for `note`), and under the line a note row says the word ("Error"), the message in ink2 and an optional compact action ("Fix with AI"). Colour never alone: the word goes with it | Must |
| Code still arriving | an AI reply streaming | `streaming`: rows are appended, never re-rendered; each new row fades up a nest on the settle spring; a caret blinks after the last character only while streaming; the body follows the end unless you scrolled up; copy waits (disabled, "Still writing") so a half snippet never reaches a terminal | Must |
| Fences inside a reply | Markdown arriving as text | `splitFences(markdown)` → text and code parts, `open: true` for a fence not closed yet (the host renders it `streaming`); tildes and backticks, any fence length, an info string's first word as the language | Must |
| Highlighting from the host | Shiki on the server, twinkleplop in the docs | `html`: the host's highlighted HTML for the whole code (no `<pre>`); the block splits it into rows itself, closing and reopening spans that cross a line. No highlighter ships in the package | Must |
| A light tint with no host | a quick snippet, streaming | the built-in tint (the code card's: strings, comments, keywords, types, numbers) on the syntax inks; one pass per line, so a streaming line never re-tints the lines before it | Must (covered) |
| The canvas fence | a code fence placed on the canvas | `CodeCard`, unchanged in look, now tinted by the block's tinting | covered |
| The page's usage snippet | the top of each docs page | `CodeScreen` stays the docs' (one per page, the dark glass) | covered |
| Fold by indent | long files | Later: a fold key in the gutter is a second control in a gutter that already picks lines; a real need comes with the artifact panel | Later |
| Words, not lines | "this call" inside a line | Later: `marks` (ranges in a line) need column offsets through host HTML; lines cover the reading job now | Later |
| Tabs of files | React / CSS / SwiftUI | covered: `head` takes any node; the docs pass a `TabList` (SourceTabs) | covered |

Not doing: a language badge in a corner over the code (the head says it, the ghost says nothing; the copy key is the only thing over the code); a "show more" fade that expands a block (that's `maxLines` and the scroll: one way to see long code); line numbers you can't select away (they are `user-select: none` and never copied); an editable block (an editor is its own thing; ↩ in the canvas edits the fence raw, the card's rule); theming a highlighter (the syntax inks are the colorway's; a host that brings Shiki brings its classes or its theme).

## Decide

- **Does it ship?** **Yes, as a Component, `CodeBlock`.** The AI parts (streaming Markdown, tool calls, message actions) need one block that copies, scrolls, picks lines and streams; the docs already prove the shape on every page. The docs' `Code` now renders `CodeBlock` (the docs keep their twinkleplop highlighting and pass `html`).
- **And the code card?** **Kept, as the Object**, and it shares the block's tinting and diff classes (it imports them; `tintCode` and `diffClasses` stay exported from the package). They don't merge: the card is a thing on the canvas with a body, a tag and an 18-line cap; the block is a reader in the flow with copy, scroll and selection. Rendering the card's screen *with* the block is Later, when the card needs to scroll or pick lines.
- **A highlighter in the package?** **No.** The host passes `html` (Shiki on the server, twinkleplop in the docs); the built-in tint covers streaming and quick snippets. Strong reason needed to add a dependency; none found.
- **ScrollArea or native scroll?** **Native.** ScrollArea draws only a vertical bar and code needs both directions; `maxLines` sets the max height and the body scrolls itself.
- **Selection: gutter keys or a listbox?** **Gutter keys, one roving tab stop.** The code stays text for readers and the system's own selection still works across it; a listbox would turn every line into an option.
- **Copy while streaming?** **No.** It waits until the block is done; the copy key says why.
- **Info diagnostics' lamp?** **None**, as Alert's `note`: no LED colour means "info", and an off lamp would read as "something is off". The word "Note" says it.

## Must
- [x] React `CodeBlock`: framed and ghost; head (label or a node); copy on the drum; `numbers` and `start`; `wrap`; `maxLines`.
- [x] `highlight` and `focus` (with the hover reveal).
- [x] `selectable` with keyboard and pointer, `selection` / `onSelect`, the label on the drum, copy of the picked lines.
- [x] Diff classes (shared with the code card), `diagnostics` with an action.
- [x] `streaming` (rows land, caret, follow the end, copy waits) and `splitFences`.
- [x] `html` from the host, split into rows.
- [x] SwiftUI `MetalCodeBlock`: framed and ghost, copy, numbers and start, wrap, max lines, highlight and focus, selectable lines, diff, diagnostics, streaming caret.
- [x] Recipe `code-block`, agent guide, meta.json, the page with its DialKit panel, the e2e slice; the docs' `Code` on the block; the code card on the shared tint.

## Should
- [x] `onReference` key.
- [x] Two gutters for a unified patch.

## Later
- [ ] Fold by indent.
- [ ] Marks inside a line.
- [ ] The code card's screen rendered by the block (scroll and selection on the canvas).
- [ ] `CodeScreen` (the docs' usage snippet) as a `look="screen"`.

- Done (2026-10-06): Must and Should. `CodeBlock` (React) and `MetalCodeBlock` (SwiftUI) on the `code-block` recipe; `splitFences`, `splitHtmlLines` and `tintLine` exported; the code card takes the block's tint and diff classes (its look unchanged). The docs' `Code` renders the block (twinkleplop `html`), so every source, usage and token snippet on the site is the shipped component; a page's Markdown copy leaves out a block's gutter, keys and notes. A `CodeBlock` import is 17.8 KB gzip. Decided while building: a patch's two gutters are not keys (two numberings, one pick); a closing fence half arrived ("``") is held back while streaming; a hunk header is engraved, never tinted. Left: the docs' source and install tabs lost their `TabPanel` (the tabs sit in the block's head, so the code isn't tied to them by `aria-controls`); SwiftUI picks lines by click and ⇧-click only (no arrow keys) and its ghost keys show on hover; the Later items above.
