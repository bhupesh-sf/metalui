# Prompt input

Where a message is written and sent. React: `PromptInput` from `@unlocalhosted/metalui`. SwiftUI: `MetalPromptInput`. A component: you operate it to send a message into a `Thread`, or to stop a reply. Every look is borrowed: the plate is the raised surface (raise-sm), the well is `Textarea`, Send is a primary `Button` whose glyph morphs send → stop (`MorphPair`) and whose word turns on the drum, attach is a ghost `IconButton` with a `Tooltip`, the offline lamp is the `Led`, and files over it light the drop zone's edge. The `prompt-input` recipe holds the gaps and the padding.

## Use it for

- The composer at the foot of a chat, an assistant panel, a comment box that sends.

## Don't use it for

- A form field that is submitted with others: use `Textarea` in a `FormField`.
- Search: use a field or `CommandPalette`.

## Anatomy

- A plate, padded 8, its parts 8 apart: the host's `attachments` (`Attachment`s, 6 apart), the well (a large `Textarea`, one row growing to `maxRows`, 6, then scrolling), the strip (6 apart).
- The strip: the attach key (with `onAttach`), the host's `tools` (a compact `Select` for the model), a gap, the hint ("⇧↩ new line", meta ink3, hidden under 28 rem) or, while disabled, the reason with the amber lamp, then Send.
- A hidden file input behind the attach key (`data-attach-input`), taking `accept`.

## States and motion

| State | Look | Motion |
|---|---|---|
| empty | Send disabled | – |
| writing | the well grows a row at a time to `maxRows`, then scrolls | the settle spring (the Textarea's) |
| `busy` | Send reads Stop; ↩ doesn't send; ⎋ in the well or Stop calls `onStop` and focus returns to the well | the glyph morphs send → stop, the word turns on the drum |
| files over it | the plate's edge lit green | the drop zone's edge, on the settle spring |
| `disabled` | the well, attach and Send dimmed and refusing; `disabledReason` with the amber lamp in the hint's place | – |

Reduce Motion: the well snaps to its height; the glyph and the word change in place.

## Rules

- Keep the text in the host (`value`, `onValueChange`) and clear it in `onSend`, or leave it uncontrolled and it clears itself.
- Hand over files and show them yourself: `onAttach(files)` → your list → `attachments={files.map((f) => <Attachment … onRemove />)}`. An attached file lets Send send an empty text.
- Pass `busy` while the reply writes and stop it in `onStop`; the person can keep writing the next message.
- Say why it's disabled (`disabledReason="You're offline"`); the lamp never says it alone.
- Focus the well after your own actions (removing a file) through the ref (it is the textarea).

## API

| React | SwiftUI |
|---|---|
| `PromptInput` `value`, `defaultValue`, `onValueChange`, `onSend(text)`, `busy`, `onStop`, `onAttach(files)`, `accept`, `attachments`, `tools`, `canSend`, `disabled`, `disabledReason`, `placeholder`, `label`, `hint`, `maxRows`, `maxLength`; ref: the textarea | `MetalPromptInput(_ label:, text:, busy:, canSend:, disabledReason:, hint:, maxRows:, onSend:, onStop:, onAttach:) { files } tools: { … }`; disable with `.disabled(_:)` |

## Keyboard and accessibility

- A `group` named by `label` ("Message"); the well is the textbox of that name.
- ↩ sends, ⇧↩ breaks the line, ↩ while an IME composes is the IME's; ⎋ stops a reply.
- Send's name is "Send" or "Stop"; it is disabled (not hidden) while there is nothing to send.
- Pasting files into the well attaches them when `onAttach` is set; text pastes as text.
