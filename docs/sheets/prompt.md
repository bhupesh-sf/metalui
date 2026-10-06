### Markdown, Prompt input and Message actions

From "AI components" § 1, "Lift the AI composer block's parts into components": **Streaming text and Markdown** (AI Elements Response, prompt-kit Markdown and ResponseStream, ChatKit's text widget, shadcn's Marker), **Prompt input** (AI Elements PromptInput, prompt-kit PromptInput, assistant-ui Composer, Ant Design X Sender, CopilotKit's input) and **Message actions** (AI Elements Actions, prompt-kit Message actions and FeedbackBar, assistant-ui ActionBar, Ant Design X Actions).

Now: the AI composer block (`apps/docs/src/blocks/ai-composer`) does all three inside itself, on top of `Thread` and `Message`: a reply's words arrive at the model's pace with a green caret (a phrase at a time and no caret under Reduce Motion), as plain text; the composer is a raised plate holding the attached files, a `Textarea` that grows from one line to six, and a strip (attach, the model `Select`, "⇧↩ new line", Send that morphs to Stop on the drum); Copy (paste → check, "Copied" for 1.6 s) and Retry sit in the reply's footer. Neighbours that must not be duplicated:

- **`CodeBlock`** already streams a fence (rows fade up, a caret, copy waits) and `splitFences` already cuts a reply at its fences. Markdown hands every fence to it.
- **`Message`** already says a reply's state (lamp and word); Markdown doesn't say it again.
- **`Textarea`** already grows on the settle spring between rows; **`Button` `state`** and **`MorphPair`** already turn Send into Stop; **`Attachment`** is a file, **`DropZone`** the place that receives files.
- **`IconButton`** is a glyph key; **`Tooltip`** names it; **`SwapIcon`** turns copy into check.

**Place (docs/COMPOSITION.md).**

- **Markdown is a Component.** It is how an answer's text is set: you read it, follow its links and copy its code. It hands fences to `CodeBlock` (a component), so it cannot be a part; it isn't a thing of the person's (the `Message` is), and it isn't drawn only while you act. Its sibling is `CodeBlock`.
- **Prompt input is a Component.** You operate it to change something else: it sends a message into the thread, or stops a reply. Its files are the host's `Attachment`s in a slot (an object can't live inside a component's code); dropping or pasting files onto it hands them to the host. Its siblings are `Textarea` and `CommandPalette`'s well.
- **Message actions is a Component.** A row of keys that act on a message (copy it, write it again, edit it, judge it). It sits in `Message`'s footer slot, so the message (the object) holds it, never the reverse. Its siblings are `ButtonGroup` and `ToolStrip`.

**Semantics.** Markdown renders real elements (`h2`–`h4`, `p`, `ul`/`ol`, `table`, `blockquote`, `a`, `code`), never HTML from the source; it is `aria-busy` while it streams. The writing state is `Message`'s header word, which becomes a `role="status"` (the article's body, not the whole article, is busy, so the word is heard while the answer is held until it settles). Prompt input is a `group` named by its label; the well is a textbox; Send is a button whose name turns to Stop. Message actions is a `toolbar` of `IconButton`s, each named, with a `Tooltip`; the thumbs are toggle buttons (`aria-pressed`).

**Jobs: Markdown (streaming text)**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Read an answer set as text | every reply | `Markdown`: paragraphs in the content type, headings (`#`–`###` as `h2`–`h4` in the title and heading roles), lists (bullets and numbers, nested by indent), bold, italic, inline code on a faint sunk tint, links (http, https, mailto and relative only), a rule, a quote on a 2 rail | Must |
| Code in an answer | a fix, a snippet | every fence goes to `CodeBlock` (framed, the fence's language as its label); a fence still open is `streaming` | Must |
| Tables | a comparison | GFM pipe tables: a hairline under the head, aligned columns (`:--`, `:-:`, `--:`), scrolls sideways when wide | Must |
| Words arriving at a pace | network chunks arrive in bursts | `pace` (words a second): what has arrived is revealed word by word at that pace, catching up; nothing runs once caught up. When `streaming` ends whatever arrived shows at once | Must |
| A caret while writing | streaming | a green pill after the last word (the block's caret), only while `streaming` and not inside an open fence (CodeBlock draws its own) | Must |
| A writing state said | a screen reader | `Message`'s header word is a `role="status"`; Markdown is `aria-busy` while it streams | Must |
| Half-arrived marks don't flash | `**bol` mid-stream | while streaming, an unclosed `**`, `*` or `` ` `` in the last block is closed for the render, so it reads bold at once instead of showing stars | Should |
| Reduce Motion | | a phrase (10 words) at a time, no caret | Must |
| Out of width | a sidebar | tables and code scroll inside themselves; long words break | Should |
| Raw HTML, math, Mermaid (V, S) | | Later: no raw HTML ever (safety); math and diagrams want their own entries | Later |
| Images in an answer | | Later: wants a figure part with its loading state | Later |
| Footnotes and citations | | its own entry ("Sources and inline citations") | Later |

**Jobs: Prompt input**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Write a message that grows with its text | every chat | `PromptInput`: a raised plate (raise-sm, the card radius) holding a `Textarea` (large, one row to six, then it scrolls) | Must |
| Send with ↩, break with ⇧↩ | every chat | ↩ sends (not while composing with an IME); ⇧↩ is a new line; "⇧↩ new line" said in meta ink3 beside Send, hidden under 28 rem | Must |
| Stop a reply while it writes | a long answer | `busy`: Send becomes Stop (cap primary, the send glyph morphs to stop through `MorphPair`, the word turns on the drum), pressing it or ⎋ in the well calls `onStop`; the well stays writable | Must |
| Can't send nothing | empty well | Send is disabled while the text is blank and no files are attached (`canSend` for the host's own rule) | Must |
| Attach files | a brief, an image | `onAttach`: an attach `IconButton` (attach glyph, "Attach files" tooltip) opens the file picker; the host shows them as `Attachment`s in the `attachments` slot above the well | Must |
| Drop or paste files on it | dragging from the desktop | with `onAttach`, files dropped on the plate or pasted into the well are handed over; while files are dragged over it the plate's edge lights green (the drop zone's edge: `drop-zone-edge`) | Should |
| A model selector (V) | choosing a model | the `tools` slot: the host's `Select` (compact) sits in the strip after attach | Must |
| Offline or not allowed | no network | `disabled`: the well, attach and Send dim and refuse; `disabledReason` ("You're offline") is said in the strip in place of the hint, with the amber lamp | Must |
| Focus after an action | Stop, removing a file | the host calls `focus()` on the forwarded ref (the textarea) | Must |
| A big drop target for many files | an upload step | covered: the host places a `DropZone` | covered |
| Dictation (A) | speaking | Later: needs the platform's speech API and its own listening state | Later |
| Slash commands, mentions | power users | Later: an `Autocomplete` over the well | Later |
| Character limit | | covered: `Textarea` `maxLength` (passed through) | covered |

**Jobs: Message actions**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Copy a message | every reply, the person's turn | `copy` (the text): the copy glyph turns to the check on the drum and the name to "Copied" for the recipe's hold, then back; the clipboard write is ours | Must |
| Write it again | the last reply | `onRetry`: the retry glyph; `retryDisabled` while another reply writes | Must |
| Edit what I said | the person's last turn | `onEdit`: the pen glyph; the host turns the turn into a `Textarea` (or the composer) | Must |
| Say it was good or bad | every reply | `feedback` (`'up' | 'down' | null`) and `onFeedback`: two toggle keys, the thumb and the thumb turned over (`MorphPair` `turn`), latched (pressed) on the chosen one; pressing it again clears | Must |
| Say why (P's feedback bar) | a bad reply | `reasons`: after Bad is chosen (a good reply needs no why), a row of compact `Button`s with the reasons fades in under the keys (settle); one press sends `onFeedback(value, reason)` and the row says "Thanks" on the drum, then leaves | Should |
| Shown only once a reply settles | streaming | covered: `Message` fades its footer in when it appears; the host passes the actions once the reply is done | covered |
| On hover only (V, A `autohide`) | dense threads | Should: `reveal="hover"` keeps the row invisible until the pointer or focus is in the message (opacity on the settle spring); never under touch | Should |
| Export as Markdown (A) | | Later: a host action in a `Menu` behind "More" | Later |
| Read aloud, share | | Later: host keys, passed as children after ours | Later |

Not doing: a typing indicator inside the input (the reply's lamp says it), a send-on-⌘↩ option (one keymap everywhere), thumbs with counts.

**Decide**

- **One Markdown component or two (stream and Markdown)?** One. Pacing is a prop of how text is shown; a separate `ResponseStream` would be a second way to put words on the page. The pacing reveals what arrived; it never invents a delay once streaming ends.
- **Who parses?** We do, in a few hundred lines with no dependency (a block pass, then inline marks), because a Markdown library would cost more than the rest of the chat and would bring raw HTML with it. What it doesn't know it shows as text.
- **Where is "writing" said?** In `Message`'s header word, made a `role="status"`. Saying it in Markdown too would say it twice; aria-busy moves from the article to its body so the status isn't held.
- **Prompt input holds files how?** In a slot: the host's `Attachment`s (an object can't be imported by a component, and the host owns the list). The input hands files over (`onAttach`); it never keeps them.
- **DropZone inside the composer?** No: a tray in the composer takes room for a moment that is rare. The plate itself takes a drop and borrows the drop zone's edge light, so it looks the same as a drop zone being armed. A host that wants a tray places a `DropZone`.
- **Thumbs down is the thumb turned over**, one glyph (`thumb`) turned 180 by `MorphPair` (and `rotationEffect` in SwiftUI), so up and down are one key's two faces.
- **Reasons are keys, not a text field.** A field opens a form inside a thread; most people pick a word. "Other" hands the host the moment to ask more.

**Must**
- [x] React: `Markdown` (`children`, `streaming`, `pace`), `PromptInput` (`value`, `onValueChange`, `onSend`, `busy`, `onStop`, `onAttach`, `attachments`, `tools`, `disabled`, `disabledReason`, `placeholder`, `label`, `maxRows`), `MessageActions` (`copy`, `onRetry`, `retryDisabled`, `onEdit`, `feedback`, `onFeedback`, `reasons`).
- [x] SwiftUI `MetalMarkdown`, `MetalPromptInput`, `MetalMessageActions` with the same states.
- [x] Recipes `markdown`, `prompt-input`, `message-actions`; agent guides, meta.json, pages with DialKit panels, e2e slices.
- [x] `Message`'s word as `role="status"`, aria-busy on its body.
- [x] The AI composer block rebuilt from them.

**Should**
- [x] Half-arrived marks closed while streaming.
- [x] Drop and paste files on the composer.
- [x] Reasons after Bad.
- [ ] `reveal="hover"`.

**Later**
- [ ] Raw HTML, math, diagrams, images in Markdown.
- [ ] Dictation; slash commands and mentions.
- [ ] Export as Markdown, read aloud.
